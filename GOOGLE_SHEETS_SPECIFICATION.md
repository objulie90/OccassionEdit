# THE Occasion Edit — Google Sheets & Cloud Drive Architecture Specification

**Repository:** `https://github.com/objulie90/OccassionEdit.git`  
**Application:** THE Occasion Edit (Boutique Balloon Styling & Event Prop Hire, Bottesford, Leicestershire)  
**Script File:** [`GoogleAppsScript.gs`](./GoogleAppsScript.gs)  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Purpose

The operational backend of **THE Occasion Edit** is powered by a seamless, zero-cost two-way synchronization bridge between the storefront web app (`server.py` + `src/standalone.jsx`) and a single Google Sheets workbook: **"THE Occasion Edit — Studio Master Sheet"**.

### Why Google Sheets for Laura?
1. **Zero High-Maintenance Infrastructure:** Laura does not need database administrators, AWS billing accounts, or complicated OAuth credentials. She uses Google Sheets on her iPhone, iPad, or MacBook.
2. **No Google Cloud API Keys or Quotas:** Connected via a lightweight Google Apps Script Web App (`GoogleAppsScript.gs`) deployed under Laura's personal or Google Workspace account in 60 seconds.
3. **Familiarity & Reliability:** Laura can view upcoming bookings in standard spreadsheet cells, mark deposits as received, update stock toggles with simple checkboxes, and view automatically filed PDF quotes and invoices stored directly in her Google Drive.

---

## 2. 60-Second Workbook Setup & Deployment Guide

1. Create a new Google Sheet in Google Drive and name it:  
   **`THE Occasion Edit — Studio Master Sheet`**
2. In the Google Sheet top menu, navigate to:  
   **`Extensions` > `Apps Script`**
3. Delete any default code in `Code.gs`, copy the entire contents of [`GoogleAppsScript.gs`](./GoogleAppsScript.gs), and paste it into the editor. Click **Save (💾)**.
4. In the top toolbar function dropdown, select **`setupSheetTabs`** and click **Run (▶)**.
   * *Google will request permission once.* Click **Review permissions** > **Advanced** > **Go to Untitled project (unsafe)** > **Allow**.
   * The script automatically generates all 4 tabs, headers, styling, dropdown validation rules, and checkboxes in 5 seconds.
   * View the **Execution log** at the bottom of the screen to copy your unique **`ADMIN_SYNC_SECRET`**.
5. Click **Deploy** > **New deployment**:
   * **Select type (⚙️):** `Web app`
   * **Description:** `THE Occasion Edit Sync Bridge v2.0`
   * **Execute as:** `Me (your-email@gmail.com)`
   * **Who has access:** `Anyone`
   * Click **Deploy** and copy the resulting **Web App URL**.
6. Paste the **Web App URL** and **`ADMIN_SYNC_SECRET`** into **Studio OS > Settings (Tab 4)** on the website.

---

## 3. Complete 4-Tab Workbook Schema & Data Types

The workbook contains 4 standardized tabs, mirrored 1-to-1 in the web application's state and local JSON storage (`data/site-data.json` and `data/quotes.json`):

### Tab 1: `Enquiries & Orders`
Houses every client quote, wedding enquiry, and confirmed event booking.

