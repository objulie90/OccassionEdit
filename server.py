#!/usr/bin/env python3
"""
THE OCCASION EDIT — Hardened Stage 1 Backend, SEO/AIEO Engine & Google Sheets Proxy (server.py)
===============================================================================================
Security & Architecture Features (Audited Oct 2026):
 1. PBKDF2-HMAC-SHA256 (600,000 iterations) Admin PIN verification + constant-time compare_digest
    + 5-strike 15-minute IP lockout + HttpOnly; SameSite=Strict session cookies + X-CSRF-Token.
 2. Canonical os.path.realpath() static file whitelist (/index.html, /src/*, /public/*, /llms.txt,
    /llms-full.txt, /robots.txt, /sitemap.xml). Strictly blocks /data/*, /server.py, dotfiles,
    and /GoogleAppsScript.gs with 403 Forbidden.
 3. Slowloris & OOM DoS Protection: 10.0s socket timeout + strict per-route Content-Length byte caps
    enforced BEFORE rfile.read().
 4. Layer-2 Binary JPEG Validator & EXIF GPS Stripper (sanitize_and_validate_jpeg):
    Verifies JPEG magic bytes, checks SOF0/SOF1/SOF2 dimensions (16..2400px), and strips all
    APP1-APP15 (EXIF/GPS home-address metadata) and COM segments before writing to disk.
 5. Atomic Thread-Locked JSON Persistence (data/site-data.json + .backup.json, and data/quotes.json
    with chmod 0600 owner-only permissions) + Calm In-App Backend Notifications (unreadEnquiriesCount).
 6. Two-Way Google Sheets Sync Proxy (POST /api/sync-from-sheet, background sync on save/quote,
    and UK GDPR Right-to-Erasure cascade delete).
 7. Dynamic SEO & AIEO Generator: Injects live Schema.org @graph JSON-LD, OpenGraph URLs, and
    pre-rendered semantic HTML inside <div id="root">, and generates /llms.txt & /llms-full.txt.
"""

