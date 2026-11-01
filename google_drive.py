"""
Laura's Google Drive, connected with one "Sign in with Google" button.

The Studio asks Google for permission to keep its own files in Laura's Drive
(the drive.file scope: it can only see files it made, nothing else of hers).
Google hands back a long-lived key, kept encrypted on the server, and from then
on the server builds her folders and master sheet, files every quote and
invoice as a PDF, and keeps the sheet up to date. No script to paste.

Oliver turns it on once by giving the site a Google client ID and secret
(see GOOGLE-SETUP.md).
"""
import base64
import html as html_lib
import json
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr, parsedate_to_datetime

# Drive: only the files the Studio makes. Gmail: send as Laura, and read mail to and from her customers.
SCOPES = " ".join([
    "openid", "email",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly"
])

ORDERS_TAB = "Enquiries & Orders"
MONEY_TAB = "Income & Expenses"
DOCS_TAB = "Quotes & Invoices"
SHEET_NAME = "THE Occasion Edit — Master Sheet"
ROOT_FOLDER = "THE Occasion Edit"

# One row per enquiry. Quote and Invoice hold links to the PDFs.
ORDER_COLUMNS = [
    "Received", "Order ID", "Status", "Customer", "Phone", "WhatsApp", "Email",
    "Event date", "Occasion", "Venue or area", "Colours", "What they chose",
    "Personalisation", "Total (£)", "Deposit paid (£)", "Outstanding (£)",
    "Quote", "Invoice", "Notes"
]
COL = {name: i + 1 for i, name in enumerate(ORDER_COLUMNS)}
STATUSES = ["New Enquiry", "Quote Sent", "Deposit Paid", "Confirmed", "Completed", "Cancelled"]

MONEY_COLUMNS = ["Date", "In or out", "Category", "Order ID", "Customer or supplier", "What for", "Amount (£)", "Paid by", "Receipt"]
# The expense boxes on HMRC's self-employment pages, so totals copy straight into a tax return
MONEY_CATEGORIES = [
    "Sales", "Balloons, helium and stock", "Props and equipment", "Travel and mileage",
    "Phone and internet", "Advertising", "Bank and payment charges", "Other business costs"
]

DOCS_COLUMNS = ["Issued", "Order ID", "Document", "Type", "Total (£)", "PDF"]

ORDERS_SHEET_ID, MONEY_SHEET_ID, DOCS_SHEET_ID = 0, 1001, 1002
OLIVE = {"red": 0x4A / 255, "green": 0x58 / 255, "blue": 0x40 / 255}
SAGE = {"red": 0x7A / 255, "green": 0x8C / 255, "blue": 0x68 / 255}
PAPER = {"red": 0xFA / 255, "green": 0xF6 / 255, "blue": 0xF0 / 255}


def _endpoints():
    # A local stand-in for Google is allowed only when testing
    base = os.environ.get("OE_GOOGLE_TEST_BASE", "")
    if os.environ.get("OE_ALLOW_LOCAL_SHEET") == "1" and base.startswith("http://127.0.0.1:"):
        return {
            "auth": base + "/o/oauth2/v2/auth", "token": base + "/token", "revoke": base + "/revoke",
            "drive": base + "/drive/v3", "upload": base + "/upload/drive/v3", "sheets": base + "/v4",
            "gmail": base + "/gmail/v1"
        }
    return {
        "auth": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "revoke": "https://oauth2.googleapis.com/revoke",
        "drive": "https://www.googleapis.com/drive/v3",
        "upload": "https://www.googleapis.com/upload/drive/v3",
        "sheets": "https://sheets.googleapis.com/v4",
        "gmail": "https://gmail.googleapis.com/gmail/v1"
    }


def uk_tax_year(dt=None):
    dt = dt or datetime.now()
    start = dt.year if (dt.month, dt.day) >= (4, 6) else dt.year - 1
    return f"{start}-{str(start + 1)[2:]}"


def clean_cell(value):
    """Customer text can never run as a spreadsheet formula."""
    text = str(value if value is not None else "")
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


class GoogleError(Exception):
    pass