| Col | Header Name | Data Type | Notes & Data Validation Rules |
|:---|:---|:---|:---|
| **A** | **Timestamp** | Date / Time | `YYYY-MM-DD HH:mm:ss` (Submission timestamp) |
| **B** | **Order ID** | String (Identifier) | Format: `Order_2025/26_101` or `OE-1730419200000` |
| **C** | **Status** | Dropdown | `New Enquiry` (Yellow), `Deposit Paid` (Blue), `Confirmed` (Green), `Completed` (Grey), `Cancelled` (Red) |
| **D** | **Client Name** | String | Customer full name |
| **E** | **Phone Number** | String (Tel) | Sanitized UK mobile number (e.g. `07891 234567`) |
| **F** | **WhatsApp Link** | Formula | `=HYPERLINK("https://wa.me/44" & RIGHT(SUBSTITUTE(E2," ",""), 10), "💬 WhatsApp Client")` |
| **G** | **Email Address** | String (Email) | Customer contact email |
| **H** | **Event Date** | Date | `DD/MM/YYYY` |
| **I** | **Access / Setup Time**| String | Venue arrival window (e.g. `10:30 AM arrival for 1:00 PM party`) |
| **J** | **Venue Name & Setting**| String | E.g. `Vale of Belvoir Country Hotel · Indoor Ballroom` |
| **K** | **Venue Postcode** | String | Validated UK postcode (e.g. `NG13 8EB`) |
| **L** | **Chosen Palette** | String | E.g. `01. Signature Sage & Champagne (Sage, Pearl, Gold, Taupe, Blush)` |
| **M** | **Backdrop & Finish** | String | E.g. `Personalised Wooden Arch Board [Warm Ivory Finish, Gold Vinyl "Welcome to Sophie's 30th"]` |
| **N** | **Balloon Garland / Arch**| String | E.g. `GARL-ARCH-FULL · Full Surround Statement Balloon Arch` |
| **O** | **Numbers & Extras** | String | E.g. `Foil Numbers [ 3 ] [ 0 ], LED Neon Sign ["Happy Birthday"], Personalised Bubble ["Sophie is 30"]` |
| **P** | **Order Subtotal (£)** | Currency (`£`) | Billed line items subtotal before promotions |
| **Q** | **Delivery Fee (£)** | Currency (`£`) | Calculated via Bottesford mileage checker (£0, £20, £35) |
| **R** | **Estimated Total (£)**| Currency (`£`) | Net final billed balance |
| **S** | **Deposit Paid (£)** | Currency (`£`) | Laura inputs received deposit amount (e.g. `£50.00`) |
| **T** | **Balance Due (£)** | Formula | `=R2-S2` (Automatically calculates remaining balance) |
| **U** | **Quote PDF Link** | Formula | Clickable Google Drive link `=HYPERLINK("...", "📄 View Quote")` |
| **V** | **Invoice PDF Link** | Formula | Clickable Google Drive link `=HYPERLINK("...", "🧾 View Invoice")` |
| **W** | **Balloon Pull List** | String (Recipe) | Fair-integer breakdown: e.g. `120 Balloons (42x 5", 60x 11", 18x 18") + 8% buffer` |
| **X** | **Private Notes** | String | Client notes, access codes, gate pins, or parking instructions |

---

### Tab 2: `Prices, Stock & Ribbons`
Controls all 19 catalog items, standard packages, props, hire fees, and live stock statuses.

| Col | Header Name | Data Type | Notes & Purpose |
|:---|:---|:---|:---|
| **A** | **Item ID** | String | Locked identifier (e.g. `wooden-board`, `gold-shimmer`, `garland-full`) |
| **B** | **Workshop SKU** | String | Physical workshop inventory code (e.g. `BRD-WOD-Md`, `WALL-GLD-Lg`) |
| **C** | **Department** | Dropdown | `Backdrops & Walls`, `Garlands & Arches`, `Numbers & Helium`, `Finishing Extras` |
| **D** | **Item Name** | String | Customer-facing display title |
| **E** | **Base Price (£)** | Currency (`£`) | Standard billed price (or package starting price) |
| **F** | **Large Upgrade (£)** | Currency (`£`) | Surcharge for large tier (e.g. large shimmer wall upgrade) |
| **G** | **Hire or Keep?** | Dropdown | `Hire Prop` (collected next morning) or `Yours to Keep` |
| **H** | **In Stock?** | Checkbox (`TRUE`/`FALSE`) | Unchecking instantly marks item as "Unavailable" across the website |
| **I** | **Corner Banner Text** | String | Promotional ribbon text (e.g. `10% OFF`, `SAVE £20`, `MOST POPULAR`) |
| **J** | **Discount Type** | Dropdown | `none`, `percent` (`%`), `fixed` (`£`) |
| **K** | **Discount Value** | Number | E.g. `10` (for 10% off) or `20` (for £20 off) |
| **L** | **Ribbon Colour** | Dropdown | `gold`, `sage`, `blush`, `coral`, `espresso` |