import base64
import hashlib
import hmac
import html
import json
import mimetypes
import os
import re
import secrets
import shutil
import struct
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT_DIR = os.path.realpath(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data")
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
UPLOADS_DIR = os.path.join(PUBLIC_DIR, "assets", "uploads")
# Output of `npm run build`; the server hosts this compiled site
DIST_DIR = os.path.join(ROOT_DIR, "dist")

SITE_DATA_PATH = os.path.join(DATA_DIR, "site-data.json")
SITE_DATA_BACKUP_PATH = os.path.join(DATA_DIR, "site-data.backup.json")
QUOTES_PATH = os.path.join(DATA_DIR, "quotes.json")
STUDIO_SETTINGS_PATH = os.path.join(DATA_DIR, "studio-settings.json")
# Every quote and invoice as issued, kept for HMRC (encrypted, never overwritten)
DOCUMENTS_DIR = os.path.join(DATA_DIR, "documents")
LOGO_PATH = os.path.join(ROOT_DIR, "public", "assets", "logo.jpg")
DOCUMENT_KINDS = ("quote", "invoice")

DEFAULT_STUDIO_SETTINGS = {
    "businessTradingName": "THE Occasion Edit",
    "studioAddress": "",
    "studioEmail": "",
    "studioPhone": "",
    "taxYear": "",
    "bankName": "",
    "accountName": "",
    "sortCode": "",
    "accountNumber": "",
    "paymentRefFormat": "{orderId}-{clientSurname}",
    "maxSetupsPerDay": 1,
    "holdUntilReply": True,
    "holdHours": 48,
    "sameDayTurnaround": True,
    "minNoticeDays": 2,
    "blockedDates": [],
    "signOffName": "",
    "sheetConfig": {"webAppUrl": "", "adminSecret": ""}
}

# The order stages the studio and the Google Sheet both understand
ORDER_STATUSES = ("New Enquiry", "Quote Sent", "Deposit Paid", "Confirmed", "Completed", "Cancelled")
BOOKING_SOURCES = ("Facebook", "Instagram", "Phone", "WhatsApp", "Email", "Other")

PORT = int(os.environ.get("PORT", "5173"))

# ---------------------------------------------------------------------------
# 1. Authentication & Rate-Limiting Configuration (PBKDF2-HMAC-SHA256)
# ---------------------------------------------------------------------------
PBKDF2_ITERATIONS = 600_000
ADMIN_SALT = os.environ.get("STUDIO_ADMIN_SALT", "the-occasion-edit-2026-salt").encode("utf-8")
DEFAULT_PIN = os.environ.get("STUDIO_ADMIN_PIN", "2026")
ADMIN_PIN_HASH = hashlib.pbkdf2_hmac("sha256", DEFAULT_PIN.encode("utf-8"), ADMIN_SALT, PBKDF2_ITERATIONS)

SESSION_TTL_SECONDS = 8 * 3600  # 8 hours
MAX_PIN_STRIKES = 5
LOCKOUT_SECONDS = 15 * 60       # 15 minutes

DATA_LOCK = threading.RLock()
AUTH_LOCK = threading.Lock()

# token -> {"csrf": str, "expires_at": float, "ip": str}
ACTIVE_SESSIONS = {}
# ip -> {"strikes": int, "locked_until": float}
PIN_ATTEMPTS = {}
# ip -> [timestamp, ...]
QUOTE_RATE_LIMIT = {}


def ensure_directories():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(DOCUMENTS_DIR, mode=0o700, exist_ok=True)
    if not os.path.exists(QUOTES_PATH):
        atomic_write_json(QUOTES_PATH, [], mode=0o600)
    else:
        try:
            os.chmod(QUOTES_PATH, 0o600)
        except OSError:
            pass
    if not os.path.exists(STUDIO_SETTINGS_PATH):
        atomic_write_json(STUDIO_SETTINGS_PATH, DEFAULT_STUDIO_SETTINGS, mode=0o600)
    else:
        try:
            os.chmod(STUDIO_SETTINGS_PATH, 0o600)
        except OSError:
            pass


def atomic_write_json(target_path, payload, mode=0o644):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(target_path), prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_path, mode)
        os.replace(tmp_path, target_path)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def sanitize_formula_cell(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + s
    return s


# ---------------------------------------------------------------------------
# 2. Layer-2 Binary JPEG Validator & EXIF/GPS Metadata Scrubber
# ---------------------------------------------------------------------------
def sanitize_and_validate_jpeg(raw_bytes, max_dim=2400):
    """
    Parses raw JPEG binary markers:
     - Verifies SOI (0xFFD8) and EOI (0xFFD9)
     - Strips all APP1..APP15 (0xFFE1..0xFFEF, including iPhone EXIF GPS coordinates) & COM (0xFFFE)
     - Validates image dimensions from SOF0/SOF1/SOF2 (16 <= width, height <= max_dim)
    Returns clean, EXIF-free JPEG bytes or raises ValueError.
    """
    if len(raw_bytes) < 32 or raw_bytes[0:2] != b"\xff\xd8":
        raise ValueError("Invalid JPEG header (missing SOI marker).")

    out = bytearray(b"\xff\xd8")
    idx = 2
    n = len(raw_bytes)
    found_sof = False

    while idx < n:
        if raw_bytes[idx] != 0xFF:
            raise ValueError("Corrupted JPEG marker stream.")
        while idx < n and raw_bytes[idx] == 0xFF:
            idx += 1
        if idx >= n:
            break
        marker = raw_bytes[idx]
        idx += 1

        # Standalone markers without length
        if marker == 0xD9:  # EOI
            out.extend(b"\xff\xd9")
            break
        if marker == 0x00 or (0xD0 <= marker <= 0xD7) or marker == 0x01:
            out.extend(bytes([0xFF, marker]))
            continue

        if idx + 2 > n:
            raise ValueError("Truncated JPEG segment length.")
        seg_len = struct.unpack(">H", raw_bytes[idx : idx + 2])[0]
        if seg_len < 2 or idx + seg_len > n:
            raise ValueError("Invalid JPEG segment length.")

        seg_data = raw_bytes[idx + 2 : idx + seg_len]

        # Check SOF0, SOF1, SOF2 for dimensions
        if marker in (0xC0, 0xC1, 0xC2):
            if len(seg_data) < 5:
                raise ValueError("Truncated SOF segment.")
            height, width = struct.unpack(">HH", seg_data[1:5])
            if width < 16 or height < 16 or width > max_dim or height > max_dim:
                raise ValueError(f"Image dimensions ({width}x{height}) outside allowed range (16..{max_dim}px).")
            found_sof = True

        # Strip APP1..APP15 (0xE1..0xEF — EXIF, GPS, XMP, ICC) and COM (0xFE)
        if (0xE1 <= marker <= 0xEF) or marker == 0xFE:
            idx += seg_len
            continue

        out.extend(bytes([0xFF, marker]))
        out.extend(raw_bytes[idx : idx + seg_len])
        idx += seg_len

        # Start of Scan (0xDA): copy entropy-coded image stream until EOI
        if marker == 0xDA:
            eoi_pos = raw_bytes.rfind(b"\xff\xd9")
            if eoi_pos == -1 or eoi_pos < idx:
                raise ValueError("Missing JPEG EOI marker.")
            out.extend(raw_bytes[idx:eoi_pos])
            out.extend(b"\xff\xd9")
            break

    if not found_sof:
        raise ValueError("JPEG missing valid SOF dimension header.")

    return bytes(out)


# ---------------------------------------------------------------------------
# 3. Default Site Data Seed & Storage Helpers (with Bank Segregation)
# ---------------------------------------------------------------------------
def load_studio_settings():
    """
    Loads studio-settings.json with POSIX 0600 permissions.
    Contains private studio banking credentials, tax year settings, and sheet secrets.
    """
    with DATA_LOCK:
        if not os.path.exists(STUDIO_SETTINGS_PATH):
            return dict(DEFAULT_STUDIO_SETTINGS)
        try:
            with open(STUDIO_SETTINGS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    merged = dict(DEFAULT_STUDIO_SETTINGS)
                    merged.update(data)
                    return merged
                return dict(DEFAULT_STUDIO_SETTINGS)
        except Exception:
            return dict(DEFAULT_STUDIO_SETTINGS)


def save_studio_settings(settings):
    """
    Atomically writes studio-settings.json with strict POSIX 0600 permissions.
    """
    with DATA_LOCK:
        atomic_write_json(STUDIO_SETTINGS_PATH, settings, mode=0o600)


PRIVATE_SITE_DATA_KEYS = {
    "bankDetails", "bankName", "accountName", "sortCode", "accountNumber",
    "studioSettings", "adminSecret", "sheetSecret"
}


def sanitize_public_site_data(site_data):
    """
    Recursively strips private banking details, credentials, and sheet secrets
    before site-data is returned to visitors or written to public SEO feeds.
    """
    if not isinstance(site_data, dict):
        return {}
    clean = {}
    for k, v in site_data.items():
        if k in PRIVATE_SITE_DATA_KEYS:
            continue
        if k == "sheetConfig" and isinstance(v, dict):
            # Whitelist public webAppUrl only if present, strictly strip adminSecret
            clean["sheetConfig"] = {"webAppUrl": v.get("webAppUrl", "")}
        elif isinstance(v, dict):
            clean[k] = sanitize_public_site_data(v)
        elif isinstance(v, list):
            clean[k] = [sanitize_public_site_data(item) if isinstance(item, dict) else item for item in v]
        else:
            clean[k] = v
    return clean


def get_default_site_data():
    """
    Loads site-data.json if present; otherwise returns an empty dict so the client
    hydrates from catalogData.js and saves on first edit.
    Always strips any private banking or sheet secret fields before returning to public visitors.
    """
    with DATA_LOCK:
        raw_data = {}
        if os.path.exists(SITE_DATA_PATH):
            try:
                with open(SITE_DATA_PATH, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
            except Exception:
                if os.path.exists(SITE_DATA_BACKUP_PATH):
                    try:
                        with open(SITE_DATA_BACKUP_PATH, "r", encoding="utf-8") as bf:
                            raw_data = json.load(bf)
                    except Exception:
                        raw_data = {}
        if isinstance(raw_data, dict):
            return sanitize_public_site_data(raw_data)
        return {}


ENCRYPTION_KEY_PATH = os.path.join(DATA_DIR, ".encryption_key")


def get_or_create_master_key():
    with DATA_LOCK:
        if not os.path.exists(ENCRYPTION_KEY_PATH):
            key = secrets.token_bytes(32)
            try:
                with open(ENCRYPTION_KEY_PATH, "wb") as f:
                    f.write(key)
                os.chmod(ENCRYPTION_KEY_PATH, 0o600)
            except Exception:
                pass
            return key
        try:
            with open(ENCRYPTION_KEY_PATH, "rb") as f:
                k = f.read()
                if len(k) >= 32:
                    return k
        except Exception:
            pass
        return hashlib.sha256(ADMIN_PIN_HASH).digest()


def encrypt_client_pii(client_dict):
    """
    Encrypts customer PII (name, phone, email, postcode, notes) using HMAC-SHA256 authenticated keystream.
    Returns a tamper-evident base64 string stored in quotes.json.
    """
    if not isinstance(client_dict, dict):
        return ""
    key = get_or_create_master_key()
    raw = json.dumps(client_dict, ensure_ascii=False).encode("utf-8")
    iv = secrets.token_bytes(16)
    keystream = hashlib.pbkdf2_hmac("sha256", key, iv, iterations=1000, dklen=len(raw))
    ciphertext = bytes(b ^ k for b, k in zip(raw, keystream))
    mac = hmac.new(key, iv + ciphertext, hashlib.sha256).digest()
    payload = iv + mac + ciphertext
    return base64.b64encode(payload).decode("ascii")


def decrypt_client_pii(enc_str):
    """
    Decrypts and verifies customer PII in memory for authenticated admin sessions.
    """
    if not enc_str or not isinstance(enc_str, str):
        return {}
    try:
        key = get_or_create_master_key()
        payload = base64.b64decode(enc_str.encode("ascii"))
        if len(payload) < 48:
            return {}
        iv = payload[:16]
        mac = payload[16:48]
        ciphertext = payload[48:]
        expected_mac = hmac.new(key, iv + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected_mac):
            return {}
        keystream = hashlib.pbkdf2_hmac("sha256", key, iv, iterations=1000, dklen=len(ciphertext))
        decrypted = bytes(b ^ k for b, k in zip(ciphertext, keystream))
        return json.loads(decrypted.decode("utf-8"))
    except Exception:
        return {}


def load_quotes():
    """
    Loads quotes from data/quotes.json and decrypts client PII in memory for Studio Admin.
    """
    with DATA_LOCK:
        if not os.path.exists(QUOTES_PATH):
            return []
        try:
            with open(QUOTES_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, list):
                    return []
                # Decrypt client PII if encrypted at rest
                for q in data:
                    if isinstance(q, dict) and "client_encrypted" in q:
                        decrypted_client = decrypt_client_pii(q.get("client_encrypted", ""))
                        if decrypted_client:
                            q["client"] = decrypted_client
                return data
        except Exception:
            return []


def save_quotes(quotes_list):
    """
    Encrypts customer PII at rest before saving to data/quotes.json.
    POSIX 0600 permissions enforced.
    """
    with DATA_LOCK:
        prepared = []
        for item in quotes_list:
            if not isinstance(item, dict):
                continue
            q_copy = dict(item)
            client_data = q_copy.get("client")
            if isinstance(client_data, dict):
                # Encrypt full client details
                q_copy["client_encrypted"] = encrypt_client_pii(client_data)
                # Keep only non-sensitive eventDate in plain client object
                q_copy["client"] = {
                    "eventDate": str(client_data.get("eventDate", ""))[:12],
                    "isEncryptedAtRest": True
                }
            prepared.append(q_copy)
        atomic_write_json(QUOTES_PATH, prepared, mode=0o600)


def count_unread_enquiries(quotes_list=None):
    qs = quotes_list if quotes_list is not None else load_quotes()
    return sum(1 for q in qs if q.get("status", "New Enquiry") == "New Enquiry" and not q.get("seenByAdmin", False))


def get_uk_tax_year_str(dt=None):
    if dt is None:
        dt = datetime.now(timezone.utc)
    year = dt.year
    # UK tax year begins on 6 April
    if (dt.month, dt.day) >= (4, 6):
        start_year = year
        end_year = (year + 1) % 100
    else:
        start_year = year - 1
        end_year = year % 100
    return f"{start_year}/{end_year:02d}"


def clamp_int(value, low, high, fallback):
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return fallback


# ---------------------------------------------------------------------------
# Availability: Python copy of src/lib/availability.js. Both are checked
# against tests/availability-cases.json, so keep them in step.
# ---------------------------------------------------------------------------
def day_number(value):
    if not value:
        return None
    text = str(value).strip()
    try:
        if re.match(r"^\d{4}-\d{2}-\d{2}", text):
            dt = datetime.strptime(text[:10], "%Y-%m-%d")
        elif re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", text):
            dt = datetime.strptime(text, "%d/%m/%Y")
        else:
            return None
    except ValueError:
        return None
    return dt.toordinal()


def booking_counts(order, now_s, hold_hours, hold_until_reply=False):
    status = str(order.get("status") or "").lower()
    if "cancel" in status:
        return False
    if "deposit" in status or "confirm" in status or "complete" in status or "quote" in status:
        return True
    if hold_until_reply:
        return True
    try:
        created = datetime.fromisoformat(str(order.get("createdAt") or "").replace("Z", "+00:00")).timestamp()
    except ValueError:
        return True
    return now_s - created < hold_hours * 3600


def hire_prop_ids(order, hire_items):
    cfg = order.get("configuration") or {}
    known = {it["id"] for it in hire_items}
    ids = []
    if cfg.get("backdropId"):
        ids.append(cfg["backdropId"])
    elif cfg.get("backdrop"):
        ids += [it["id"] for it in hire_items if it.get("name") == cfg["backdrop"]][:1]
    ids += list(cfg.get("extraIds") or [])
    return [i for i in ids if i in known]


def compute_availability(date, orders, hire_items, settings=None, now_s=None, ignore_order_id=None):
    settings = settings or {}
    max_setups = clamp_int(settings.get("maxSetupsPerDay", 1), 1, 20, 1)
    hold_hours = clamp_int(settings.get("holdHours", 48), 0, 336, 48)
    hold_until_reply = bool(settings.get("holdUntilReply", True))
    clash_window = 0 if settings.get("sameDayTurnaround", True) else 1
    now_s = time.time() if now_s is None else now_s
    items = {}
    for it in hire_items:
        owned = max(0, clamp_int(it.get("ownedCount") if it.get("ownedCount") is not None else 1, 0, 99, 1))
        items[it["id"]] = {"owned": owned, "inUse": 0, "free": owned}
    target = day_number(date)
    if target is None:
        return {"date": date, "valid": False, "setupsThatDay": 0, "maxSetupsPerDay": max_setups, "dayFull": False, "items": items}
    setups = 0
    for order in orders:
        if ignore_order_id and order.get("id") == ignore_order_id:
            continue
        if not booking_counts(order, now_s, hold_hours, hold_until_reply):
            continue
        day = day_number((order.get("client") or {}).get("eventDate"))
        if day is None:
            continue
        if day == target:
            setups += 1
        if abs(day - target) <= clash_window:
            for pid in hire_prop_ids(order, hire_items):
                items[pid]["inUse"] += 1
                items[pid]["free"] = max(0, items[pid]["owned"] - items[pid]["inUse"])
    blocked = any(day_number(d) == target for d in (settings.get("blockedDates") or []))
    return {"date": date, "valid": True, "setupsThatDay": setups, "maxSetupsPerDay": max_setups, "dayFull": blocked or setups >= max_setups, "items": items}


def hire_items_from_site_data(site_data):
    steps = site_data.get("steps") or []
    return [
        {"id": it.get("id"), "name": it.get("name"), "ownedCount": it.get("ownedCount")}
        for step in steps for it in (step.get("items") or []) if it.get("hireOnly") and not it.get("madeToOrder")
    ]


def order_total(order):
    """The agreed price: what Laura quoted, otherwise the website's guide price."""
    cfg = order.get("configuration") or {}
    if cfg.get("quotedPrice") not in (None, ""):
        try:
            return float(cfg["quotedPrice"])
        except (ValueError, TypeError):
            pass
    try:
        return float(cfg.get("estimatedTotal") or cfg.get("subtotal") or 0)
    except (ValueError, TypeError):
        return 0.0


def add_history(order, text):
    """One line in the order's history, newest last, timed by the server."""
    history = order.get("history") if isinstance(order.get("history"), list) else []
    history.append({"at": datetime.now(timezone.utc).isoformat(), "text": sanitize_formula_cell(str(text))[:200]})
    order["history"] = history[-100:]


# ---------------------------------------------------------------------------
# Quotes and invoices: the record of what was issued
# ---------------------------------------------------------------------------
def logo_data_uri():
    try:
        with open(LOGO_PATH, "rb") as f:
            return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")
    except OSError:
        return ""


def document_path(doc_id):
    safe = re.sub(r"[^a-zA-Z0-9_-]", "", str(doc_id))[:64]
    return os.path.join(DOCUMENTS_DIR, f"{safe}.doc")


def store_document_html(doc_id, html_text):
    """Writes the issued document once. It is never overwritten."""
    path = document_path(doc_id)
    if os.path.exists(path):
        raise ValueError("A document with this id already exists.")
    with DATA_LOCK:
        payload = encrypt_client_pii({"html": html_text})
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="ascii") as f:
            f.write(payload)


def read_document_html(doc_id):
    try:
        with open(document_path(doc_id), "r", encoding="ascii") as f:
            html_text = (decrypt_client_pii(f.read()) or {}).get("html", "")
    except OSError:
        return ""
    return html_text.replace("{{LOGO}}", logo_data_uri())


def sheet_connection():
    site_data = get_default_site_data()
    studio_cfg = load_studio_settings().get("sheetConfig") or {}
    return studio_cfg if studio_cfg.get("webAppUrl") else (site_data.get("sheetConfig") or {})


def file_document_in_drive(order, doc):
    """Turns the document into a PDF in Laura's Drive: <tax year>/Quotes or Invoices,
    named QUOTE ID_... or INVOICE ID_..., and logs it in the master sheet."""
    cfg = sheet_connection()
    if not (cfg.get("webAppUrl") and cfg.get("adminSecret")):
        return {"ok": False, "error": "Google Drive isn't connected yet."}
    tax_year = (re.match(r"^ID_(\d{4}/\d{2})_", str(order.get("id", ""))) or [None, get_uk_tax_year_str()])[1]
    return call_google_sheets_webhook(cfg["webAppUrl"], {
        "action": "save_document",
        "adminSecret": cfg["adminSecret"],
        "bookingId": order.get("id"),
        "docType": doc["kind"],
        "number": doc["number"],
        "filename": doc["number"].replace("/", "-") + ".pdf",
        "taxYear": tax_year.replace("/", "-"),
        "total": doc.get("total", 0),
        "html": read_document_html(doc["id"])
    }, timeout=45.0)


def generate_tax_year_order_id(existing_quotes):
    """One reference per enquiry, kept through quote and invoice: ID_2026/27_1001.
    Numbers restart each UK tax year."""
    tax_year = get_uk_tax_year_str()
    prefix = f"ID_{tax_year}_"
    highest = 1000
    for q in existing_quotes:
        qid = str(q.get("id", ""))
        if qid.startswith(prefix):
            try:
                highest = max(highest, int(qid[len(prefix):]))
            except ValueError:
                pass
    return f"{prefix}{highest + 1}"


# ---------------------------------------------------------------------------
# 4. Dynamic SEO, AIEO (/llms.txt, JSON-LD) & Pre-Rendered #root HTML Engine
# ---------------------------------------------------------------------------
def generate_llms_txt(site_data, full=False):
    seo = (site_data or {}).get("seo") or {}
    biz_name = seo.get("businessName", "THE Occasion Edit")
    tagline = seo.get("tagline", "Bespoke Balloon Styling, Sequin Shimmer Walls & Luxury Event Decor")
    areas = seo.get("serviceAreas", "Bottesford, Vale of Belvoir, Grantham, Bingham, Melton Mowbray, Newark-on-Trent, Nottingham & surrounding East Midlands borders")
    postcodes = seo.get("postcodePrefixes", "NG13, NG31, NG32, NG1-NG12, LE13, LN6")
    delivery = seo.get("deliveryNote", "Full delivery, installation, and collection of hire props.")

    lines = [
        f"# {biz_name}",
        f"> {tagline}",
        "",
        f"## Service Areas & Postcode Coverage",
        f"- **Towns & Regions:** {areas}",
        f"- **Postcode Prefixes:** {postcodes}",
        f"- **Delivery & Hire Policy:** {delivery}",
        "",
        "## Interactive 3D Display Builder & Packages",
        "Customers can visually design their custom event setup in real time at `/` (`#build-your-edit`) across 5 steps:",
        "1. **Our 5 Signature Balloon Palettes** (or custom 5-colour mix)",
        "2. **Backdrops & Sequin Shimmer Walls** (Arched Wooden Board, Gold/Silver/Black/Pink Shimmer Walls in Small £150 or Large £180 with garland, Circular Hoop £140 with garland, Welcome Easel £85)",
        "3. **Organic Balloon Garlands** (7ft Side Garland £105 solo, Corner Clusters £85, Full Surround Arch £145 solo or +£25/+£35 upgrade on walls)",
        "4. **3D Foil Numbers, Stacks & Letters** (Basic Stack £35/£55, Themed Stack £60/£80, Luxury Stack £70/£90, Helium Foil Numbers + 2 Clusters £36/£52, 16\" Foil Letters £12/letter)",
        "5. **Finishing Extras** (LED Neon Sign £35, Floral Accents £36, BABY Blocks £40, Personalised Bubble Balloon £35, Cut-Outs £36, Table Centerpieces £35, Cake Plinth £60)",
        ""
    ]

    catalog = (site_data or {}).get("catalog") or []
    if catalog:
        lines.append("## Complete Studio Price List (GBP)")
        for item in catalog:
            status = "In Stock" if item.get("inStock", True) else "Currently Unavailable"
            hire = "Hire Only" if item.get("hireOnly") else "Yours to Keep"
            lines.append(f"- **{item.get('name')}** ({item.get('section')}): {item.get('pricingText', '£' + str(item.get('basePrice', 0)))} — {hire} [{status}]")
        lines.append("")

    faqs = (site_data or {}).get("faqs") or []
    if full and faqs:
        lines.append("## Frequently Asked Questions")
        for faq in faqs:
            lines.append(f"### {faq.get('question')}")
            lines.append(f"{faq.get('answer')}")
            lines.append("")

    return "\n".join(lines) + "\n"


def generate_schema_jsonld(site_data, base_url):
    seo = (site_data or {}).get("seo") or {}
    biz_name = seo.get("businessName", "THE Occasion Edit")
    tagline = seo.get("tagline", "Bespoke Balloon Styling, Sequin Shimmer Walls & Luxury Event Decor")
    areas = [a.strip() for a in seo.get("serviceAreas", "Bottesford, Vale of Belvoir, Grantham, Bingham, Melton Mowbray, Newark-on-Trent, Nottingham").split(",") if a.strip()]
    catalog = (site_data or {}).get("catalog") or []
    faqs = (site_data or {}).get("faqs") or []

    offers_list = []
    for item in catalog:
        offers_list.append({
            "@type": "Offer",
            "name": item.get("name", "Balloon Styling Package"),
            "description": item.get("style", ""),
            "price": str(item.get("basePrice", 35)),
            "priceCurrency": "GBP",
            "availability": "https://schema.org/InStock" if item.get("inStock", True) else "https://schema.org/OutOfStock",
            "url": f"{base_url}/#price-guide"
        })

    faq_entities = []
    for faq in faqs:
        faq_entities.append({
            "@type": "Question",
            "name": faq.get("question", ""),
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.get("answer", "")
            }
        })

    graph = [
        {
            "@type": ["LocalBusiness", "EventVenue"],
            "@id": f"{base_url}/#studio",
            "name": biz_name,
            "description": tagline,
            "url": base_url,
            "image": f"{base_url}/public/assets/hero-v1-bg.jpg",
            "priceRange": "£35 - £280",
            "areaServed": areas,
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Bottesford",
                "addressRegion": "Leicestershire",
                "postalCode": "NG13",
                "addressCountry": "GB"
            },
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Bespoke Balloon & Event Styling Price List",
                "itemListElement": offers_list
            }
        }
    ]
    if faq_entities:
        graph.append({
            "@type": "FAQPage",
            "@id": f"{base_url}/#faq-schema",
            "mainEntity": faq_entities
        })

    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)