class GoogleDrive:
    def __init__(self, store_path, encrypt, decrypt):
        self.store_path = store_path
        self._encrypt = encrypt
        self._decrypt = decrypt
        self._lock = threading.RLock()
        self._access = {"token": None, "expires": 0}
        self._pending = {}  # sign-in state -> expiry

    # ------------------------------------------------------------------ store
    def _load(self):
        try:
            with open(self.store_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}

    def _save(self, data):
        tmp = self.store_path + ".tmp"
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f)
        os.replace(tmp, self.store_path)

    def client(self):
        cid = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
        if cid and secret:
            return cid, secret
        saved = self._load().get("client") or {}
        if saved.get("id") and saved.get("secret"):
            return saved["id"], (self._decrypt(saved["secret"]) or {}).get("s", "")
        return None, None

    def save_client(self, client_id, client_secret):
        with self._lock:
            data = self._load()
            data["client"] = {"id": client_id.strip(), "secret": self._encrypt({"s": client_secret.strip()})}
            self._save(data)

    def status(self):
        data = self._load()
        cid, _ = self.client()
        return {
            "available": bool(cid),
            "connected": bool(data.get("refresh")),
            "gmail": bool(data.get("refresh")) and "gmail.send" in data.get("scopes", ""),
            "email": data.get("email", ""),
            "links": data.get("links"),
            "connectedAt": data.get("connectedAt", "")
        }

    def connected(self):
        return bool(self._load().get("refresh"))

    def gmail_ready(self):
        data = self._load()
        return bool(data.get("refresh")) and "gmail.send" in data.get("scopes", "")

    # ------------------------------------------------------------------ sign in
    def sign_in_url(self, redirect_uri):
        cid, _ = self.client()
        if not cid:
            raise GoogleError("Google sign-in isn't switched on yet.")
        state = secrets.token_urlsafe(24)
        now = time.time()
        with self._lock:
            self._pending = {k: v for k, v in self._pending.items() if v > now}
            self._pending[state] = now + 600
        return _endpoints()["auth"] + "?" + urllib.parse.urlencode({
            "client_id": cid, "redirect_uri": redirect_uri, "response_type": "code",
            "scope": SCOPES, "access_type": "offline", "prompt": "consent",
            "include_granted_scopes": "true", "state": state
        })

    def finish_sign_in(self, code, state, redirect_uri):
        with self._lock:
            expiry = self._pending.pop(state or "", 0)
        if expiry < time.time():
            raise GoogleError("That sign-in link has expired. Press Connect my Google Drive again.")
        cid, secret = self.client()
        tokens = self._post_form(_endpoints()["token"], {
            "code": code, "client_id": cid, "client_secret": secret,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code"
        })
        if not tokens.get("refresh_token"):
            raise GoogleError("Google didn't give a lasting key. Try again and press Allow.")
        email = ""
        try:
            payload = tokens.get("id_token", "").split(".")[1]
            email = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))).get("email", "")
        except (IndexError, ValueError):
            pass
        with self._lock:
            data = self._load()
            data.update({
                "scopes": tokens.get("scope", SCOPES),
                "refresh": self._encrypt({"r": tokens["refresh_token"]}),
                "email": email,
                "connectedAt": datetime.now(timezone.utc).isoformat()
            })
            self._save(data)
            self._access = {"token": tokens.get("access_token"), "expires": time.time() + int(tokens.get("expires_in", 3000)) - 60}
        return self.set_up()

    def disconnect(self):
        with self._lock:
            data = self._load()
            refresh = (self._decrypt(data.get("refresh", "")) or {}).get("r") if data.get("refresh") else None
            if refresh:
                try:
                    self._post_form(_endpoints()["revoke"], {"token": refresh})
                except GoogleError:
                    pass
            # Folders and files stay in Laura's Drive; only the key is forgotten
            self._save({"client": data["client"]} if data.get("client") else {})
            self._access = {"token": None, "expires": 0}

    # ------------------------------------------------------------------ http
    def _post_form(self, url, fields):
        req = urllib.request.Request(url, data=urllib.parse.urlencode(fields).encode(), method="POST",
                                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        return self._send(req, as_json=True)

    def _send(self, req, as_json=True, timeout=45):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as e:
            detail = ""
            try:
                detail = json.loads(e.read().decode()).get("error", "")
                if isinstance(detail, dict):
                    detail = detail.get("message", "")
            except ValueError:
                pass
            if e.code in (400, 401) and detail in ("invalid_grant", "unauthorized_client"):
                raise GoogleError("Google has signed the Studio out. Press Connect my Google Drive again.")
            raise GoogleError(f"Google said no ({e.code}{': ' + str(detail) if detail else ''}).")
        except (urllib.error.URLError, TimeoutError) as e:
            raise GoogleError(f"Couldn't reach Google ({getattr(e, 'reason', e)}).")
        if not as_json:
            return raw
        return json.loads(raw.decode() or "{}")

    def _token(self):
        with self._lock:
            if self._access["token"] and self._access["expires"] > time.time():
                return self._access["token"]
            data = self._load()
            refresh = (self._decrypt(data.get("refresh", "")) or {}).get("r") if data.get("refresh") else None
            if not refresh:
                raise GoogleError("Google Drive isn't connected yet.")
            cid, secret = self.client()
            tokens = self._post_form(_endpoints()["token"], {
                "refresh_token": refresh, "client_id": cid, "client_secret": secret, "grant_type": "refresh_token"
            })
            self._access = {"token": tokens["access_token"], "expires": time.time() + int(tokens.get("expires_in", 3000)) - 60}
            return self._access["token"]

    def _api(self, method, url, body=None, raw=None, content_type=None, as_json=True):
        headers = {"Authorization": "Bearer " + self._token()}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        elif raw is not None:
            data = raw
            headers["Content-Type"] = content_type
        return self._send(urllib.request.Request(url, data=data, method=method, headers=headers), as_json=as_json)

    def _upload(self, metadata, content, mime):
        boundary = "oe" + secrets.token_hex(12)
        body = (
            f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{json.dumps(metadata)}\r\n"
            f"--{boundary}\r\nContent-Type: {mime}\r\n\r\n"
        ).encode() + content + f"\r\n--{boundary}--".encode()
        return self._api("POST", _endpoints()["upload"] + "/files?uploadType=multipart&fields=id,webViewLink",
                         raw=body, content_type=f"multipart/related; boundary={boundary}")

    # ------------------------------------------------------------------ drive
    def _folder(self, name, parent):
        safe = name.replace("\\", "\\\\").replace("'", "\\'")
        q = f"name = '{safe}' and mimeType = 'application/vnd.google-apps.folder' and '{parent}' in parents and trashed = false"
        found = self._api("GET", _endpoints()["drive"] + "/files?" + urllib.parse.urlencode({"q": q, "fields": "files(id,webViewLink)", "spaces": "drive"}))
        if found.get("files"):
            return found["files"][0]
        return self._api("POST", _endpoints()["drive"] + "/files?fields=id,webViewLink",
                         body={"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent]})

    def _year_folders(self, data, year):
        years = data.setdefault("years", {})
        if year not in years:
            root = data["folders"]["root"]["id"]
            folder = self._folder(f"Tax Year {year}", root)
            years[year] = {
                "folder": folder,
                "quotes": self._folder("Quotes", folder["id"]),
                "invoices": self._folder("Invoices", folder["id"]),
                "receipts": self._folder("Receipts", folder["id"])
            }
        return years[year]

    def set_up(self):
        """Builds the business folders and the master sheet. Safe to run again."""
        with self._lock:
            data = self._load()
            root = self._folder(ROOT_FOLDER, "root")
            photos = self._folder("Photos", root["id"])
            data["folders"] = {
                "root": root,
                "finishedEvents": self._folder("Finished events", photos["id"]),
                "productPhotos": self._folder("Product photos", photos["id"])
            }
            year = uk_tax_year()
            yf = self._year_folders(data, year)
            if not data.get("sheet"):
                data["sheet"] = self._create_sheet(root["id"])
            sheet_url = data["sheet"]["webViewLink"]
            data["links"] = {
                "businessFolder": root["webViewLink"],
                "masterSheet": sheet_url,
                "moneyInOut": f"{sheet_url}#gid={MONEY_SHEET_ID}",
                "quotes": yf["quotes"]["webViewLink"],
                "invoices": yf["invoices"]["webViewLink"],
                "receipts": yf["receipts"]["webViewLink"],
                "productPhotos": data["folders"]["productPhotos"]["webViewLink"],
                "eventPhotos": data["folders"]["finishedEvents"]["webViewLink"],
                "taxYear": f"Tax Year {year}"
            }
            self._save(data)
            return data["links"]

    # ------------------------------------------------------------------ sheet
    def _create_sheet(self, parent):
        sheet = self._api("POST", _endpoints()["drive"] + "/files?fields=id,webViewLink",
                          body={"name": SHEET_NAME, "mimeType": "application/vnd.google-apps.spreadsheet", "parents": [parent]})
        sid = sheet["id"]

        def header(sheet_id, count, colour):
            return {"repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": count},
                "cell": {"userEnteredFormat": {"backgroundColor": colour, "textFormat": {"bold": True, "foregroundColor": PAPER}}},
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }}

        def number_format(sheet_id, col, pattern, kind="CURRENCY"):
            return {"repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": col - 1, "endColumnIndex": col},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": kind, "pattern": pattern}}},
                "fields": "userEnteredFormat.numberFormat"
            }}

        def dropdown(sheet_id, col, values):
            return {"setDataValidation": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": col - 1, "endColumnIndex": col},
                "rule": {"condition": {"type": "ONE_OF_LIST", "values": [{"userEnteredValue": v} for v in values]}, "showCustomUi": True, "strict": False}
            }}

        frozen = {"gridProperties": {"frozenRowCount": 1}}
        self._api("POST", f"{_endpoints()['sheets']}/spreadsheets/{sid}:batchUpdate", body={"requests": [
            {"updateSheetProperties": {"properties": {"sheetId": ORDERS_SHEET_ID, "title": ORDERS_TAB, "tabColor": SAGE, **frozen},
                                       "fields": "title,tabColor,gridProperties.frozenRowCount"}},
            {"addSheet": {"properties": {"sheetId": MONEY_SHEET_ID, "title": MONEY_TAB, "tabColor": OLIVE, **frozen}}},
            {"addSheet": {"properties": {"sheetId": DOCS_SHEET_ID, "title": DOCS_TAB, "tabColor": OLIVE, **frozen}}},
            header(ORDERS_SHEET_ID, len(ORDER_COLUMNS), SAGE),
            header(MONEY_SHEET_ID, len(MONEY_COLUMNS), OLIVE),
            header(DOCS_SHEET_ID, len(DOCS_COLUMNS), OLIVE),
            dropdown(ORDERS_SHEET_ID, COL["Status"], STATUSES),
            dropdown(MONEY_SHEET_ID, 2, ["In", "Out"]),
            dropdown(MONEY_SHEET_ID, 3, MONEY_CATEGORIES),
            number_format(ORDERS_SHEET_ID, COL["Phone"], "@", "TEXT"),
            *[number_format(ORDERS_SHEET_ID, COL[c], "£#,##0.00") for c in ("Total (£)", "Deposit paid (£)", "Outstanding (£)")],
            number_format(MONEY_SHEET_ID, 7, "£#,##0.00"),
            number_format(DOCS_SHEET_ID, 5, "£#,##0.00")
        ]})
        self._api("POST", f"{_endpoints()['sheets']}/spreadsheets/{sid}/values:batchUpdate", body={
            "valueInputOption": "RAW",
            "data": [
                {"range": f"'{ORDERS_TAB}'!A1", "values": [ORDER_COLUMNS]},
                {"range": f"'{MONEY_TAB}'!A1", "values": [MONEY_COLUMNS]},
                {"range": f"'{DOCS_TAB}'!A1", "values": [DOCS_COLUMNS]}
            ]
        })
        return sheet

    def _sheet_id(self):
        data = self._load()
        if not data.get("sheet"):
            raise GoogleError("Google Drive isn't set up yet.")
        return data["sheet"]["id"]

    def _append(self, tab, rows):
        sid = self._sheet_id()
        rng = urllib.parse.quote(f"'{tab}'!A1")
        self._api("POST", f"{_endpoints()['sheets']}/spreadsheets/{sid}/values/{rng}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
                  body={"values": rows})

    def _column(self, tab, letter):
        sid = self._sheet_id()
        rng = urllib.parse.quote(f"'{tab}'!{letter}:{letter}")
        return [r[0] if r else "" for r in self._api("GET", f"{_endpoints()['sheets']}/spreadsheets/{sid}/values/{rng}").get("values", [])]

    def _rows_for(self, order_id):
        return [i + 1 for i, v in enumerate(self._column(ORDERS_TAB, "B")) if str(v) == str(order_id) and i > 0]

    def _set_cells(self, cells):
        sid = self._sheet_id()
        self._api("POST", f"{_endpoints()['sheets']}/spreadsheets/{sid}/values:batchUpdate", body={
            "valueInputOption": "USER_ENTERED",
            "data": [{"range": f"'{ORDERS_TAB}'!{_letter(col)}{row}", "values": [[value]]} for row, col, value in cells]
        })

    # ------------------------------------------------------------------ jobs
    def add_order(self, order):
        self._append(ORDERS_TAB, [order_row(order)])

    def add_missing_orders(self, orders):
        """Copies orders made before Google was connected into the master sheet."""
        have = set(self._column(ORDERS_TAB, "B"))
        rows = [order_row(o) for o in reversed(orders) if o.get("id") and o["id"] not in have]
        if rows:
            self._append(ORDERS_TAB, rows)
        return len(rows)

    def update_order(self, order):
        rows = self._rows_for(order.get("id"))
        if not rows:
            self.add_order(order)
            return
        cfg = order.get("configuration") or {}
        total = _num(cfg.get("quotedPrice") or cfg.get("estimatedTotal"))
        paid = _num(cfg.get("depositPaid")) + _num(cfg.get("balancePaid"))
        self._set_cells([(rows[0], COL["Status"], order.get("status", "New Enquiry")),
                         (rows[0], COL["Total (£)"], total),
                         (rows[0], COL["Deposit paid (£)"], _num(cfg.get("depositPaid"))),
                         (rows[0], COL["Outstanding (£)"], max(0, total - paid))])
        self._record_payments(order)

    def _record_payments(self, order):
        cfg = order.get("configuration") or {}
        logged = set()
        sid = self._sheet_id()
        rng = urllib.parse.quote(f"'{MONEY_TAB}'!D:F")
        for r in self._api("GET", f"{_endpoints()['sheets']}/spreadsheets/{sid}/values/{rng}").get("values", []):
            if len(r) >= 3:
                logged.add((r[0], r[2]))
        name = clean_cell((order.get("client") or {}).get("name", ""))
        today = datetime.now().strftime("%d/%m/%Y")
        rows = []
        for what, amount in (("Deposit", _num(cfg.get("depositPaid"))), ("Balance", _num(cfg.get("balancePaid")))):
            if amount > 0 and (order.get("id"), what) not in logged:
                rows.append([today, "In", "Sales", order.get("id"), name, what, amount, "Bank transfer", ""])
        if rows:
            self._append(MONEY_TAB, rows)

    def forget_customer(self, order_id, keep_for_tax):
        rows = self._rows_for(order_id)
        if not rows:
            return 0
        if keep_for_tax:
            # The invoice stays on record: keep the name and date, wipe how to reach them
            self._set_cells([(r, COL[c], "") for r in rows for c in ("Phone", "WhatsApp", "Email", "Venue or area", "Notes")])
        else:
            sid = self._sheet_id()
            self._api("POST", f"{_endpoints()['sheets']}/spreadsheets/{sid}:batchUpdate", body={"requests": [
                {"deleteDimension": {"range": {"sheetId": ORDERS_SHEET_ID, "dimension": "ROWS", "startIndex": r - 1, "endIndex": r}}}
                for r in sorted(rows, reverse=True)
            ]})
        return len(rows)

    def file_document(self, order, doc, html_text):
        """The quote or invoice as a PDF in Tax Year …/Quotes or Invoices, linked on the sheet."""
        is_invoice = doc.get("kind") == "invoice"
        match = re.match(r"^ID_(\d{4})/(\d{2})_", str(order.get("id", "")))
        year = f"{match.group(1)}-{match.group(2)}" if match else uk_tax_year()
        with self._lock:
            data = self._load()
            folder = self._year_folders(data, year)["invoices" if is_invoice else "quotes"]
            self._save(data)
        filename = doc["number"].replace("/", "-") + ".pdf"
        # Google turns the page into a Doc, then the Doc into a PDF; the Doc is thrown away
        draft = self._upload({"name": filename[:-4], "mimeType": "application/vnd.google-apps.document"}, html_text.encode("utf-8"), "text/html")
        try:
            pdf = self._api("GET", f"{_endpoints()['drive']}/files/{draft['id']}/export?mimeType=application%2Fpdf", as_json=False)
        finally:
            try:
                self._api("DELETE", f"{_endpoints()['drive']}/files/{draft['id']}", as_json=False)
            except GoogleError:
                pass
        saved = self._upload({"name": filename, "parents": [folder["id"]]}, pdf, "application/pdf")
        url = saved["webViewLink"]
        link = f'=HYPERLINK("{url}", "{doc["number"]}")'
        rows = self._rows_for(order.get("id"))
        if rows:
            self._set_cells([(rows[0], COL["Invoice" if is_invoice else "Quote"], link)])
        self._append(DOCS_TAB, [[datetime.now().strftime("%d/%m/%Y"), order.get("id"), doc["number"],
                                 "Invoice" if is_invoice else "Quote", _num(doc.get("total")), f'=HYPERLINK("{url}", "Open PDF")']])
        return {"ok": True, "fileId": saved["id"], "fileUrl": url}