---

### Tab 3: `Balloon Colours & Palettes`
Standard decorator shades (Qualatex / Sempertex / Kalisan decorators) and the 5 Curated Signature Palettes.

* **Section A (Columns A–F): Decorator Balloon Shades**
  * `Colour ID`: Unique slug (e.g. `sage-green`, `chrome-gold`, `pearl-ivory`)
  * `Trade Code`: Wholesaler trade reference (e.g. `#104`, `#201`)
  * `Category`: `Classics`, `Earthy & Neutrals`, `Chromes & Metallics`, `Pearls & Satins`
  * `Colour Name`: Clean decorator label
  * `Hex Code`: Display swatch hex code (e.g. `#7A8C68`)
  * `In Stock?`: Checkbox (`TRUE`/`FALSE`)
* **Section B (Columns H–N): Our 5 Signature Palettes**
  * Defines the 5 curated blends:
    1. *01. Signature Sage & Champagne*
    2. *02. Soft Blush & Pearl Romance*
    3. *03. Teddy & Warm Neutrals*
    4. *04. Pastel Sky & Lemon Edit*
    5. *05. After-Dark Black & Gold Luxe*
  * Uses data validation dropdowns mapped to Column D so Laura can never mistype a balloon colour name.

---

### Tab 4: `Offers, Lookbook & Settings`
Promotional codes, delivery radiuses, and system revision tracking.

* **Section A: Active Promo Codes** (Code, Discount %, Active Checkbox).
* **Section B: Bottesford Delivery Zones** (Zone 1 Local 10 mi, Zone 2 Standard 20 mi, Zone 3 Extended 30 mi).
* **Section C: Revision Checksum (Cell Z1)**:
  * Contains an automatic millisecond timestamp updated via `onEdit(e)`. Whenever Laura edits any price or stock toggle in Google Sheets, the website's background sync detects `Z1 > lastSyncTime` and automatically pulls the newest prices without manual restarts!

---

## 4. Google Drive PDF Archiving Pipeline

When Laura or the system generates an official quote or invoice:
1. `GoogleAppsScript.gs` creates or locates the fiscal year directory:  
   **`Google Drive / THE Occasion Edit / Invoices / Tax Year 2025-26/`**  
   **`Google Drive / THE Occasion Edit / Quotes / Tax Year 2025-26/`**
2. The generated PDF is saved as:  
   `INV-2025-26-101-Sophie-Turner.pdf` or `QUOTE-2025-26-101-Sophie-Turner.pdf`
3. The script automatically matches the Order ID in Tab 1, finds the row, and inserts the direct hyperlink formula:  
   `=HYPERLINK("https://drive.google.com/file/d/.../view", "🧾 INV-2025/26-101")` into Column U/V.

---

## 5. Security & Data Integrity Protections

1. **OWASP Formula Injection Defense (`sanitizeCell`)**:  
   If a malicious user submits a name or note starting with `=`, `+`, `-`, `@`, `\t`, or `\r`, `sanitizeCell()` automatically prefixes the cell with a single quote `'` to prevent arbitrary spreadsheet formula execution.
2. **Constant-Time Secret Verification (`constantTimeEquals`)**:  
   Prevents timing-attack probing of Laura's `ADMIN_SYNC_SECRET`.
3. **UK GDPR Right to Erasure (`delete_booking_gdpr`)**:  
   Triggering a GDPR delete from the Studio OS orders table immediately removes the corresponding client row from Tab 1 and purges all PII.
4. **Least-Privilege Scoping (`@OnlyCurrentDoc`)**:  
   The Apps Script only has permission to read and write to the single active workbook. It does not possess broad account-level or drive-wide permissions.