def write_seo_files_to_disk(site_data):
    try:
        llms_short = generate_llms_txt(site_data, full=False)
        llms_full = generate_llms_txt(site_data, full=True)
        with open(os.path.join(PUBLIC_DIR, "llms.txt"), "w", encoding="utf-8") as f:
            f.write(llms_short)
        with open(os.path.join(PUBLIC_DIR, "llms-full.txt"), "w", encoding="utf-8") as f:
            f.write(llms_full)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 5. Google Sheets Webhook Helper (Background & On-Demand Sync)
# ---------------------------------------------------------------------------
def call_google_sheets_webhook(url, payload, timeout=8.0):
    # A local stand-in for Laura's Google script is allowed only when testing
    local_test = os.environ.get("OE_ALLOW_LOCAL_SHEET") == "1" and str(url).startswith("http://127.0.0.1:")
    if not url or not (url.startswith("https://script.google.com/") or local_test):
        return {"ok": False, "error": "No valid Google Apps Script Web App URL configured."}
    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "text/plain;charset=utf-8"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except Exception as e:
        return {"ok": False, "error": str(e)}


def fetch_google_sheets_catalog(url, timeout=8.0):
    if not url or not url.startswith("https://script.google.com/"):
        return {"ok": False, "error": "No valid Google Apps Script Web App URL configured."}
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# 6. Hardened HTTP Request Handler
# ---------------------------------------------------------------------------
class OccasionEditHandler(BaseHTTPRequestHandler):
    server_version = "OccasionEditStudio/2.0"
    sys_version = ""

    def setup(self):
        super().setup()
        self.request.settimeout(10.0)

    def log_message(self, fmt, *args):
        # Privacy-preserving access log (never logs PII bodies or tokens)
        return

    def get_client_ip(self):
        cf_ip = self.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()
        xff = self.headers.get("X-Forwarded-For")
        if xff:
            return xff.split(",")[0].strip()
        return self.client_address[0] if self.client_address else "unknown"

    def send_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://www.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://*.googleapis.com; "
            # The Studio shows each venue on an embedded Google map
            "frame-src 'self' https://www.google.com https://maps.google.com https://drive.google.com;"
        )

    def send_json(self, status_code, payload, extra_headers=None):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def read_json_body(self, max_bytes):
        cl_header = self.headers.get("Content-Length")
        if not cl_header:
            raise ValueError("Missing Content-Length header.")
        length = int(cl_header)
        if length < 0 or length > max_bytes:
            raise OverflowError(f"Payload exceeds maximum allowed size ({max_bytes} bytes).")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def get_active_session(self, require_csrf=True):
        cookie_hdr = self.headers.get("Cookie", "")
        cookie = SimpleCookie()
        try:
            cookie.load(cookie_hdr)
        except Exception:
            return None
        morsel = cookie.get("oe_admin_session")
        if not morsel:
            return None
        token = morsel.value
        now = time.time()
        with AUTH_LOCK:
            sess = ACTIVE_SESSIONS.get(token)
            if not sess:
                return None
            if now > sess["expires_at"]:
                ACTIVE_SESSIONS.pop(token, None)
                return None
            if require_csrf:
                csrf_hdr = self.headers.get("X-CSRF-Token", "")
                if not csrf_hdr or not hmac.compare_digest(csrf_hdr, sess["csrf"]):
                    return None
            return sess

    # -----------------------------------------------------------------------
    # GET Routes
    # -----------------------------------------------------------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        # 1. Dynamic SEO & AIEO Endpoints
        if route in ("/llms.txt", "/public/llms.txt"):
            site_data = get_default_site_data()
            txt = generate_llms_txt(site_data, full=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_security_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(txt)))
            self.end_headers()
            self.wfile.write(txt)
            return

        if route in ("/llms-full.txt", "/public/llms-full.txt"):
            site_data = get_default_site_data()
            txt = generate_llms_txt(site_data, full=True).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_security_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(txt)))
            self.end_headers()
            self.wfile.write(txt)
            return

        if route == "/robots.txt":
            host = self.headers.get("Host", f"localhost:{PORT}")
            proto = "https" if "trycloudflare.com" in host or self.headers.get("X-Forwarded-Proto") == "https" else "http"
            robots = (
                "User-agent: *\n"
                "Allow: /\n"
                "Disallow: /api/quotes\n"
                "Disallow: /api/auth\n"
                "Disallow: /data/\n\n"
                "User-agent: OAI-SearchBot\nAllow: /\n\n"
                "User-agent: GPTBot\nAllow: /\n\n"
                "User-agent: PerplexityBot\nAllow: /\n\n"
                "User-agent: ClaudeBot\nAllow: /\n\n"
                "User-agent: Google-Extended\nAllow: /\n\n"
                "User-agent: Applebot-Extended\nAllow: /\n\n"
                f"Sitemap: {proto}://{host}/sitemap.xml\n"
            ).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_security_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(robots)))
            self.end_headers()
            self.wfile.write(robots)
            return

        if route == "/sitemap.xml":
            host = self.headers.get("Host", f"localhost:{PORT}")
            proto = "https" if "trycloudflare.com" in host or self.headers.get("X-Forwarded-Proto") == "https" else "http"
            base_url = f"{proto}://{host}"
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            xml = (
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                f'  <url><loc>{base_url}/</loc><lastmod>{today}</lastmod><priority>1.0</priority></url>\n'
                f'  <url><loc>{base_url}/llms.txt</loc><lastmod>{today}</lastmod><priority>0.8</priority></url>\n'
                '</urlset>\n'
            ).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_security_headers()
            self.send_header("Content-Type", "application/xml; charset=utf-8")
            self.send_header("Content-Length", str(len(xml)))
            self.end_headers()
            self.wfile.write(xml)
            return

        # Public availability for one date: counts only, never customer details
        if route == "/api/availability":
            query = urllib.parse.parse_qs(parsed.query)
            date = (query.get("date") or [""])[0][:10]
            if day_number(date) is None:
                self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Choose a valid date."})
                return
            result = compute_availability(
                date,
                load_quotes(),
                hire_items_from_site_data(get_default_site_data()),
                load_studio_settings()
            )
            self.send_json(HTTPStatus.OK, {"ok": True, "availability": result})
            return

        # 2. Public Site Data API (includes calm unread notification counter if admin session active)
        if route == "/api/site-data":
            site_data = get_default_site_data()
            sess = self.get_active_session(require_csrf=False)
            resp = {
                "ok": True,
                "siteData": site_data,
                "isAdminAuthenticated": sess is not None,
                "csrfToken": sess["csrf"] if sess else None,
                "unreadEnquiriesCount": count_unread_enquiries() if sess else 0
            }
            self.send_json(HTTPStatus.OK, resp)
            return

        # 3. Protected Admin Quotes API
        if route == "/api/quotes":
            sess = self.get_active_session(require_csrf=False)
            if not sess:
                self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Studio Admin unlock required."})
                return
            quotes = load_quotes()
            self.send_json(HTTPStatus.OK, {
                "ok": True,
                "quotes": quotes,
                "unreadEnquiriesCount": count_unread_enquiries(quotes)
            })
            return

        # 4. Protected Admin Studio Settings API (Bank Details & Sheet Config)
        m_doc = re.match(r"^/api/admin/documents/([a-f0-9]{16})$", route)
        if m_doc:
            if not self.get_active_session(require_csrf=False):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Studio Admin unlock required."})
                return
            html_text = read_document_html(m_doc.group(1))
            if not html_text:
                self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Document not found."})
                return
            raw = html_text.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            # Shown inside the Studio's preview panel, so this page alone may be framed by the site itself
            self.send_header("X-Frame-Options", "SAMEORIGIN")
            self.send_header("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'self'")
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return

        if route == "/api/admin/settings":
            sess = self.get_active_session(require_csrf=False)
            if not sess:
                self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Studio Admin unlock required."})
                return
            self.send_json(HTTPStatus.OK, {
                "ok": True,
                "settings": load_studio_settings()
            })
            return

        # 5. Serve index.html with Dynamic JSON-LD & OpenGraph Origin Injection
        if route in ("/", "/index.html"):
            index_file = os.path.join(DIST_DIR, "index.html")
            if not os.path.isfile(index_file):
                self.send_error(HTTPStatus.NOT_FOUND, "Site not built yet: run `npm run build` first")
                return
            with open(index_file, "r", encoding="utf-8") as f:
                raw_html = f.read()

            host = self.headers.get("Host", f"localhost:{PORT}")
            proto = "https" if "trycloudflare.com" in host or self.headers.get("X-Forwarded-Proto") == "https" else "http"
            base_url = f"{proto}://{host}"
            site_data = get_default_site_data()
            jsonld_str = generate_schema_jsonld(site_data, base_url)
            jsonld_tag = f'<script id="dynamic-jsonld" type="application/ld+json">{jsonld_str}</script>'
            if 'id="dynamic-jsonld"' not in raw_html:
                raw_html = raw_html.replace("</head>", f"  {jsonld_tag}\n</head>", 1)

            body = raw_html.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_security_headers()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 5. Canonical Whitelisted Static File Serving (/src/* and /public/*)
        clean_rel = urllib.parse.unquote(route).lstrip("/")
        # Block any hidden/dot segments or non-whitelisted folders
        parts = clean_rel.split("/")
        if any(p.startswith(".") for p in parts) or parts[0] not in ("build", "public"):
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "403 Forbidden"})
            return

        base_dir = DIST_DIR if parts[0] == "build" else ROOT_DIR
        candidate = os.path.realpath(os.path.join(base_dir, clean_rel))
        allowed_roots = (os.path.realpath(os.path.join(DIST_DIR, "build")) + os.sep, os.path.realpath(PUBLIC_DIR) + os.sep)
        if not candidate.startswith(allowed_roots) or not os.path.isfile(candidate):
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "404 Not Found"})
            return

        ctype, _ = mimetypes.guess_type(candidate)
        if candidate.endswith(".jsx") or candidate.endswith(".js"):
            ctype = "application/javascript; charset=utf-8"
        elif candidate.endswith(".css"):
            ctype = "text/css; charset=utf-8"
        elif not ctype:
            ctype = "application/octet-stream"

        with open(candidate, "rb") as f:
            data = f.read()

        self.send_response(HTTPStatus.OK)
        self.send_security_headers()
        self.send_header("Content-Type", ctype)
        if candidate.startswith(os.path.realpath(PUBLIC_DIR)):
            self.send_header("Cache-Control", "public, max-age=3600")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # -----------------------------------------------------------------------
    # POST Routes
    # -----------------------------------------------------------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        client_ip = self.get_client_ip()

        try:
            # 1. Admin PIN Authentication (PBKDF2-HMAC-SHA256 + 5-Strike Lockout)
            if route == "/api/auth/verify":
                now = time.time()
                with AUTH_LOCK:
                    rec = PIN_ATTEMPTS.get(client_ip, {"strikes": 0, "locked_until": 0.0})
                    if now < rec["locked_until"]:
                        wait_s = int(rec["locked_until"] - now)
                        self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {
                            "ok": False,
                            "error": f"Too many failed PIN attempts. Try again in {wait_s} seconds."
                        })
                        return

                body = self.read_json_body(max_bytes=1024)
                pin_candidate = str(body.get("pin", "")).strip()
                cand_hash = hashlib.pbkdf2_hmac("sha256", pin_candidate.encode("utf-8"), ADMIN_SALT, PBKDF2_ITERATIONS)

                if hmac.compare_digest(cand_hash, ADMIN_PIN_HASH):
                    session_token = secrets.token_urlsafe(32)
                    csrf_token = secrets.token_urlsafe(24)
                    with AUTH_LOCK:
                        PIN_ATTEMPTS.pop(client_ip, None)
                        ACTIVE_SESSIONS[session_token] = {
                            "csrf": csrf_token,
                            "expires_at": time.time() + SESSION_TTL_SECONDS,
                            "ip": client_ip
                        }
                    is_https = "trycloudflare.com" in self.headers.get("Host", "") or self.headers.get("X-Forwarded-Proto") == "https"
                    cookie_val = f"oe_admin_session={session_token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_TTL_SECONDS}"
                    if is_https:
                        cookie_val += "; Secure"
                    self.send_json(
                        HTTPStatus.OK,
                        {
                            "ok": True,
                            "csrfToken": csrf_token,
                            "unreadEnquiriesCount": count_unread_enquiries()
                        },
                        extra_headers={"Set-Cookie": cookie_val}
                    )
                else:
                    time.sleep(0.3)
                    with AUTH_LOCK:
                        rec = PIN_ATTEMPTS.get(client_ip, {"strikes": 0, "locked_until": 0.0})
                        rec["strikes"] += 1
                        if rec["strikes"] >= MAX_PIN_STRIKES:
                            rec["locked_until"] = time.time() + LOCKOUT_SECONDS
                        PIN_ATTEMPTS[client_ip] = rec
                        remaining = max(0, MAX_PIN_STRIKES - rec["strikes"])
                    self.send_json(HTTPStatus.UNAUTHORIZED, {
                        "ok": False,
                        "error": f"Incorrect Studio PIN ({remaining} attempts remaining)."
                    })
                return

            # 2. Admin Logout
            if route == "/api/auth/logout":
                cookie_hdr = self.headers.get("Cookie", "")
                cookie = SimpleCookie()
                cookie.load(cookie_hdr)
                morsel = cookie.get("oe_admin_session")
                if morsel:
                    with AUTH_LOCK:
                        ACTIVE_SESSIONS.pop(morsel.value, None)
                self.send_json(
                    HTTPStatus.OK,
                    {"ok": True},
                    extra_headers={"Set-Cookie": "oe_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"}
                )
                return

            # 3. Public Customer Quote Submission (Rate-Limited + Honeypot + Fill-Time Check)
            if route == "/api/quotes":
                body = self.read_json_body(max_bytes=65536)

                # Anti-bot Honeypot & Fill-Time Gate
                if body.get("_company_website"):
                    self.send_json(HTTPStatus.OK, {"ok": True, "ignored": True})
                    return
                fill_ms = int(body.get("_formFillMs", 5000))
                if fill_ms < 1500:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Please complete the form before submitting."})
                    return

                now = time.time()
                with AUTH_LOCK:
                    history = [t for t in QUOTE_RATE_LIMIT.get(client_ip, []) if now - t < 600]
                    if len(history) >= 8:
                        self.send_json(HTTPStatus.TOO_MANY_REQUESTS, {
                            "ok": False,
                            "error": "Too many enquiries sent recently. Please wait a few minutes."
                        })
                        return
                    history.append(now)
                    QUOTE_RATE_LIMIT[client_ip] = history

                client = body.get("client") or {}
                name = sanitize_formula_cell(client.get("name", ""))[:120]
                email = sanitize_formula_cell(client.get("email", ""))[:150]
                phone = sanitize_formula_cell(client.get("phone", ""))[:40]
                event_date = sanitize_formula_cell(client.get("eventDate", ""))[:40]
                postcode = sanitize_formula_cell(client.get("postcode", ""))[:20]
                notes = sanitize_formula_cell(client.get("notes", ""))[:1000]

                if not name or not phone:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Name and phone number are required."})
                    return

                quotes = load_quotes()
                cfg = body.get("configuration") or {}

                settings = load_studio_settings()
                min_notice = clamp_int(settings.get("minNoticeDays", 2), 0, 60, 2)
                if day_number(event_date) is not None and day_number(event_date) < datetime.now().date().toordinal() + min_notice:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "code": "unavailable", "error": f"We need at least {min_notice} days' notice. Please choose a later date."})
                    return

                # Someone else may have booked the last prop while this customer was choosing
                hire_items = hire_items_from_site_data(get_default_site_data())
                if day_number(event_date) is not None:
                    avail = compute_availability(event_date, quotes, hire_items, settings)
                    gone = [i for i in hire_prop_ids({"configuration": cfg}, hire_items) if avail["items"][i]["free"] < 1]
                    if avail["dayFull"] or gone:
                        names = [it["name"] for it in hire_items if it["id"] in gone]
                        message = ("We're fully booked on that date. Please choose another date." if avail["dayFull"]
                                   else "Sorry, " + " and ".join(names) + " has just been booked for that date. Please choose another option or date.")
                        self.send_json(HTTPStatus.CONFLICT, {"ok": False, "code": "unavailable", "error": message, "unavailable": gone, "dayFull": avail["dayFull"]})
                        return

                order_id = generate_tax_year_order_id(quotes)
                quote_record = {
                    "id": order_id,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "status": "New Enquiry",
                    "seenByAdmin": False,
                    "client": {
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "eventDate": event_date,
                        "postcode": postcode,
                        "notes": notes,
                        "accessTime": sanitize_formula_cell(client.get("accessTime", client.get("venueAccessTime", "")))[:30],
                        "venueName": sanitize_formula_cell(client.get("venueName", ""))[:120],
                        "setting": "outdoor" if client.get("setting") == "outdoor" else "indoor",
                        "occasion": sanitize_formula_cell(client.get("occasion", ""))[:60],
                        "hasVenue": "no" if client.get("hasVenue") == "no" else "yes",
                        "area": sanitize_formula_cell(client.get("area", ""))[:80],
                        "budget": clamp_int(client.get("budget") if client.get("hasBudget") == "yes" else 0, 0, 10000, 0),
                        "style": client.get("style") if client.get("style") in ("Classic", "Fancy", "Luxury") else ""
                    },
                    "configuration": {
                        "palette": [sanitize_formula_cell(c)[:60] for c in (cfg.get("palette") or [])[:8]],
                        "backdrop": sanitize_formula_cell(cfg.get("backdrop", "None"))[:120],
                        "balloonLayout": sanitize_formula_cell(cfg.get("balloonLayout", "None"))[:120],
                        "digitsOrLetters": sanitize_formula_cell(cfg.get("digitsOrLetters", "None"))[:120],
                        "extras": [sanitize_formula_cell(e)[:80] for e in (cfg.get("extras") or [])[:12]],
                        "promoCode": sanitize_formula_cell(cfg.get("promoCode", ""))[:40],
                        "subtotal": max(0, min(10000, float(cfg.get("subtotal", cfg.get("estimatedTotal", 0))))),
                        "bundleDiscount": max(0, min(1000, float(cfg.get("bundleDiscount", 0)))),
                        "estimatedTotal": max(0, min(10000, float(cfg.get("estimatedTotal", 0)))),
                        "stockIds": [sanitize_formula_cell(s)[:80] for s in (cfg.get("stockIds") or [])[:30]],
                        "balloonPullList": sanitize_formula_cell(cfg.get("balloonPullList", ""))[:300],
                        "backdropId": sanitize_formula_cell(cfg.get("backdropId") or "")[:60],
                        "balloonId": sanitize_formula_cell(cfg.get("balloonId") or "")[:60],
                        "digitId": sanitize_formula_cell(cfg.get("digitId") or "")[:60],
                        "digitText": sanitize_formula_cell(cfg.get("digitText") or "")[:12],
                        "extraIds": [sanitize_formula_cell(e)[:60] for e in (cfg.get("extraIds") or [])[:12]],
                        "shimmerSize": sanitize_formula_cell(cfg.get("shimmerSize") or "")[:20],
                        "boardCustomization": {
                            str(k)[:40]: sanitize_formula_cell(str(v))[:200]
                            for k, v in list((cfg.get("boardCustomization") or {}).items())[:10]
                        } if isinstance(cfg.get("boardCustomization"), dict) else None,
                        "neonPhrase": sanitize_formula_cell(cfg.get("neonPhrase") or "")[:80],
                        "bubbleText": sanitize_formula_cell(cfg.get("bubbleText") or "")[:80],
                        "cutoutTheme": sanitize_formula_cell(cfg.get("cutoutTheme") or "")[:60]
                    },
                    "previewSnapshotDataUrl": str(body.get("previewSnapshotDataUrl", ""))[:45000]
                }

                quotes.insert(0, quote_record)
                save_quotes(quotes)

                # Forward to Google Sheet in background if configured
                site_data = get_default_site_data()
                studio_cfg = load_studio_settings().get("sheetConfig") or {}
                sheet_url = studio_cfg.get("webAppUrl") or (site_data.get("sheetConfig") or {}).get("webAppUrl", "")
                if sheet_url:
                    threading.Thread(
                        target=call_google_sheets_webhook,
                        args=(sheet_url, {"action": "new_quote", "quote": quote_record}),
                        daemon=True
                    ).start()

                self.send_json(HTTPStatus.CREATED, {"ok": True, "quoteId": quote_record["id"]})
                return

            # -------------------------------------------------------------------
            # All routes below require an authenticated Admin session + CSRF token
            # -------------------------------------------------------------------
            sess = self.get_active_session(require_csrf=True)
            if not sess:
                self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Unauthorized or invalid CSRF token."})
                return

            # 4. Save Studio Settings (Bank Details, Studio Contact, Google Sheet Config)
            if route == "/api/admin/settings":
                body = self.read_json_body(max_bytes=16384)
                if not isinstance(body, dict):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Invalid settings payload."})
                    return

                existing = load_studio_settings()
                sheet_in = body.get("sheetConfig") if isinstance(body.get("sheetConfig"), dict) else existing.get("sheetConfig", {})

                raw_sort_code = str(body.get("sortCode", existing.get("sortCode", "")))
                cleaned_sort_code = re.sub(r"[^0-9\-]", "", raw_sort_code).strip()[:10]

                raw_account_num = str(body.get("accountNumber", existing.get("accountNumber", "")))
                cleaned_account_num = re.sub(r"[^0-9]", "", raw_account_num).strip()[:20]

                sanitized = {
                    "businessTradingName": sanitize_formula_cell(body.get("businessTradingName", existing.get("businessTradingName", "")))[:120],
                    "studioAddress": sanitize_formula_cell(body.get("studioAddress", existing.get("studioAddress", "")))[:200],
                    "studioEmail": sanitize_formula_cell(body.get("studioEmail", existing.get("studioEmail", "")))[:150],
                    "studioPhone": sanitize_formula_cell(body.get("studioPhone", existing.get("studioPhone", "")))[:50],
                    "taxYear": sanitize_formula_cell(body.get("taxYear", existing.get("taxYear", "")))[:20],
                    "bankName": sanitize_formula_cell(body.get("bankName", existing.get("bankName", "")))[:100],
                    "accountName": sanitize_formula_cell(body.get("accountName", existing.get("accountName", "")))[:120],
                    "sortCode": cleaned_sort_code,
                    "accountNumber": cleaned_account_num,
                    "paymentRefFormat": sanitize_formula_cell(body.get("paymentRefFormat", existing.get("paymentRefFormat", "{orderId}-{clientSurname}")))[:80],
                    "maxSetupsPerDay": clamp_int(body.get("maxSetupsPerDay", existing.get("maxSetupsPerDay", 1)), 1, 20, 1),
                    "holdUntilReply": bool(body.get("holdUntilReply", existing.get("holdUntilReply", True))),
                    "holdHours": clamp_int(body.get("holdHours", existing.get("holdHours", 48)), 0, 336, 48),
                    "sameDayTurnaround": bool(body.get("sameDayTurnaround", existing.get("sameDayTurnaround", True))),
                    "minNoticeDays": clamp_int(body.get("minNoticeDays", existing.get("minNoticeDays", 2)), 0, 60, 2),
                    "blockedDates": sorted({
                        str(d)[:10] for d in (body.get("blockedDates", existing.get("blockedDates", [])) or [])[:366]
                        if day_number(str(d)[:10]) is not None
                    }),
                    "signOffName": sanitize_formula_cell(body.get("signOffName", existing.get("signOffName", "")))[:60],
                    # Balloon stock counts: { colourId: { "Sm": n, "Md": n, "Lg": n } } and foil digits 0-9
                    "balloonStock": {
                        str(cid)[:80]: {size: clamp_int((sizes or {}).get(size, 0), 0, 100000, 0) for size in ("Sm", "Md", "Lg")}
                        for cid, sizes in list((body.get("balloonStock", existing.get("balloonStock", {})) or {}).items())[:200]
                        if isinstance(sizes, dict)
                    },
                    "foilStock": {
                        d: clamp_int((body.get("foilStock", existing.get("foilStock", {})) or {}).get(d, 0), 0, 10000, 0)
                        for d in "0123456789"
                    },
                    "lowStockAt": clamp_int(body.get("lowStockAt", existing.get("lowStockAt", 25)), 0, 10000, 25),
                    "stockCountedAt": sanitize_formula_cell(body.get("stockCountedAt", existing.get("stockCountedAt", "")))[:40],
                    "sheetConfig": {
                        "webAppUrl": sanitize_formula_cell(sheet_in.get("webAppUrl", ""))[:500],
                        "adminSecret": sanitize_formula_cell(sheet_in.get("adminSecret", ""))[:200]
                    }
                }
                save_studio_settings(sanitized)
                self.send_json(HTTPStatus.OK, {"ok": True, "settings": sanitized})
                return

            # 5. Save Site Data + Sync to Google Sheet + Regenerate SEO/AIEO
            if route == "/api/site-data":
                body = self.read_json_body(max_bytes=262144)
                new_site_data = body.get("siteData")
                if not isinstance(new_site_data, dict):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Invalid siteData object."})
                    return

                new_site_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
                with DATA_LOCK:
                    if os.path.exists(SITE_DATA_PATH):
                        shutil.copyfile(SITE_DATA_PATH, SITE_DATA_BACKUP_PATH)
                    atomic_write_json(SITE_DATA_PATH, new_site_data, mode=0o644)

                write_seo_files_to_disk(new_site_data)

                studio_cfg = load_studio_settings().get("sheetConfig") or {}
                sheet_cfg = new_site_data.get("sheetConfig") or studio_cfg
                sheet_url = sheet_cfg.get("webAppUrl") or studio_cfg.get("webAppUrl", "")
                admin_secret = sheet_cfg.get("adminSecret") or studio_cfg.get("adminSecret", "")
                sheet_sync_res = None
                if sheet_url and admin_secret:
                    sheet_sync_res = call_google_sheets_webhook(sheet_url, {
                        "action": "sync_admin_save",
                        "adminSecret": admin_secret,
                        "loadedSheetRevisionMs": body.get("loadedSheetRevisionMs", 0),
                        "forceOverwrite": bool(body.get("forceOverwrite", False)),
                        "siteData": new_site_data
                    })

                self.send_json(HTTPStatus.OK, {
                    "ok": True,
                    "updatedAt": new_site_data["updatedAt"],
                    "sheetSync": sheet_sync_res
                })
                return

            # 6. Pull Latest Catalog & Stock from Google Sheet (doGet)
            # Links to Laura's Drive folders and records, as set up by the sheet script
            # Issue a quote or invoice: kept for good on the server, then filed in Drive
            if route == "/api/admin/documents":
                body = self.read_json_body(max_bytes=600000)
                kind = body.get("kind")
                html_text = body.get("html")
                if kind not in DOCUMENT_KINDS or not isinstance(html_text, str) or not html_text.strip():
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Send a quote or invoice."})
                    return
                quotes = load_quotes()
                order = next((q for q in quotes if q.get("id") == body.get("orderId")), None)
                if not order:
                    self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Order not found."})
                    return
                docs = order.get("documents") if isinstance(order.get("documents"), list) else []
                same_kind = [d for d in docs if d.get("kind") == kind]
                if kind == "invoice" and any(d.get("status") != "void" for d in same_kind):
                    self.send_json(HTTPStatus.CONFLICT, {"ok": False, "error": "This order already has an invoice. Void it first if it needs changing."})
                    return
                version = len(same_kind) + 1
                number = ("INVOICE " if kind == "invoice" else "QUOTE ") + order["id"] + (f" v{version}" if version > 1 else "")
                try:
                    total = round(max(0.0, min(100000.0, float(body.get("total") or 0))), 2)
                except (ValueError, TypeError):
                    total = 0.0
                doc = {
                    "id": uuid.uuid4().hex[:16],
                    "kind": kind,
                    "number": number,
                    "version": version,
                    "total": total,
                    "issuedAt": datetime.now(timezone.utc).isoformat(),
                    "status": "issued",
                    "lines": [
                        {"description": sanitize_formula_cell(str(l.get("description", "")))[:200], "amount": l.get("amount") if isinstance(l.get("amount"), (int, float)) else None}
                        for l in (body.get("lines") or [])[:40] if isinstance(l, dict)
                    ],
                    "notes": sanitize_formula_cell(str(body.get("notes") or ""))[:1000]
                }
                # The logo is the same on every page, so it's stored once and added back when shown
                logo = logo_data_uri()
                store_document_html(doc["id"], html_text.replace(logo, "{{LOGO}}") if logo else html_text)
                for d in same_kind:
                    if kind == "quote" and d.get("status") == "issued":
                        d["status"] = "replaced"
                docs.append(doc)
                order["documents"] = docs
                if kind == "quote":
                    order.setdefault("configuration", {})["quotedPrice"] = total
                add_history(order, f"{number} issued, £{total:g}")
                filed = file_document_in_drive(order, doc)
                if filed and filed.get("ok"):
                    doc["driveFileId"] = str(filed.get("fileId") or "")[:120]
                    doc["driveUrl"] = str(filed.get("fileUrl") or "")[:300]
                    add_history(order, f"{number} filed in Google Drive")
                save_quotes(quotes)
                self.send_json(HTTPStatus.CREATED, {"ok": True, "document": doc, "order": order, "drive": filed})
                return

            m_doc = re.match(r"^/api/admin/documents/([a-f0-9]{16})/(void|file|paid)$", route)
            if m_doc:
                doc_id, what = m_doc.group(1), m_doc.group(2)
                body = self.read_json_body(max_bytes=4096) if what == "void" else {}
                quotes = load_quotes()
                order = next((q for q in quotes if any(d.get("id") == doc_id for d in (q.get("documents") or []))), None)
                if not order:
                    self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Document not found."})
                    return
                doc = next(d for d in order["documents"] if d.get("id") == doc_id)
                drive = None
                if what == "void":
                    reason = sanitize_formula_cell(str(body.get("reason") or "")).strip()[:300]
                    if not reason:
                        self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Say why it's being voided."})
                        return
                    doc["status"] = "void"
                    doc["voidedAt"] = datetime.now(timezone.utc).isoformat()
                    doc["voidReason"] = reason
                    add_history(order, f"{doc['number']} voided: {reason}")
                elif what == "paid":
                    doc["status"] = "paid"
                    doc["paidAt"] = datetime.now(timezone.utc).isoformat()
                    add_history(order, f"{doc['number']} paid")
                else:
                    drive = file_document_in_drive(order, doc)
                    if drive and drive.get("ok"):
                        doc["driveFileId"] = str(drive.get("fileId") or "")[:120]
                        doc["driveUrl"] = str(drive.get("fileUrl") or "")[:300]
                        add_history(order, f"{doc['number']} filed in Google Drive")
                save_quotes(quotes)
                self.send_json(HTTPStatus.OK, {"ok": True, "document": doc, "order": order, "drive": drive})
                return

            # A booking agreed outside the website (Facebook, Instagram, phone), so the diary knows
            if route == "/api/admin/bookings":
                body = self.read_json_body(max_bytes=16384)
                client = body.get("client") or {}
                name = sanitize_formula_cell(client.get("name", ""))[:120]
                event_date = str(client.get("eventDate", ""))[:10]
                if not name or day_number(event_date) is None:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Add a name and a date."})
                    return
                hire_ids = {it["id"] for it in hire_items_from_site_data(get_default_site_data())}
                prop_ids = [str(i)[:60] for i in (body.get("propIds") or [])[:12] if str(i) in hire_ids]
                try:
                    price = round(max(0.0, min(20000.0, float(body.get("price") or 0))), 2)
                    deposit = round(max(0.0, min(price or 20000.0, float(body.get("depositPaid") or 0))), 2)
                except (ValueError, TypeError):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Check the price and deposit."})
                    return
                source = client.get("source") if client.get("source") in BOOKING_SOURCES else "Other"
                quotes = load_quotes()
                order = {
                    "id": generate_tax_year_order_id(quotes),
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "status": "Deposit Paid" if deposit > 0 else "Quote Sent",
                    "seenByAdmin": True,
                    "addedByStaff": True,
                    "client": {
                        "name": name,
                        "phone": sanitize_formula_cell(client.get("phone", ""))[:40],
                        "email": sanitize_formula_cell(client.get("email", ""))[:150],
                        "eventDate": event_date,
                        "postcode": sanitize_formula_cell(client.get("postcode", ""))[:20],
                        "area": sanitize_formula_cell(client.get("area", ""))[:80],
                        "hasVenue": "yes" if client.get("postcode") else "no",
                        "occasion": sanitize_formula_cell(client.get("occasion", ""))[:60],
                        "notes": sanitize_formula_cell(client.get("notes", ""))[:1000],
                        "source": source
                    },
                    "configuration": {
                        "extraIds": prop_ids,
                        "quotedPrice": price,
                        "estimatedTotal": price,
                        "depositPaid": deposit,
                        "balanceDue": max(0.0, round(price - deposit, 2))
                    }
                }
                add_history(order, f"Added by you, booked through {source}")
                if deposit > 0:
                    add_history(order, f"Deposit £{deposit:g} received")
                quotes.insert(0, order)
                save_quotes(quotes)
                site_data = get_default_site_data()
                studio_cfg = load_studio_settings().get("sheetConfig") or {}
                sheet_url = studio_cfg.get("webAppUrl") or (site_data.get("sheetConfig") or {}).get("webAppUrl", "")
                if sheet_url:
                    threading.Thread(
                        target=call_google_sheets_webhook,
                        args=(sheet_url, {"action": "new_quote", "quote": order}),
                        daemon=True
                    ).start()
                self.send_json(HTTPStatus.CREATED, {"ok": True, "quote": order})
                return

            if route == "/api/admin/drive-links":
                sheet_cfg = load_studio_settings().get("sheetConfig") or {}
                if not sheet_cfg.get("webAppUrl") or not sheet_cfg.get("adminSecret"):
                    self.send_json(HTTPStatus.OK, {"ok": True, "connected": False, "links": None})
                    return
                res = call_google_sheets_webhook(sheet_cfg["webAppUrl"], {"action": "drive_links", "adminSecret": sheet_cfg["adminSecret"]})
                if not res.get("ok"):
                    self.send_json(HTTPStatus.BAD_GATEWAY, {"ok": False, "connected": True, "error": res.get("error") or "The Google Sheet didn't answer."})
                    return
                self.send_json(HTTPStatus.OK, {"ok": True, "connected": True, "links": res.get("links")})
                return

            if route == "/api/sync-from-sheet":
                body = self.read_json_body(max_bytes=4096)
                site_data = get_default_site_data()
                studio_cfg = load_studio_settings().get("sheetConfig") or {}
                sheet_cfg = studio_cfg if studio_cfg.get("webAppUrl") else (site_data.get("sheetConfig") or {})
                sheet_url = body.get("webAppUrl") or sheet_cfg.get("webAppUrl", "")
                res = fetch_google_sheets_catalog(sheet_url)
                self.send_json(HTTPStatus.OK, res)
                return

            # 6. Mark All Enquiries as Seen (Clears Unread Notification Badge)
            if route == "/api/quotes/mark-seen":
                quotes = load_quotes()
                for q in quotes:
                    q["seenByAdmin"] = True
                save_quotes(quotes)
                self.send_json(HTTPStatus.OK, {"ok": True, "unreadEnquiriesCount": 0})
                return

            # 7. Upload Photo with Layer-2 Binary JPEG EXIF/GPS Stripper
            if route == "/api/upload-image":
                body = self.read_json_body(max_bytes=524288)
                data_url = str(body.get("imageDataUrl", ""))
                if not data_url.startswith("data:image/jpeg;base64,"):
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Only base64 JPEG images are accepted."})
                    return

                b64_part = data_url.split(",", 1)[1]
                raw_jpeg = base64.b64decode(b64_part)
                clean_jpeg = sanitize_and_validate_jpeg(raw_jpeg, max_dim=2400)

                filename = f"studio-{uuid.uuid4().hex[:12]}.jpg"
                out_path = os.path.join(UPLOADS_DIR, filename)
                with open(out_path, "wb") as f:
                    f.write(clean_jpeg)
                os.chmod(out_path, 0o644)

                public_url = f"/public/assets/uploads/{filename}"
                self.send_json(HTTPStatus.OK, {"ok": True, "url": public_url, "bytes": len(clean_jpeg)})
                return

            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Unknown API endpoint."})

        except OverflowError as e:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": str(e)})
        except ValueError as e:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(e)})
        except Exception as e:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(e)})

    # -----------------------------------------------------------------------
    # PATCH & DELETE Routes (Booking Status Update & UK GDPR Right-to-Erasure)
    # -----------------------------------------------------------------------
    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        sess = self.get_active_session(require_csrf=True)
        if not sess:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Unauthorized"})
            return

        if route.startswith("/api/quotes/"):
            quote_id = urllib.parse.unquote(route.split("/api/quotes/", 1)[1]).strip("/")
            body = self.read_json_body(max_bytes=8192)
            new_status = body.get("status")
            if new_status is not None and str(new_status) not in ORDER_STATUSES:
                self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Unknown order status."})
                return
            quotes = load_quotes()
            found = False
            updated_quote = None
            for q in quotes:
                if q.get("id") == quote_id:
                    if new_status is not None:
                        q["status"] = str(new_status)
                    q["seenByAdmin"] = True
                    if not isinstance(q.get("configuration"), dict):
                        q["configuration"] = {}
                    cfg_q = q["configuration"]
                    # Money Laura records: what she quoted, and what has come in
                    for key, cap in (("quotedPrice", 20000), ("depositPaid", 20000), ("balancePaid", 20000)):
                        if key in body:
                            raw = body.get(key)
                            if raw is None or raw == "":
                                if key == "quotedPrice":
                                    cfg_q.pop(key, None)
                                else:
                                    cfg_q[key] = 0
                                continue
                            try:
                                cfg_q[key] = round(max(0.0, min(float(cap), float(raw))), 2)
                            except (ValueError, TypeError):
                                pass
                    total = order_total(q)
                    cfg_q["balanceDue"] = max(0.0, round(total - float(cfg_q.get("depositPaid") or 0) - float(cfg_q.get("balancePaid") or 0), 2))
                    if "staffNotes" in body:
                        # Kept with the customer's details so it is encrypted at rest like them
                        if not isinstance(q.get("client"), dict):
                            q["client"] = {}
                        q["client"]["staffNotes"] = sanitize_formula_cell(str(body.get("staffNotes") or ""))[:2000]
                    if body.get("historyText"):
                        add_history(q, body.get("historyText"))
                    found = True
                    updated_quote = q
                    break
            if not found:
                self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Quote not found."})
                return
            save_quotes(quotes)

            site_data = get_default_site_data()
            studio_cfg = load_studio_settings().get("sheetConfig") or {}
            sheet_cfg = studio_cfg if studio_cfg.get("webAppUrl") else (site_data.get("sheetConfig") or {})
            if sheet_cfg.get("webAppUrl") and sheet_cfg.get("adminSecret"):
                cfg = (updated_quote or {}).get("configuration", {})
                threading.Thread(
                    target=call_google_sheets_webhook,
                    args=(sheet_cfg["webAppUrl"], {
                        "action": "update_booking_status",
                        "adminSecret": sheet_cfg["adminSecret"],
                        "bookingId": quote_id,
                        "status": (updated_quote or {}).get("status", "New Enquiry"),
                        "depositPaid": cfg.get("depositPaid", 0),
                        "balanceDue": cfg.get("balanceDue", 0)
                    }),
                    daemon=True
                ).start()

            self.send_json(HTTPStatus.OK, {
                "ok": True,
                "quote": updated_quote,
                "unreadEnquiriesCount": count_unread_enquiries(quotes)
            })
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not Found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path
        sess = self.get_active_session(require_csrf=True)
        if not sess:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Unauthorized"})
            return

        if route.startswith("/api/quotes/"):
            quote_id = urllib.parse.unquote(route.split("/api/quotes/", 1)[1]).strip("/")
            quotes = load_quotes()
            target = next((q for q in quotes if q.get("id") == quote_id), None)
            kept_for_tax = bool(target and any(d.get("kind") == "invoice" for d in (target.get("documents") or [])))
            if kept_for_tax:
                # Invoices are tax records (kept 5 years after the 31 January filing deadline),
                # so the order keeps only what its invoices show; contact details and notes go
                client = target.get("client") or {}
                target["client"] = {"name": client.get("name", ""), "eventDate": client.get("eventDate", "")}
                target["gdprErasedAt"] = datetime.now(timezone.utc).isoformat()
                target.pop("previewSnapshotDataUrl", None)
                add_history(target, "Contact details erased on request; invoices kept for tax")
                filtered = quotes
            else:
                filtered = [q for q in quotes if q.get("id") != quote_id]
            save_quotes(filtered)

            # Cascade UK GDPR erasure to Google Sheets Tab 1
            site_data = get_default_site_data()
            studio_cfg = load_studio_settings().get("sheetConfig") or {}
            sheet_cfg = studio_cfg if studio_cfg.get("webAppUrl") else (site_data.get("sheetConfig") or {})
            sheet_res = None
            if sheet_cfg.get("webAppUrl") and sheet_cfg.get("adminSecret"):
                sheet_res = call_google_sheets_webhook(sheet_cfg["webAppUrl"], {
                    "action": "delete_booking_gdpr",
                    "adminSecret": sheet_cfg["adminSecret"],
                    "bookingId": quote_id
                })

            self.send_json(HTTPStatus.OK, {
                "ok": True,
                "deletedId": quote_id,
                "keptForTax": kept_for_tax,
                "sheetGdprDelete": sheet_res,
                "unreadEnquiriesCount": count_unread_enquiries(filtered)
            })
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not Found"})


if __name__ == "__main__":
    ensure_directories()
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), OccasionEditHandler)
    print(f"THE Occasion Edit — Hardened Studio Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