def _num(v):
    try:
        return round(float(v or 0), 2)
    except (TypeError, ValueError):
        return 0


def _letter(col):
    out = ""
    while col:
        col, rem = divmod(col - 1, 26)
        out = chr(65 + rem) + out
    return out


def chosen_items(cfg):
    parts = [cfg.get("backdrop"), cfg.get("balloonLayout"), cfg.get("digitsOrLetters")] + list(cfg.get("extras") or [])
    return ", ".join(p for p in parts if p and p != "None")


def personalisation(client, cfg):
    parts = []
    board = cfg.get("boardCustomization") or {}
    if board.get("text"):
        parts.append(f'Board: "{board["text"]}"' + (f' on {board["color"]}' if board.get("color") else ""))
    if cfg.get("neonPhrase"):
        parts.append(f'Neon: "{cfg["neonPhrase"]}"')
    if cfg.get("bubbleText"):
        parts.append(f'Bubble: "{cfg["bubbleText"]}"')
    if cfg.get("cutoutTheme"):
        parts.append(f'Cut-outs: {cfg["cutoutTheme"]}')
    if cfg.get("digitText"):
        parts.append(f'Numbers: {cfg["digitText"]}')
    return "; ".join(parts)


def order_row(order):
    """The order as one row of the master sheet, in ORDER_COLUMNS order."""
    c = order.get("client") or {}
    cfg = order.get("configuration") or {}
    phone = str(c.get("phone") or "")
    digits = re.sub(r"[^0-9]", "", phone)
    wa = ("44" + digits[1:]) if digits.startswith("0") else digits
    name = clean_cell(c.get("name", ""))
    total = _num(cfg.get("quotedPrice") or cfg.get("estimatedTotal"))
    deposit = _num(cfg.get("depositPaid"))
    paid = deposit + _num(cfg.get("balancePaid"))
    venue = c.get("venueName") or ""
    place = ", ".join(p for p in (venue, c.get("postcode") or c.get("area") or "") if p)
    created = str(order.get("createdAt") or "")[:10]
    received = f"{created[8:10]}/{created[5:7]}/{created[:4]}" if len(created) == 10 else ""
    return [
        received,
        clean_cell(order.get("id", "")),
        order.get("status", "New Enquiry"),
        name,
        clean_cell(phone),
        f'=HYPERLINK("https://wa.me/{wa}", "Message {name.replace(chr(34), "")}")' if wa else "",
        clean_cell(c.get("email", "")),
        clean_cell(c.get("eventDate", "")),
        clean_cell(c.get("occasion", "")),
        clean_cell(place),
        clean_cell(", ".join(cfg.get("palette") or [])),
        clean_cell(chosen_items(cfg)),
        clean_cell(personalisation(c, cfg)),
        total,
        deposit,
        max(0, total - paid),
        "",
        "",
        clean_cell(c.get("notes", ""))
    ]


