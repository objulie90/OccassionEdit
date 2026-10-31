# THE Occasion Edit — Workshop Stock Numbering & SKU Specification

**Repository:** `https://github.com/objulie90/OccassionEdit.git`  
**Application:** THE Occasion Edit (Boutique Balloon Styling & Event Prop Hire, Bottesford, Leicestershire)  
**Catalog File:** [`src/data/catalogData.js`](./src/data/catalogData.js)  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Inventory Taxonomy

To prevent inventory confusion, pricing mismatches, and stock reconciliation errors across the boutique storefront, Google Sheets, and workshop packing sheets, **THE Occasion Edit** uses a standardized alphanumeric **Stock Keeping Unit (SKU)** taxonomy.

Every physical prop, backdrop board, sequin shimmer wall, balloon garland, number sculpture, and add-on prop carries a structured SKU following this syntax:

```text
[DEPARTMENT]-[DESCRIPTOR]-[SIZE/SPEC]
```

### Key Principles
1. **Unambiguous Identifiers:** Zero reliance on generic terms like *"Wall"* or *"Garland"*. Every SKU specifies the exact physical prop in Laura's studio.
2. **Direct Financial Mapping:** Every order line item carries its exact SKU and billed price (e.g. `GARL-ARCH-FULL · £145.00` or `WALL-GLD-Lg · £180.00`). No ambiguous "From £..." pricing appears on production orders or invoices.
3. **Hire vs. Keep Segregation:** SKUs clearly denote whether an asset is a hire frame (which Laura collects next morning) or a balloon sculpture (yours to keep).
4. **Component Pull List Ready:** Structural SKUs (like `GARL-ARCH-FULL`) map directly into the mathematical balloon recipe engine to generate the exact packing list of 5", 11", and 18" trade balloons.

---

## 2. Department Prefixes & Classification Table

| Department Prefix | Department Name | Nature | Collection / Return Policy |
|:---|:---|:---|:---|
| **`BRD-`** | Backdrops & Arched Boards | Hire Prop | Collected by Laura next morning |
| **`WALL-`** | Sequin Shimmer Walls | Hire Prop | Collected by Laura next morning |
| **`HOOP-`** | Metal Hoop Frames | Hire Prop | Collected by Laura next morning |
| **`ESL-`** | Easels & Welcome Frames | Hire Prop | Collected by Laura next morning |
| **`GARL-`** | Organic Balloon Garlands & Arches | Decorator Item | Yours to keep (or disposed by venue) |
| **`STK-`** | Freestanding Number Stacks | Decorator Item | Yours to keep (air-filled table/floor displays) |
| **`HEL-`** | Giant Helium Numbers & Bouquets | Decorator Item | Yours to keep (weighted with ribbons) |
| **`PROP-`** | Finishing Props, Neons & Plinths | Hire Prop | Collected by Laura next morning |
| **`GIFT-`** | Keepsake Gift Balloons | Decorator Item | Yours to keep (boxed or ribboned) |

---

## 3. Standard Suffix Conventions

### Size & Dimension Tiers
* **`-Sm`** = Small / Compact (e.g. `6ft × 6ft` shimmer wall or compact hoop)
* **`-Md`** = Medium / Standard (e.g. `7ft` arched backdrop board or standard hoop)
* **`-Lg`** = Large / Statement (e.g. `8ft × 8ft` large shimmer wall)

### Digit Counts (Numbers & Helium)
* **`-1DIG`** = Single Digit (e.g. `"7"` or `"1"`)
* **`-2DIG`** = Double Digit (e.g. `"30"` or `"21"`)

### Finish & Colour Descriptors
* **`-GLD`** = Metallic Gold
* **`-SLV`** = Metallic Silver
* **`-BLK`** = Obsidian Black
* **`-PNK`** = Blush Pink
* **`-WOD`** = Natural Birch / Painted Wood
* **`-WHT`** = Matte White

---

## 4. Master SKU Catalog Specification

### 4.1 Department 1: Backdrops, Walls & Frames

