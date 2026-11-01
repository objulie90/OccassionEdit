/**
 * @OnlyCurrentDoc
 *
 * THE OCCASION EDIT — Studio Master Sheet & Two-Way Website Sync (GoogleAppsScript.gs)
 * ====================================================================================
 * Privacy & Permissions Design:
 *  - Uses @OnlyCurrentDoc so Google ONLY requests permission for this single spreadsheet.
 *  - Zero Gmail (MailApp) permissions required — Laura checks her spreadsheet or website
 *    backend whenever she chooses, with zero intrusive email pings.
 *  - doGet(e) NEVER reads Tab 1 ("Enquiries & Orders"). It only returns public catalog
 *    data from Tabs 2, 3, and 4 + the Z1 revision timestamp.
 *  - Privileged doPost(e) actions (sync_admin_save, update_booking_status,
 *    delete_booking_gdpr, pull_admin_bookings) require a constant-time verified
 *    ADMIN_SYNC_SECRET stored in PropertiesService.getScriptProperties().
 *
 * Quick Setup Instructions (60 Seconds):
 *  1. Open a new Google Sheet and name it: "THE Occasion Edit — Studio Master Sheet"
 *  2. Click Extensions > Apps Script, paste this entire file, and click Save (💾).
 *  3. Select `setupSheetTabs` in the top toolbar dropdown and click Run (▶).
 *     (Copy the ADMIN_SYNC_SECRET shown in the Execution Log).
 *  4. Click Deploy > New deployment > Select type: Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *     Click Deploy and copy your Web App URL into Studio Admin.
 */

var TAB_ENQUIRIES = 'Enquiries & Orders';
var TAB_PRICES    = 'Prices, Stock & Ribbons';
var TAB_PALETTES  = 'Balloon Colours & Palettes';
var TAB_SETTINGS  = 'Offers, Lookbook & Settings';

/**
 * OWASP Formula-Injection Sanitizer for user-supplied strings.
 * Prevents cells beginning with =, +, -, @, \t, \r from executing as spreadsheet formulas.
 */
function sanitizeCell(val) {
  if (val === null || val === undefined) return '';
  var str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks on ADMIN_SYNC_SECRET.
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return diff === 0;
}

/**
 * Verifies the ADMIN_SYNC_SECRET stored in ScriptProperties.
 */
function isValidAdminSecret(providedSecret) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('ADMIN_SYNC_SECRET') || '';
  if (!expected) return false;
  return constantTimeEquals(String(providedSecret || ''), expected);
}

/**
 * Automatic Simple Trigger: Updates the revision timestamp in Tab 4 cell Z1 whenever
 * Laura edits any cell directly in Google Sheets, preventing stale overwrites.
 */
function onEdit(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var settingsSheet = ss.getSheetByName(TAB_SETTINGS);
    if (settingsSheet) {
      settingsSheet.getRange('Z1').setValue(String(new Date().getTime()));
    }
  } catch (err) {
    // Ignore simple trigger errors
  }
}

/**
 * ONE-CLICK WORKBOOK BUILDER: Run this once from the Apps Script toolbar!
 * Creates, formats, colour-codes, and adds checkboxes & dropdowns to all 4 tabs.
 */
function setupSheetTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();

  // 1. Ensure ADMIN_SYNC_SECRET exists
  var secret = props.getProperty('ADMIN_SYNC_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('ADMIN_SYNC_SECRET', secret);
  }
  Logger.log('====================================================');
  Logger.log('YOUR STUDIO ADMIN_SYNC_SECRET (Paste into server.py / Studio Admin):');
  Logger.log(secret);
  Logger.log('====================================================');

  // ---------------------------------------------------------------------------
  // TAB 1: Enquiries & Orders (Sage Green #7A8C68 — Private Customer PII)
  // ---------------------------------------------------------------------------
  var s1 = getOrCreateSheet_(ss, TAB_ENQUIRIES, '#7A8C68');
  var h1 = [
    'Timestamp', 'Booking ID', 'Status', 'Client Name', 'Phone',
    'WhatsApp Click-to-Chat', 'Email', 'Event Date', 'Venue Postcode',
    'Chosen Palette', 'Backdrop', 'Garland / Balloons', 'Digits / Word',
    'Finishing Extras', 'Stock IDs', 'Workshop Pull List', 'Promo Code',
    'Quote PDF', 'Invoice PDF', 'Estimated Total (£)',
    'Deposit Paid (£)', 'Balance Due (£)', 'Client Notes', 'Studio Private Notes'
  ];
  styleHeaderRow_(s1, h1, '#5F6A49', '#FFFFFF');
  s1.setFrozenRows(1);
  // Format Phone (Col E) as Plain Text so leading UK '0' never disappears
  s1.getRange('E2:E500').setNumberFormat('@');
  // Format Currency columns (T, U, V)
  s1.getRange('T2:V500').setNumberFormat('£#,##0.00');
  // Add Status Dropdown Validation (Col C)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New Enquiry', 'Quoted', 'Deposit Paid', 'Booked', 'Completed', 'Cancelled'], true)
    .setAllowInvalid(false)
    .build();
  s1.getRange('C2:C500').setDataValidation(statusRule);

  // Initialize Drive Asset & PDF Document Folders
  ensureStudioDriveFolders_();

  // ---------------------------------------------------------------------------
  // TAB 2: Prices, Stock & Ribbons (Champagne Gold #C5A059)
  // ---------------------------------------------------------------------------
  var s2 = getOrCreateSheet_(ss, TAB_PRICES, '#C5A059');
  var h2 = [
    'Item ID (Locked)', 'Category', 'Item Name', 'Item Description',
    'Base / Small / 1-Digit Price (£)', 'Large / 2-Digit / Package Price (£)',
    'In Stock?', 'Hire or Keep', 'Corner Banner Text',
    'Banner Discount Type', 'Banner Discount Value', 'Banner Active?'
  ];
  styleHeaderRow_(s2, h2, '#9C7A3C', '#FFFFFF');
  s2.setFrozenRows(1);

  if (s2.getLastRow() <= 1) {
    var defaultPrices = [
      ['wooden-board',       'Backdrop', 'Personalised Wooden Arch Board', 'Personalised wooden arch backdrop board in custom paint finish with bespoke vinyl lettering', 55,  155, true,  'Hire Only', '',           'none',    0,  false],
      ['gold-shimmer',       'Backdrop', 'Gold Sequin Shimmer Wall',       'Gleaming gold sequin shimmer wall photo backdrop providing reflective party shimmer',          150, 180, true,  'Hire Only', 'MOST POPULAR','none',   0,  true ],
      ['iridescent-shimmer', 'Backdrop', 'Iridescent Sequin Shimmer Wall', 'Pastel iridescent holographic shimmer sequin backdrop catching rainbow ambient light',        150, 180, true,  'Hire Only', '',           'none',    0,  false],
      ['silver-shimmer',     'Backdrop', 'Silver Sequin Shimmer Wall',     'Classic metallic silver sequin shimmer wall providing sleek modern evening reflections',      150, 180, true,  'Hire Only', '',           'none',    0,  false],
      ['pink-shimmer',       'Backdrop', 'Pink / Lilac Shimmer Wall',      'Delicate blush pink and soft lilac sequin shimmer wall ideal for baby showers and birthdays', 150, 180, false, 'Hire Only', '',           'none',    0,  false],
      ['balloon-hoop',       'Backdrop', 'Circular Gold Balloon Hoop',     'Freestanding 2-metre circular gold metal hoop frame dressed with organic balloons',           220, 220, true,  'Hire Only', '',           'none',    0,  false],
      ['easel-welcome',      'Backdrop', 'Wooden Easel & Welcome Board',   'Custom painted welcome sign displayed on an artist wooden easel with mini organic balloon posy',45,  45,  true,  'Hire Only', '',           'none',    0,  false],
      ['garland-side',       'Garland',  '7ft Side Organic Garland',       '7ft asymmetrical organic balloon garland cascading up one side of your frame or board',       125, 125, true,  'Yours to Keep', '',       'none',    0,  false],
      ['garland-clusters',   'Garland',  'Top & Bottom Corner Clusters',   'Two organic balloon clusters framing the top and opposite bottom corners of your backdrop',    75,  75,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['garland-full',       'Garland',  'Full Surround Arch Upgrade',     'Full wrap-around organic balloon arch providing continuous floor-to-top frame coverage',       165, 35,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['digits-helium',      'Digits',   'Helium Foil Numbers + Clusters', 'Giant 34-inch helium foil numbers anchored on matching balloon weights with latex clusters',   36,  52,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['digits-stack-basic', 'Digits',   'Number Stack — Basic',           'Air-filled foil number mounted on a sturdy 2-tier organic latex mini balloon base',           35,  45,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['digits-stack-themed','Digits',   'Number Stack — Themed',          'Bespoke themed number stack with character foil accents, organic details, and vinyl name',     42,  52,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['digits-stack-luxury','Digits',   'Number Stack — Luxury',          'Multi-balloon luxury sculpture stack featuring metallic chrome orbs and hand-tied satin bows',56,  66,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['letters-16inch',     'Digits',   'Custom 16" Foil Letters/Numbers','Custom air-filled foil letters or numbers strung as a personalised celebration banner',        5,   5,   true,  'Yours to Keep', '',       'none',    0,  false],
      ['floral-sprays',      'Extras',   'Artificial Floral & Foliage',    'Silk faux florals, pampas grass plumes, and botanical greenery woven into your balloon garland',36,  36,  true,  'Hire Only', '',           'none',    0,  false],
      ['neon-sign',          'Extras',   'LED Neon Script Sign',           'Warm glowing LED neon script sign ("Happy Birthday" / "Lets Party" / "Oh Baby")',             35,  35,  true,  'Hire Only', '',           'none',    0,  false],
      ['baby-boxes',         'Extras',   '4x Stacked BABY Blocks',         'Set of 4 transparent white-framed display boxes filled with coordinating mini balloons',      40,  40,  true,  'Hire Only', '',           'none',    0,  false],
      ['bubble-helium',      'Extras',   'Personalised Bubble Balloon',    'Clear 24-inch helium bubble balloon stuffed with mini latex balloons and custom vinyl message',35,  35,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['cut-out-props',      'Extras',   'Themed Cut-Out Prop Board',      'Freestanding themed cut-out character prop board adding depth to your celebration backdrop',  36,  52,  true,  'Hire Only', '',           'none',    0,  false],
      ['table-centerpiece',  'Extras',   'Table Centerpiece Display',      'Matching organic balloon table centerpiece arrangement designed for party banquet tables',     35,  35,  true,  'Yours to Keep', '',       'none',    0,  false],
      ['cake-plinth',        'Extras',   'Cylinder Cake Stand & Plinth',   'White ribbed cylinder pedestal plinth providing a raised display platform for your cake',     60,  60,  false, 'Hire Only', '',           'none',    0,  false]
    ];
    s2.getRange(2, 1, defaultPrices.length, h2.length).setValues(defaultPrices);
  }
  s2.getRange('E2:F100').setNumberFormat('£#,##0.00');
  s2.getRange('G2:G100').insertCheckboxes();
  s2.getRange('L2:L100').insertCheckboxes();
  var discountTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['none', 'percent', 'fixed'], true)
    .setAllowInvalid(false)
    .build();
  s2.getRange('J2:J100').setDataValidation(discountTypeRule);

  // ---------------------------------------------------------------------------
  // TAB 3: Balloon Colours & Palettes (Soft Blush #E6B8AF)
  // ---------------------------------------------------------------------------
  var s3 = getOrCreateSheet_(ss, TAB_PALETTES, '#E6B8AF');
  var h3Left = ['Colour ID', 'Colour Name', 'Hex Code', 'Finish', 'In Stock?'];
  var h3Right = ['Palette ID', 'Palette Name', 'Description', 'Balloon 1', 'Balloon 2', 'Balloon 3', 'Balloon 4', 'Balloon 5', 'In Stock?'];
  s3.getRange(1, 1, 1, h3Left.length).setValues([h3Left]).setBackground('#C48B7B').setFontColor('#FFFFFF').setFontWeight('bold');
  s3.getRange(1, 7, 1, h3Right.length).setValues([h3Right]).setBackground('#5F6A49').setFontColor('#FFFFFF').setFontWeight('bold');
  s3.setFrozenRows(1);

  if (s3.getLastRow() <= 1) {
    var defaultColours = [
      ['sage',           'Organic Sage',   '#7A8C68', 'Matte',  true ],
      ['pearl-white',    'Pearl Ivory',    '#F5F2EB', 'Pearl',  true ],
      ['champagne-gold', 'Chrome Gold',    '#C5A059', 'Chrome', true ],
      ['blush-pink',     'Soft Blush',     '#E6B8AF', 'Matte',  true ],
      ['nude-stone',     'Warm Taupe',     '#B8A693', 'Matte',  true ],
      ['butter-yellow',  'Lemon Butter',   '#F0DE6C', 'Matte',  true ],
      ['pastel-blue',    'Sky Blue',       '#9EC1CF', 'Matte',  true ],
      ['lilac-mist',     'Soft Lilac',     '#C3B1CE', 'Matte',  true ],
      ['chrome-silver',  'Chrome Silver',  '#BCC0C7', 'Chrome', true ],
      ['matte-black',    'Obsidian Black', '#222421', 'Matte',  true ],
      ['rose-gold',      'Rose Gold',      '#C48B7B', 'Chrome', false],
      ['eucalyptus',     'Deep Forest',    '#4A5840', 'Matte',  false]
    ];
    s3.getRange(2, 1, defaultColours.length, 5).setValues(defaultColours);

    var defaultPalettes = [
      ['palette-sage-gold',    '01. Signature Sage & Champagne', 'Our signature botanical look — matte sage, pearl ivory & warm chrome gold.',     'Organic Sage', 'Pearl Ivory',  'Chrome Gold',   'Warm Taupe',   'Soft Blush',   true],
      ['palette-blush-sunset', '02. Blush, Taupe & Pearl',       'Romantic soft blush, warm taupe, pearl ivory & metallic champagne accents.',      'Soft Blush',   'Warm Taupe',   'Pearl Ivory',   'Chrome Gold',  'Soft Lilac',   true],
      ['palette-neutral-glow', '03. Cashmere & Ivory Editorial', 'Neutral warm stone, pearl white & gleaming gold for milestone celebrations.',     'Warm Taupe',   'Pearl Ivory',  'Chrome Gold',   'Lemon Butter', 'Organic Sage', true],
      ['palette-pastel-cloud', '04. Pastel Sky, Lilac & Lemon',  'Dreamy pastel blue, soft lilac, lemon butter & pearl white for baby showers.',    'Sky Blue',     'Soft Lilac',   'Lemon Butter',  'Pearl Ivory',  'Soft Blush',   true],
      ['palette-black-tie',    '05. Midnight Black, Silver & Gold','High-contrast obsidian black, chrome silver, chrome gold & pearl white.',       'Obsidian Black','Chrome Silver','Chrome Gold',  'Pearl Ivory',  'Warm Taupe',   true]
    ];
    s3.getRange(2, 7, defaultPalettes.length, 9).setValues(defaultPalettes);
  }
  s3.getRange('E2:E30').insertCheckboxes();
  s3.getRange('O2:O15').insertCheckboxes();

  // Dropdown validation for Balloon 1..5 (Cols J..N) pointing to Colour Name ($B$2:$B$30)
  var colourRange = s3.getRange('$B$2:$B$30');
  var colourDropdown = SpreadsheetApp.newDataValidation()
    .requireValueInRange(colourRange, true)
    .setAllowInvalid(true)
    .build();
  s3.getRange('J2:N15').setDataValidation(colourDropdown);

  // ---------------------------------------------------------------------------
  // TAB 4: Offers, Lookbook & Settings (Warm Taupe #B8A693)
  // ---------------------------------------------------------------------------
  var s4 = getOrCreateSheet_(ss, TAB_SETTINGS, '#B8A693');
  var h4 = ['Code', 'Offer Title', 'Discount %', 'Discount £', 'Min Spend £', 'Active?'];
  styleHeaderRow_(s4, h4, '#6E6256', '#FFFFFF');
  s4.setFrozenRows(1);
  if (s4.getLastRow() <= 1) {
    var defaultOffers = [
      ['OCCASION10', '10% Off Full Shimmer Wall Packages',             10, 0,  0,   true],
      ['FREENEON',   'Complimentary Neon Sign Upgrade on Orders £180+', 0,  35, 180, true]
    ];
    s4.getRange(2, 1, defaultOffers.length, 6).setValues(defaultOffers);
  }
  s4.getRange('F2:F20').insertCheckboxes();
  s4.getRange('Z1').setValue(String(new Date().getTime()));
}

/**
 * PUBLIC GET ENDPOINT: Returns ONLY Public Catalog Data (Tabs 2, 3, 4) + Z1 Timestamp.
 * SECURITY GUARANTEE: Never reads or returns Tab 1 (Enquiries & Orders / Customer PII).
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = readPublicCatalogFromSheet_(ss);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: payload }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST ENDPOINT:
 *  - Public action `new_quote`: Rate-limited, formula-sanitized, append-only to Tab 1.
 *  - Privileged actions (`sync_admin_save`, `update_booking_status`, `delete_booking_gdpr`,
 *    `pull_admin_bookings`): Require constant-time verified `adminSecret`.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(rawBody);
    var action = body.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------------------------------------------------------------------------
    // PUBLIC ACTION: Append a new customer quote to Tab 1 (Enquiries & Orders)
    // -------------------------------------------------------------------------
    if (action === 'new_quote') {
      var cache = CacheService.getScriptCache();
      var rateKey = 'quote_rate_bucket_' + Math.floor(new Date().getTime() / 600000);
      var currentCount = Number(cache.get(rateKey) || '0');
      if (currentCount >= 15) {
        return jsonResponse_({ ok: false, error: 'Rate limit exceeded. Please try again shortly.' });
      }
      cache.put(rateKey, String(currentCount + 1), 600);

      var q = body.quote || {};
      var client = q.client || {};
      var cfg = q.configuration || {};
      var s1 = ss.getSheetByName(TAB_ENQUIRIES);
      if (!s1) {
        setupSheetTabs();
        s1 = ss.getSheetByName(TAB_ENQUIRIES);
      }

      var cleanPhone = String(client.phone || '').replace(/[^0-9+]/g, '');
      var waDigits = cleanPhone.replace(/^0/, '44').replace(/^\+/, '');
      var clientNameSafe = sanitizeCell(client.name || 'Client');
      var eventDateSafe = sanitizeCell(client.eventDate || '');
      var totalNum = Number(cfg.estimatedTotal || 0);
      var waMsg = encodeURIComponent(
        'Hi ' + (client.name || '') + '! Thank you for designing your Occasion Edit for ' +
        (client.eventDate || 'your event') + ' (Est. £' + totalNum + '). We would love to confirm availability!'
      );
      var waFormula = waDigits
        ? '=HYPERLINK("https://wa.me/' + waDigits + '?text=' + waMsg + '", "💬 Message ' + clientNameSafe.replace(/"/g, '') + '")'
        : 'No phone';

      var stockIdsStr = (cfg.stockIds && Array.isArray(cfg.stockIds)) ? cfg.stockIds.join(', ') : (cfg.stockIds || '');
      var pullListStr = cfg.balloonPullList || '';

      var quotePdfFormula = q.quotePdfUrl ? '=HYPERLINK("' + q.quotePdfUrl + '", "📄 Quote PDF")' : '';
      var invoicePdfFormula = q.invoicePdfUrl ? '=HYPERLINK("' + q.invoicePdfUrl + '", "🧾 Invoice PDF")' : '';

      // Insert at Row 2 so the newest enquiry always sits at the top of Tab 1
      s1.insertRowAfter(1);
      var newRow = [
        new Date().toISOString(),
        sanitizeCell(q.id || ('OE-' + new Date().getTime())),
        'New Enquiry',
        clientNameSafe,
        sanitizeCell(client.phone || ''),
        waFormula,
        sanitizeCell(client.email || ''),
        eventDateSafe,
        sanitizeCell(client.postcode || ''),
        sanitizeCell((cfg.palette || []).join(', ')),
        sanitizeCell(cfg.backdrop || 'None'),
        sanitizeCell(cfg.balloonLayout || 'None'),
        sanitizeCell(cfg.digitsOrLetters || 'None'),
        sanitizeCell((cfg.extras || []).join(', ')),
        sanitizeCell(stockIdsStr),
        sanitizeCell(pullListStr),
        sanitizeCell(cfg.promoCode || ''),
        quotePdfFormula,
        invoicePdfFormula,
        totalNum,
        0,
        '=MAX(0, T2-U2)',
        sanitizeCell(describeEventAndPersonalisation_(client, cfg)),
        ''
      ];
      s1.getRange(2, 1, 1, newRow.length).setValues([newRow]);
      s1.getRange('E2').setNumberFormat('@');
      s1.getRange('T2:V2').setNumberFormat('£#,##0.00');

      return jsonResponse_({ ok: true, id: q.id });
    }

    // -------------------------------------------------------------------------
    // PRIVILEGED ADMIN ACTIONS: Require constant-time ADMIN_SYNC_SECRET check
    // -------------------------------------------------------------------------
    if (!isValidAdminSecret(body.adminSecret)) {
      return jsonResponse_({ ok: false, error: '403 Unauthorized: Invalid ADMIN_SYNC_SECRET' });
    }

    if (action === 'delete_booking_gdpr') {
      var targetId = String(body.bookingId || '');
      var s1Del = ss.getSheetByName(TAB_ENQUIRIES);
      var deletedCount = 0;
      if (s1Del && targetId && s1Del.getLastRow() >= 2) {
        var ids = s1Del.getRange(2, 2, s1Del.getLastRow() - 1, 1).getValues();
        for (var r = ids.length - 1; r >= 0; r--) {
          if (String(ids[r][0]) === targetId) {
            s1Del.deleteRow(r + 2);
            deletedCount++;
          }
        }
      }
      return jsonResponse_({ ok: true, deletedRows: deletedCount });
    }

    if (action === 'update_booking_status') {
      var bId = String(body.bookingId || '');
      var newStatus = sanitizeCell(body.status || 'New Enquiry');
      var s1Upd = ss.getSheetByName(TAB_ENQUIRIES);
      if (s1Upd && bId && s1Upd.getLastRow() >= 2) {
        var rowIds = s1Upd.getRange(2, 2, s1Upd.getLastRow() - 1, 1).getValues();
        for (var idx = 0; idx < rowIds.length; idx++) {
          if (String(rowIds[idx][0]) === bId) {
            s1Upd.getRange(idx + 2, 3).setValue(newStatus);
            if (body.depositPaid !== undefined) {
              s1Upd.getRange(idx + 2, 21).setValue(Number(body.depositPaid) || 0); // Col U: Deposit Paid
            }
            if (body.balanceDue !== undefined) {
              s1Upd.getRange(idx + 2, 22).setValue(Number(body.balanceDue) || 0); // Col V: Balance Due
            }
            break;
          }
        }
      }
      return jsonResponse_({ ok: true });
    }

    if (action === 'archive_pdf_document') {
      var res = handleArchivePdfDocument_(ss, body);
      return jsonResponse_(res);
    }

    if (action === 'sync_admin_save') {
      var s4 = ss.getSheetByName(TAB_SETTINGS);
      var currentSheetRev = s4 ? Number(s4.getRange('Z1').getValue() || '0') : 0;
      var clientLoadedRev = Number(body.loadedSheetRevisionMs || '0');
      if (clientLoadedRev > 0 && currentSheetRev > clientLoadedRev && !body.forceOverwrite) {
        return jsonResponse_({
          ok: false,
          conflict: true,
          sheetRevisionMs: currentSheetRev,
          error: 'Google Sheet has newer edits. Pull latest from Sheet first or confirm overwrite.'
        });
      }
      writeAdminCatalogToSheet_(ss, body.siteData || {});
      var newRev = new Date().getTime();
      if (s4) s4.getRange('Z1').setValue(String(newRev));
      return jsonResponse_({ ok: true, sheetRevisionMs: newRev });
    }

    return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: Reads Tabs 2, 3, and 4 for public catalog sync.
 */
function readPublicCatalogFromSheet_(ss) {
  var result = {
    pricesAndStock: [],
    balloonColours: [],
    curatedPalettes: [],
    offers: [],
    sheetRevisionMs: 0
  };

  var s2 = ss.getSheetByName(TAB_PRICES);
  if (s2 && s2.getLastRow() >= 2) {
    var rows2 = s2.getRange(2, 1, s2.getLastRow() - 1, 12).getValues();
    for (var i = 0; i < rows2.length; i++) {
      var r = rows2[i];
      if (!r[0]) continue;
      result.pricesAndStock.push({
        id: String(r[0]),
        category: String(r[1]),
        name: String(r[2]),
        description: String(r[3] || ''),
        basePrice: Number(r[4] || 0),
        secondaryPrice: Number(r[5] || 0),
        inStock: Boolean(r[6]),
        hireOrKeep: String(r[7] || ''),
        cornerBanner: {
          text: String(r[8] || ''),
          discountType: String(r[9] || 'none'),
          discountValue: Number(r[10] || 0),
          enabled: Boolean(r[11])
        }
      });
    }
  }

  var s3 = ss.getSheetByName(TAB_PALETTES);
  if (s3 && s3.getLastRow() >= 2) {
    var rows3 = s3.getRange(2, 1, s3.getLastRow() - 1, 15).getValues();
    var nameToId = {};
    for (var c = 0; c < rows3.length; c++) {
      var cr = rows3[c];
      if (cr[0]) {
        nameToId[String(cr[1]).trim()] = String(cr[0]).trim();
        result.balloonColours.push({
          id: String(cr[0]).trim(),
          name: String(cr[1]).trim(),
          hex: String(cr[2]).trim(),
          finish: String(cr[3]).trim(),
          inStock: Boolean(cr[4])
        });
      }
    }
    for (var p = 0; p < rows3.length; p++) {
      var pr = rows3[p];
      if (pr[6]) {
        var colNames = [pr[9], pr[10], pr[11], pr[12], pr[13]];
        var colIds = [];
        for (var k = 0; k < colNames.length; k++) {
          var cname = String(colNames[k] || '').trim();
          if (cname && nameToId[cname]) colIds.push(nameToId[cname]);
        }
        result.curatedPalettes.push({
          id: String(pr[6]).trim(),
          name: String(pr[7]).trim(),
          description: String(pr[8]).trim(),
          colourIds: colIds,
          inStock: Boolean(pr[14])
        });
      }
    }
  }

  var s4 = ss.getSheetByName(TAB_SETTINGS);
  if (s4) {
    result.sheetRevisionMs = Number(s4.getRange('Z1').getValue() || '0');
    if (s4.getLastRow() >= 2) {
      var rows4 = s4.getRange(2, 1, s4.getLastRow() - 1, 6).getValues();
      for (var o = 0; o < rows4.length; o++) {
        var orow = rows4[o];
        if (!orow[0]) continue;
        result.offers.push({
          id: 'offer-' + (o + 1),
          code: String(orow[0]).trim(),
          title: String(orow[1]).trim(),
          discountPercent: Number(orow[2] || 0),
          discountFixed: Number(orow[3] || 0),
          minSpend: Number(orow[4] || 0),
          active: Boolean(orow[5])
        });
      }
    }
  }

  return result;
}

/**
 * Helper: Writes updated prices, stock checkboxes, colours, palettes & ribbons from Studio Admin into Tabs 2 & 3.
 */
function writeAdminCatalogToSheet_(ss, siteData) {
  var s2 = ss.getSheetByName(TAB_PRICES);
  if (s2 && siteData && siteData.steps && s2.getLastRow() >= 2) {
    var itemMap = {};
    for (var s = 0; s < siteData.steps.length; s++) {
      var step = siteData.steps[s];
      var items = step.items || [];
      for (var i = 0; i < items.length; i++) {
        itemMap[items[i].id] = items[i];
      }
    }
    var dOpts = siteData.digitOptions || [];
    for (var d = 0; d < dOpts.length; d++) {
      itemMap[dOpts[d].id] = dOpts[d];
    }

    var range2 = s2.getRange(2, 1, s2.getLastRow() - 1, 12);
    var vals2 = range2.getValues();
    for (var r = 0; r < vals2.length; r++) {
      var id = String(vals2[r][0]);
      var match = itemMap[id];
      if (match) {
        vals2[r][2] = sanitizeCell(match.name || vals2[r][2]);
        vals2[r][3] = sanitizeCell(match.description || vals2[r][3] || '');
        vals2[r][4] = Number(match.price !== undefined ? match.price : (match.basePrice || vals2[r][4]));
        vals2[r][5] = Number(match.packageLargePrice || match.packageBasePrice || match.secondDigitPrice || vals2[r][5]);
        vals2[r][6] = Boolean(match.inStock);
        if (match.cornerBanner) {
          vals2[r][8] = sanitizeCell(match.cornerBanner.text || '');
          vals2[r][9] = match.cornerBanner.discountType || 'none';
          vals2[r][10] = Number(match.cornerBanner.discountValue || 0);
          vals2[r][11] = Boolean(match.cornerBanner.enabled);
        }
      }
    }
    range2.setValues(vals2);
  }
}

// Folds the venue details and personalised wording into the order's notes cell until
// the order sheet gets dedicated columns for them.
function describeEventAndPersonalisation_(client, cfg) {
  var parts = [];
  if (client.venueName) parts.push('Venue: ' + client.venueName + (client.setting ? ' (' + client.setting + ')' : ''));
  if (client.accessTime) parts.push('Access from: ' + client.accessTime);
  var board = cfg.boardCustomization;
  if (board && board.text) parts.push('Board wording: "' + board.text + '"' + (board.color ? ' on ' + board.color : '') + (board.vinylColor ? ', ' + board.vinylColor + ' vinyl' : ''));
  if (cfg.shimmerSize && cfg.shimmerSize !== 'N/A') parts.push('Shimmer wall size: ' + cfg.shimmerSize);
  if (cfg.neonPhrase) parts.push('Neon: "' + cfg.neonPhrase + '"');
  if (cfg.bubbleText) parts.push('Bubble text: "' + cfg.bubbleText + '"');
  if (client.notes) parts.push('Customer notes: ' + client.notes);
  return parts.join(' | ');
}

function getOrCreateSheet_(ss, name, tabColorHex) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  sheet.setTabColor(tabColorHex);
  return sheet;
}

function styleHeaderRow_(sheet, headers, bgHex, fgHex) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setBackground(bgHex);
  range.setFontColor(fgHex);
  range.setFontWeight('bold');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Dynamic UK Tax Year Calculator (e.g. Tax Year 2025-26)
 */
function getUkTaxYearString_() {
  var now = new Date();
  var year = now.getFullYear();
  var apr6 = new Date(year, 3, 6); // April 6
  if (now < apr6) {
    return 'Tax Year ' + (year - 1) + '-' + String(year).slice(-2);
  } else {
    return 'Tax Year ' + year + '-' + String(year + 1).slice(-2);
  }
}

/**
 * Ensures recursive Google Drive folder hierarchy exists.
 */
function getOrCreateDrivePath_(pathArray) {
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < pathArray.length; i++) {
    var name = pathArray[i];
    var subFolders = folder.getFoldersByName(name);
    if (subFolders.hasNext()) {
      folder = subFolders.next();
    } else {
      folder = folder.createFolder(name);
    }
  }
  return folder;
}

/**
 * Initializes Studio Asset and Document Folders in Google Drive:
 *  - /THE Occasion Edit/Invoices/Tax Year 2025-26/
 *  - /THE Occasion Edit/Quotes/Tax Year 2025-26/
 *  - /THE Occasion Edit/Assets/Curated Looks/
 *  - /THE Occasion Edit/Assets/Stock Products/
 */
function ensureStudioDriveFolders_() {
  var taxYear = getUkTaxYearString_();
  var invoiceFolder = getOrCreateDrivePath_(['THE Occasion Edit', 'Invoices', taxYear]);
  var quoteFolder = getOrCreateDrivePath_(['THE Occasion Edit', 'Quotes', taxYear]);
  var curatedFolder = getOrCreateDrivePath_(['THE Occasion Edit', 'Assets', 'Curated Looks']);
  var stockFolder = getOrCreateDrivePath_(['THE Occasion Edit', 'Assets', 'Stock Products']);
  return {
    invoiceFolder: invoiceFolder,
    quoteFolder: quoteFolder,
    curatedFolder: curatedFolder,
    stockFolder: stockFolder
  };
}

/**
 * Archives Quote or Invoice PDF to Google Drive and links to Order ID in Tab 1:
 *  - Saves into /THE Occasion Edit/Invoices/Tax Year 2025-26/ or /Quotes/Tax Year 2025-26/
 *  - Matches Order ID in Tab 1
 *  - Inserts =HYPERLINK("...") formula into Column R (Quote) or Column S (Invoice)
 */
function handleArchivePdfDocument_(ss, body) {
  var bookingId = String(body.bookingId || body.orderId || '').trim();
  var docType = String(body.docType || 'quote').toLowerCase().trim(); // 'quote' | 'invoice'
  var pdfBase64 = body.pdfBase64 || '';
  var filename = body.filename || ((docType === 'invoice' ? 'Invoice-' : 'Quote-') + bookingId + '.pdf');

  if (!pdfBase64) {
    return { ok: false, error: 'Missing pdfBase64 content' };
  }

  var taxYear = getUkTaxYearString_();
  var folderPath = docType === 'invoice'
    ? ['THE Occasion Edit', 'Invoices', taxYear]
    : ['THE Occasion Edit', 'Quotes', taxYear];

  var targetFolder = getOrCreateDrivePath_(folderPath);
  var blob = Utilities.newBlob(Utilities.base64Decode(pdfBase64), 'application/pdf', filename);
  var file = targetFolder.createFile(blob);
  var fileUrl = file.getUrl();

  // Match Order ID in Tab 1
  var s1 = ss.getSheetByName(TAB_ENQUIRIES);
  var updatedRow = -1;
  if (s1 && bookingId && s1.getLastRow() >= 2) {
    var ids = s1.getRange(2, 2, s1.getLastRow() - 1, 1).getValues();
    for (var r = 0; r < ids.length; r++) {
      if (String(ids[r][0]).trim() === bookingId) {
        var rowNum = r + 2;
        var colNum = (docType === 'invoice') ? 19 : 18; // Col R is 18, Col S is 19
        var linkLabel = (docType === 'invoice') ? '🧾 Invoice PDF' : '📄 Quote PDF';
        s1.getRange(rowNum, colNum).setValue('=HYPERLINK("' + fileUrl + '", "' + linkLabel + '")');
        updatedRow = rowNum;
        break;
      }
    }
  }

  return {
    ok: true,
    fileId: file.getId(),
    fileUrl: fileUrl,
    filename: filename,
    folder: targetFolder.getName(),
    taxYear: taxYear,
    updatedSheetRow: updatedRow
  };
}