# ---------------------------------------------------------------------- gmail
def _b64url(raw):
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64url(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _plain_text(payload):
    """The readable text of a Gmail message, preferring the plain version."""
    if not payload:
        return ""
    mime = payload.get("mimeType", "")
    data = (payload.get("body") or {}).get("data")
    if mime == "text/plain" and data:
        return _unb64url(data).decode("utf-8", errors="replace")
    parts = payload.get("parts") or []
    for part in parts:
        if part.get("mimeType") == "text/plain":
            text = _plain_text(part)
            if text:
                return text
    for part in parts:
        text = _plain_text(part)
        if text:
            return text
    if mime == "text/html" and data:
        markup = _unb64url(data).decode("utf-8", errors="replace")
        markup = re.sub(r"(?is)<(script|style).*?</\1>", "", markup)
        markup = re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", markup)
        return html_lib.unescape(re.sub(r"<[^>]+>", "", markup))
    return ""


def _without_quoted_reply(text):
    """Keeps what the person wrote, not the earlier emails quoted underneath."""
    out = []
    for line in text.replace("\r\n", "\n").split("\n"):
        if re.match(r"^On .{4,120}wrote:\s*$", line.strip()) or line.strip().startswith("-----Original Message"):
            break
        if line.startswith(">"):
            continue
        out.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def _address(header_value):
    found = re.search(r"[\w.+'-]+@[\w-]+(\.[\w-]+)+", header_value or "")
    return found.group(0).lower() if found else ""


def _gmail_methods():
    def send_email(self, to, subject, body, from_name="", attachments=None, thread_id=None):
        data = self._load()
        msg = EmailMessage()
        msg["To"] = to
        sender = data.get("email", "")
        if sender:
            msg["From"] = formataddr((from_name, sender)) if from_name else sender
        msg["Subject"] = subject
        msg.set_content(body)
        for filename, content in attachments or []:
            msg.add_attachment(content, maintype="application", subtype="pdf", filename=filename)
        payload = {"raw": _b64url(msg.as_bytes())}
        if thread_id:
            payload["threadId"] = thread_id
        sent = self._api("POST", _endpoints()["gmail"] + "/users/me/messages/send", body=payload)
        return {"id": sent.get("id"), "threadId": sent.get("threadId")}

    def mail_with(self, address, limit=25):
        """Emails to and from one customer, newest first, as plain text."""
        address = (address or "").strip().lower()
        if not re.match(r"^[^@\s\"]+@[^@\s\"]+$", address):
            return []
        q = f"(from:{address} OR to:{address}) -in:spam -in:trash"
        listing = self._api("GET", _endpoints()["gmail"] + "/users/me/messages?" + urllib.parse.urlencode({"q": q, "maxResults": limit}))
        mine = self._load().get("email", "").lower()
        found = []
        for ref in listing.get("messages") or []:
            m = self._api("GET", f"{_endpoints()['gmail']}/users/me/messages/{ref['id']}?format=full")
            headers = {h["name"].lower(): h["value"] for h in (m.get("payload") or {}).get("headers", [])}
            sender = _address(headers.get("from"))
            try:
                at = parsedate_to_datetime(headers.get("date")).astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                at = datetime.fromtimestamp(int(m.get("internalDate", "0")) / 1000, timezone.utc).isoformat()
            found.append({
                "id": m.get("id"),
                "threadId": m.get("threadId"),
                "dir": "in" if sender == address or (mine and sender != mine) else "out",
                "at": at,
                "subject": headers.get("subject", "")[:200],
                "text": _without_quoted_reply(_plain_text(m.get("payload")))[:4000] or m.get("snippet", "")[:400]
            })
        return found

    def document_pdf(self, doc, html_text):
        """The PDF to attach: the copy filed in Drive, or a fresh one made the same way."""
        if doc.get("driveFileId"):
            return self._api("GET", f"{_endpoints()['drive']}/files/{doc['driveFileId']}?alt=media", as_json=False)
        draft = self._upload({"name": doc["number"], "mimeType": "application/vnd.google-apps.document"}, html_text.encode("utf-8"), "text/html")
        try:
            return self._api("GET", f"{_endpoints()['drive']}/files/{draft['id']}/export?mimeType=application%2Fpdf", as_json=False)
        finally:
            try:
                self._api("DELETE", f"{_endpoints()['drive']}/files/{draft['id']}", as_json=False)
            except GoogleError:
                pass

    GoogleDrive.send_email = send_email
    GoogleDrive.mail_with = mail_with
    GoogleDrive.document_pdf = document_pdf


_gmail_methods()