| SKU Code | Full Item Title | Tier | Billed Price (£) | Hire / Keep | Physical Description & Studio Notes |
|:---|:---|:---|:---|:---|:---|
| **`BRD-WOD-Md`** | Personalised Wooden Arch Backdrop Board | Fancy | £155.00 (with garland) | Hire Prop | 7ft painted wooden arch board. Client chooses paint colour (*Warm Ivory, Sage, Blush, Taupe, White, Black*) and custom vinyl text (*Gold, White, Black, Rose Gold*). |
| **`WALL-GLD-Sm`** | Gold Sequin Shimmer Wall (Compact) | Luxury | £150.00 (with garland) | Hire Prop | 6ft × 6ft reflective gold square shimmer sequin panels on heavy-duty aluminium frame. |
| **`WALL-GLD-Lg`** | Gold Sequin Shimmer Wall (Statement) | Luxury | £180.00 (with garland) | Hire Prop | 8ft × 8ft reflective gold square shimmer sequin panels on heavy-duty aluminium frame. |
| **`WALL-SLV-Sm`** | Silver Sequin Shimmer Wall (Compact) | Luxury | £150.00 (with garland) | Hire Prop | 6ft × 6ft reflective mirror silver square shimmer sequin panels. |
| **`WALL-SLV-Lg`** | Silver Sequin Shimmer Wall (Statement) | Luxury | £180.00 (with garland) | Hire Prop | 8ft × 8ft reflective mirror silver square shimmer sequin panels. |
| **`WALL-BLK-Sm`** | Obsidian Black Shimmer Wall (Compact) | Luxury | £150.00 (with garland) | Hire Prop | 6ft × 6ft dramatic deep obsidian black reflective shimmer panels. |
| **`WALL-BLK-Lg`** | Obsidian Black Shimmer Wall (Statement) | Luxury | £180.00 (with garland) | Hire Prop | 8ft × 8ft dramatic deep obsidian black reflective shimmer panels. |
| **`WALL-PNK-Sm`** | Blush Pink Shimmer Wall (Compact) | Luxury | £150.00 (with garland) | Hire Prop | 6ft × 6ft soft blush iridescent shimmer sequin panels. |
| **`WALL-PNK-Lg`** | Blush Pink Shimmer Wall (Statement) | Luxury | £180.00 (with garland) | Hire Prop | 8ft × 8ft soft blush iridescent shimmer sequin panels. |
| **`HOOP-GLD-Md`** | Circular Gold Balloon Hoop Frame | Classic | £140.00 (with garland) | Hire Prop | 2-metre circular gold steel hoop frame on weighted footings. |
| **`ESL-SGN-WHT`** | Easel Welcome Sign & Mini Garland | Classic | £85.00 | Hire Prop | Solid wood easel with personalised white/black welcome board & 4ft mini organic garland. |

---

### 4.2 Department 2: Garlands & Arches

| SKU Code | Full Item Title | Tier | Billed Price (£) | Hire / Keep | Recipe / Pull List Specifications |
|:---|:---|:---|:---|:---|:---|
| **`GARL-SIDE-7FT`** | 7ft Freestanding Organic Balloon Garland | Classic | £105.00 | Yours to Keep | 7ft organic demi-arch. Recipe default: 60 balloons (18x 5", 34x 11", 8x 18"). Weighted base included. |
| **`GARL-CLUST-OPP`** | Top & Bottom Opposite Corner Clusters | Classic | £85.00 | Yours to Keep | Two separate organic clusters framing opposite corners. Recipe default: 50 balloons (15x 5", 28x 11", 7x 18"). |
| **`GARL-ARCH-FULL`** | Full Surround Statement Balloon Arch | Luxury | £145.00 solo / +£35 on wall | Yours to Keep | Full wrap-around balloon coverage. Recipe default: 120 balloons (35x 5", 65x 11", 20x 18"). |

---

### 4.3 Department 3: Numbers, Helium & Stacks

| SKU Code | Full Item Title | Tier | Billed Price (£) | Hire / Keep | Physical Description & Studio Notes |
|:---|:---|:---|:---|:---|:---|
| **`STK-NUM-BASIC`** | Freestanding Number Stack (Classic) | Classic | £35 (1-Dig) / £55 (2-Dig) | Yours to Keep | Air-filled 34" foil number(s) on organic 2-tier latex cluster base. Blue digit boxes `[ 3 ] [ 0 ]`. |
| **`STK-NUM-THEME`** | Freestanding Number Stack (Themed) | Fancy | £60 (1-Dig) / £80 (2-Dig) | Yours to Keep | Air-filled number stack featuring custom character/themed foil balloons & themed accents. |
| **`STK-NUM-LUX`** | Freestanding Number Stack (Luxury) | Luxury | £70 (1-Dig) / £90 (2-Dig) | Yours to Keep | Multi-level luxury sculpture with double-stuffed balloons, satin bows, mini orbs & florals. |
| **`HEL-NUM-1DIG`** | Helium Foil Number (Single) + 2 Clusters | Classic | £36.00 | Yours to Keep | Single giant 34" helium foil number + 2 matching 3-balloon weighted latex floor clusters. |
| **`HEL-NUM-2DIG`** | Helium Foil Numbers (Pair) + 2 Clusters | Classic | £52.00 | Yours to Keep | Pair of giant 34" helium foil numbers + 2 matching 3-balloon weighted latex floor clusters. |
| **`HEL-BOUQUET`** | Luxury Helium Table/Floor Bouquets | Luxury | From £70.00 | Yours to Keep | Multi-tiered floating bouquets for entrance dressing or table focal points. |
| **`GIFT-BUBBLE`** | Personalised Clear Deco Bubble Balloon | Classic | £35.00 | Yours to Keep | 24" stretchy clear deco bubble filled with mini balloons, ribbon tail, and custom script text. |

---

### 4.4 Department 4: Finishing Props & Hire Extras

| SKU Code | Full Item Title | Tier | Billed Price (£) | Hire / Keep | Physical Description & Studio Notes |
|:---|:---|:---|:---|:---|:---|
| **`PROP-NEON-HBD`** | LED Neon Script Sign ("Happy Birthday") | Fancy | £35.00 Hire | Hire Prop | Warm white glowing LED neon script mounted on clear acrylic with 5m transparent cable & dimmer. |
| **`PROP-FLORAL-SP`** | Add-On Faux Floral & Pampas Sprays | Fancy | £36.00 Hire | Hire Prop | High-end faux florals, silk roses, and dried pampas grass wired into the balloon garland. |
| **`PROP-BABY-BOX`** | Baby Shower BABY Blocks (Set of 4) | Classic | £40.00 Hire | Hire Prop | 4 white wooden cube display boxes with clear acrylic sides filled with palette mini balloons. |
| **`PROP-PLINTH-WH`** | White Cylinder Cake Display Plinth | Classic | £60.00 Hire | Hire Prop | High-gloss white cylindrical acrylic cake plinth with matching organic balloon collar. |
| **`PROP-CUTOUT-WD`** | Themed Character Wooden Cut-Outs | Fancy | £36.00 Hire | Hire Prop | Custom freestanding character or motif board cut-outs matching the celebration theme. |
| **`PROP-TABLE-CTR`** | Bespoke Balloon Table Centerpieces | Classic | £35.00 | Yours to Keep | Mini organic table arrangements on weighted base for guest tables. |

---

## 5. Component Balloon Recipe & Pull List Specification

For garlands and arches (e.g. `GARL-ARCH-FULL`), the SKU decomposes into a mathematical bill of materials based on **Size Codes**:

```text
[SIZE-CODE]-[COLOUR-CODE]
```

### 5.1 Size Codes
* **`S`** = 5-inch miniature detail balloon (latex)
* **`M`** = 11-inch / 12-inch body balloon (latex)
* **`L`** = 18-inch / 24-inch statement balloon (latex)

### 5.2 Mathematical Integer Partitioning (Largest Remainder Method)
When Laura selects a garland containing $X_{\text{total}}$ balloons across $K$ chosen palette shades:
1. Balloons are partitioned across sizes according to ratios $R_S, R_M, R_L$ (defaulting to 30% Small, 55% Medium, 15% Large).
2. Each size count is divided fairly across the $K$ colours using the **Largest Remainder Method (Hamilton-Hare Rule)** to ensure integer balloon counts with **zero fractional balloons**:
   $$\sum_{k=1}^K c_{k, \text{size}} = X_{\text{size}}$$
3. **Studio Loss Buffer:** A selectable **+8% buffer** is calculated to account for transit pops, inflation testing, and studio spares.
4. **Wholesale Packing:** Counts are converted into standard trade bag requirements:
   $$\text{Bags Required} = \left\lceil \frac{Count \times 1.08}{50} \right\rceil$$
   *(Standard 50-count decorator trade bags).*

---

## 6. Order Dossier & Invoice Depiction

In the **Production Order Dossier** (`MasterOrdersDashboard`) and Google Sheet Tab 1:
1. Every order line item prints its exact **SKU Code** alongside its plain English title.
2. Prices are strictly the exact billed amount (e.g. `£140.00`, `£90.00`, `£52.00`).
3. Personalised details are appended to the SKU:
   * `BRD-WOD-Md [Warm Ivory | Gold Vinyl "Welcome to Sophie's 30th"]`
   * `PROP-NEON-HBD ["Happy Birthday"]`
   * `GIFT-BUBBLE ["Sophie is 30"]`
   * `STK-NUM-BASIC [ 3 ] [ 0 ]`
