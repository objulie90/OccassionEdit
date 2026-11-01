import React, { useState, useEffect, useRef } from 'react';
import { computeAvailability, hireItemsFromSteps } from './lib/availability';
import { buildLocalBooking } from './lib/bookings';
import { applySale, saleBannerText } from './lib/sale';
import { documentNumber } from './studio/documents';
import {
  INITIAL_BALLOON_COLOURS,
  INITIAL_CURATED_PALETTES,
  INITIAL_DIGIT_LETTER_OPTIONS,
  CONFIGURATOR_STEPS,
  INITIAL_INSPIRATION_SLIDES,
  FULL_CSV_CATALOG,
  INITIAL_OFFERS,
  INITIAL_SEO_SETTINGS,
  INITIAL_FAQS,
  INITIAL_DELIVERY_CONFIG,
  calculateLookRecipePrice,
  deriveUnifiedCatalog,
  applyCornerBannerDiscount,
  generateLookDescription
} from './data/catalogData.js';
import { DeliveryRadiusMap } from './components/DeliveryMaps';
import { LegalDocumentsModal } from './components/LegalDocumentsModal';
import { ProductBuilder } from './components/ProductBuilder';
import { EditableText, EditablePrice, CornerRibbon, RibbonPickerPopover } from './components/ui';
import { compressAndStripExifJpeg, sanitizeCsvCell } from './lib/media';
import { MasterOrdersDashboard } from './studio/MasterOrdersDashboard';
import { StaffSwitch } from './studio/StaffSwitch';

/**
 * Main App Component — Carbon-Copy WYSIWYG Studio Edition
 */
// Set by `npm run build:preview`: a static copy with no studio server behind it
const IS_PREVIEW_BUILD = import.meta.env.VITE_PREVIEW === '1';

// Data saved before a field (such as `sku` or `recipe`) was added to the catalogue
// keeps the saved values but picks up the new fields from the built-in defaults.
function fillMissingFields(savedItems, defaultItems) {
  return savedItems.map(item => {
    const fallback = (defaultItems || []).find(d => d.id === item.id);
    return fallback ? { ...fallback, ...item } : item;
  });
}

function fillMissingStepFields(savedSteps) {
  return savedSteps.map(step => {
    const defaultStep = CONFIGURATOR_STEPS.find(st => st.id === step.id);
    return defaultStep ? { ...step, items: fillMissingFields(step.items || [], defaultStep.items) } : step;
  });
}

export function App() {
  const [steps, setSteps] = useState(CONFIGURATOR_STEPS);
  const [balloonColours, setBalloonColours] = useState(INITIAL_BALLOON_COLOURS);
  const [curatedPalettes, setCuratedPalettes] = useState(INITIAL_CURATED_PALETTES);
  const [digitOptions, setDigitOptions] = useState(INITIAL_DIGIT_LETTER_OPTIONS);
  const [inspirationSlides, setInspirationSlides] = useState(INITIAL_INSPIRATION_SLIDES);
  const [catalog, setCatalog] = useState(FULL_CSV_CATALOG);
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [seoSettings, setSeoSettings] = useState(INITIAL_SEO_SETTINGS);
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [deliveryConfig, setDeliveryConfig] = useState(INITIAL_DELIVERY_CONFIG);
  const [sale, setSale] = useState(null);
  // The preview has no server, so issued documents are held here for viewing
  const [previewDocs, setPreviewDocs] = useState({});
  const [studioSettings, setStudioSettings] = useState({});
  const [showMasterDashboard, setShowMasterDashboard] = useState(false);
  const [sheetConfig, setSheetConfig] = useState({
    webAppUrl: '',
    sheetUrl: '',
    adminSecret: ''
  });
  const [loadedSheetRevisionMs, setLoadedSheetRevisionMs] = useState(0);

  // Studio Admin Authentication, WYSIWYG Mode & Calm Notification State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [csrfToken, setCsrfToken] = useState(null);
  const [unreadEnquiriesCount, setUnreadEnquiriesCount] = useState(0);
  const [quotes, setQuotes] = useState([]);

  // Modals & Slide-Over Drawers
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showLookRecipeEditor, setShowLookRecipeEditor] = useState(false);
  const [openLookRibbonId, setOpenLookRibbonId] = useState(null);
  const [openCatalogRibbonId, setOpenCatalogRibbonId] = useState(null);
  const [saveToast, setSaveToast] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  // Unsaved-changes safety net: last published version + one-time draft restore check
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [baselineRequested, setBaselineRequested] = useState(false);
  const draftCheckedRef = useRef(false);

  const [inspireCategory, setInspireCategory] = useState('All');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [externalPreset, setExternalPreset] = useState(null);

  const [priceSectionFilter, setPriceSectionFilter] = useState('All');
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [activeLegalDocId, setActiveLegalDocId] = useState('terms-and-conditions');

  const openLegalModal = (docId = 'terms-and-conditions') => {
    setActiveLegalDocId(docId);
    setShowLegalModal(true);
  };

  // Hydrate live site data from backend (/api/site-data) or localStorage fallback on mount
  useEffect(() => {
    let isMounted = true;
    const applySiteData = (sd) => {
        if (Array.isArray(sd.steps) && sd.steps.length > 0) setSteps(fillMissingStepFields(sd.steps));
        if (Array.isArray(sd.balloonColours) && sd.balloonColours.length > 0) setBalloonColours(sd.balloonColours);
        if (Array.isArray(sd.curatedPalettes) && sd.curatedPalettes.length > 0) setCuratedPalettes(sd.curatedPalettes);
        if (Array.isArray(sd.digitOptions) && sd.digitOptions.length > 0) setDigitOptions(fillMissingFields(sd.digitOptions, INITIAL_DIGIT_LETTER_OPTIONS));
        if (Array.isArray(sd.inspirationSlides) && sd.inspirationSlides.length > 0) setInspirationSlides(sd.inspirationSlides);
        if (Array.isArray(sd.catalog) && sd.catalog.length > 0) setCatalog(sd.catalog);
        if (Array.isArray(sd.offers) && sd.offers.length > 0) setOffers(sd.offers);
        if (sd.seo) setSeoSettings(prev => ({ ...prev, ...sd.seo }));
        if (Array.isArray(sd.faqs) && sd.faqs.length > 0) setFaqs(sd.faqs);
        if (sd.sheetConfig) setSheetConfig(prev => ({ ...prev, ...sd.sheetConfig }));
        if (sd.sale) setSale(sd.sale);
        if (sd.deliveryConfig?.zones?.length) setDeliveryConfig(sd.deliveryConfig);
    };

    // The preview has no server, so it carries a copy of the live site's public data
    if (IS_PREVIEW_BUILD) {
      import('./data/preview-site-data.json')
        .then(mod => { if (isMounted) applySiteData(mod.default); })
        .finally(() => { if (isMounted) setBaselineRequested(true); });
      return () => { isMounted = false; };
    }

    fetch('/api/site-data', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data || !data.ok) return;
        applySiteData(data.siteData || {});
        if (data.isAdminAuthenticated) {
          setIsAdminUnlocked(true);
          setCsrfToken(data.csrfToken);
          setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('oe_studio_site_data_v7');
          if (cached) {
            const sd = JSON.parse(cached);
            if (Array.isArray(sd.steps)) setSteps(fillMissingStepFields(sd.steps));
            if (Array.isArray(sd.balloonColours)) setBalloonColours(sd.balloonColours);
            if (Array.isArray(sd.digitOptions)) setDigitOptions(sd.digitOptions);
            if (Array.isArray(sd.inspirationSlides)) setInspirationSlides(sd.inspirationSlides);
            if (Array.isArray(sd.catalog)) setCatalog(sd.catalog);
            if (Array.isArray(sd.faqs)) setFaqs(sd.faqs);
          }
        } catch (_e) {}
      })
      .finally(() => {
        if (isMounted) setBaselineRequested(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const flashToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 4200);
  };

  // Derive Unified Catalog so Price Guide Cards stay 100% in sync with Builder prices & stock
  const unifiedCatalog = deriveUnifiedCatalog(catalog, steps, digitOptions);
  // What customers see right now: the saved shop with any running sale applied on top,
  // every list cheapest first so a smaller budget always sees something it can have
  const saleShop = applySale({ steps, digitOptions, catalog, inspirationSlides }, sale);
  const entryPrice = (it) => {
    // A base's entry price is its cheapest display with a price set
    const known = (it.displays || []).filter(d => d.offered !== false && d.price != null && d.price !== '').map(d => Number(d.price));
    const raw = known.length ? Math.min(...known) : it.packageBasePrice || it.price || it.basePrice || 0;
    return applyCornerBannerDiscount(raw, it.cornerBanner);
  };
  const cheapestFirst = (list, priceOf) => list
    .map((item, i) => ({ item, i, p: priceOf(item) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map(x => x.item);
  const shop = {
    ...saleShop,
    steps: saleShop.steps.map(st => ({ ...st, items: cheapestFirst(st.items || [], entryPrice) })),
    digitOptions: cheapestFirst(saleShop.digitOptions, d => (d.id === 'digits-none' ? -1 : entryPrice(d))),
    inspirationSlides: cheapestFirst(saleShop.inspirationSlides, sl => (sl.manualPriceOverride
      ? applyCornerBannerDiscount(sl.guidePrice, sl.cornerBanner)
      : calculateLookRecipePrice(sl.preset || {}, saleShop.steps, saleShop.digitOptions, balloonColours, curatedPalettes, sl.cornerBanner).finalTotal))
  };
  const shopCatalog = cheapestFirst(deriveUnifiedCatalog(shop.catalog, shop.steps, shop.digitOptions), entryPrice);

  const buildSiteDataPayload = () => ({
    steps,
    balloonColours,
    curatedPalettes,
    digitOptions,
    inspirationSlides,
    catalog: unifiedCatalog,
    offers,
    seo: seoSettings,
    faqs,
    sheetConfig,
    sale,
    deliveryConfig
  });

  // ---------------------------------------------------------------------------
  // Unsaved-changes safety net (Studio Mode only)
  // ---------------------------------------------------------------------------
  const DRAFT_KEY = 'oe_studio_unsaved_draft_v1';
  const currentSnapshot = JSON.stringify(buildSiteDataPayload());

  // Record the loaded site data as the "last published" version once
  useEffect(() => {
    if (baselineRequested && savedSnapshot === null) setSavedSnapshot(currentSnapshot);
  }, [baselineRequested, savedSnapshot, currentSnapshot]);

  // The preview can't publish, so nothing there ever counts as unsaved
  const isDirty = !IS_PREVIEW_BUILD && isAdminUnlocked && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  const applySiteSnapshot = (snapshotStr) => {
    try {
      const sd = JSON.parse(snapshotStr);
      if (Array.isArray(sd.steps)) setSteps(sd.steps);
      if (Array.isArray(sd.balloonColours)) setBalloonColours(sd.balloonColours);
      if (Array.isArray(sd.curatedPalettes)) setCuratedPalettes(sd.curatedPalettes);
      if (Array.isArray(sd.digitOptions)) setDigitOptions(sd.digitOptions);
      if (Array.isArray(sd.inspirationSlides)) setInspirationSlides(sd.inspirationSlides);
      if (Array.isArray(sd.catalog)) setCatalog(sd.catalog);
      if (Array.isArray(sd.offers)) setOffers(sd.offers);
      if (sd.seo) setSeoSettings(sd.seo);
      if (Array.isArray(sd.faqs)) setFaqs(sd.faqs);
      if (sd.sheetConfig) setSheetConfig(sd.sheetConfig);
      if ('sale' in sd) setSale(sd.sale);
      if (sd.deliveryConfig) setDeliveryConfig(sd.deliveryConfig);
    } catch (_e) {}
  };

  // Warn before closing or refreshing the tab with unsaved edits
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Offer to restore an unsaved draft once, after Studio Mode is unlocked
  useEffect(() => {
    if (!isAdminUnlocked || savedSnapshot === null || draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && draft !== savedSnapshot) {
        if (window.confirm('You have unsaved changes from last time.\n\nOK = restore my changes\nCancel = start from the published website')) {
          applySiteSnapshot(draft);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } else if (draft) {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (_e) {}
  }, [isAdminUnlocked, savedSnapshot]);

  // Keep a draft of unsaved edits (website content only — never customer enquiries)
  useEffect(() => {
    if (!draftCheckedRef.current) return;
    try {
      if (isDirty) localStorage.setItem(DRAFT_KEY, currentSnapshot);
      else localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
  }, [isDirty, currentSnapshot]);

  const handleDiscardChanges = () => {
    if (savedSnapshot === null) return;
    if (!window.confirm('Discard all unsaved changes and go back to the published website?')) return;
    applySiteSnapshot(savedSnapshot);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
    flashToast('Changes discarded.');
  };

  const handleLockStudio = async () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Lock Studio Mode and discard them?')) return;
      applySiteSnapshot(savedSnapshot);
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
    draftCheckedRef.current = false;
    setIsEditMode(false);
    setShowMasterDashboard(false);
    setIsAdminUnlocked(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_e) {}
  };

  // Save & Publish All Edits to Backend + LocalStorage + Optional Google Sheet
  // Publishes the site data; `payloadOverride` lets the Studio publish a change
  // in the same moment it makes it. Returns true only once the server has saved.
  const handleSaveAndPublish = async (forceOverwrite = false, payloadOverride = null) => {
    setIsSavingSite(true);
    const payload = payloadOverride || buildSiteDataPayload();
    try {
      localStorage.setItem('oe_studio_site_data_v7', JSON.stringify(payload));
    } catch (_e) {}

    try {
      const res = await fetch('/api/site-data', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({
          siteData: payload,
          loadedSheetRevisionMs,
          forceOverwrite
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'not saved');
      if (data.sheetSync?.status === 'conflict') {
        if (window.confirm(`${data.sheetSync.message}\n\nClick OK to overwrite the Google Sheet with your website edits, or Cancel to pull from the Sheet first.`)) {
          return handleSaveAndPublish(true, payload);
        }
      } else if (data.sheetSync?.sheetRevisionMs) {
        setLoadedSheetRevisionMs(data.sheetSync.sheetRevisionMs);
      }
      setSavedSnapshot(JSON.stringify(payload));
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (_e) {}
      flashToast('Published. The website now shows your changes.');
      return true;
    } catch (_err) {
      // Keep the unsaved-changes marker so nothing is lost or mistaken for published
      flashToast('Not published. Your changes are still here; check your connection and try again.');
      return false;
    } finally {
      setIsSavingSite(false);
    }
  };


  // The preview has no studio server, so it shows a labelled demo order instead
  useEffect(() => {
    if (import.meta.env.VITE_PREVIEW !== '1') return;
    import('./data/demoOrder.js').then(({ buildDemoOrders }) => {
      const demo = buildDemoOrders();
      setQuotes(demo);
      setUnreadEnquiriesCount(demo.length);
    });
  }, []);

  // Which hire props are free on a date. The preview has no server, so it
  // works the same rules out from the orders it holds.
  const getAvailability = async (date) => {
    if (IS_PREVIEW_BUILD) {
      return computeAvailability(date, quotes, hireItemsFromSteps(steps), studioSettings, Date.now());
    }
    const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'availability unavailable');
    return data.availability;
  };

  // Where staff are: the customer's view, editing the page, or the Studio
  // Everything is edited in the Studio, so the page itself is never in an editing mode
  const staffMode = showMasterDashboard ? 'studio' : 'customer';
  const setStaffMode = (mode) => {
    setShowMasterDashboard(mode === 'studio');
    setIsEditMode(false);
  };

  const openStudio = () => {
    if (IS_PREVIEW_BUILD) {
      setIsAdminUnlocked(true);
      setShowMasterDashboard(true);
      return;
    }
    if (isAdminUnlocked) setShowMasterDashboard(true);
    else setShowPinModal(true);
  };





  // Publishes the builder options and price list together, as the Studio's inventory changes them
  const publishInventory = async (nextSteps, nextDigits, nextCatalog) => {
    setSteps(nextSteps);
    setDigitOptions(nextDigits);
    setCatalog(nextCatalog);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, {
      ...buildSiteDataPayload(),
      steps: nextSteps,
      digitOptions: nextDigits,
      catalog: deriveUnifiedCatalog(nextCatalog, nextSteps, nextDigits)
    });
  };

  const cardLinksTo = (card, ref) => {
    const l = card.builderLink;
    if (!l || ref.kind === 'card') return false;
    return ref.kind === 'digit' ? l.type === 'digit' && l.id === ref.id : l.type === 'step' && l.stepId === ref.stepId && l.id === ref.id;
  };

  // One product from the Studio's inventory: its builder option and any price-list card showing it
  const handleSaveInventoryItem = (ref, itemPatch, cardPatch = {}) => {
    const nextSteps = ref.kind === 'step'
      ? steps.map(st => (st.id !== ref.stepId ? st : { ...st, items: st.items.map(it => (it.id === ref.id ? { ...it, ...itemPatch } : it)) }))
      : steps;
    const nextDigits = ref.kind === 'digit' ? digitOptions.map(d => (d.id === ref.id ? { ...d, ...itemPatch } : d)) : digitOptions;
    const nextCatalog = catalog.map(c => {
      if (ref.kind === 'card' && c.id === ref.id) return { ...c, ...itemPatch, ...cardPatch };
      return cardLinksTo(c, ref) ? { ...c, ...cardPatch } : c;
    });
    return publishInventory(nextSteps, nextDigits, nextCatalog);
  };

  // A new product: a builder option in its section (with a price-list card), or a price-list-only card
  const handleAddInventoryItem = (sectionId, item, card) => {
    if (sectionId === 'pricelist') return publishInventory(steps, digitOptions, [...catalog, { ...card, ...item }]);
    const link = sectionId === 'digits' ? { type: 'digit', id: item.id } : { type: 'step', stepId: sectionId, id: item.id };
    const nextSteps = sectionId === 'digits' ? steps : steps.map(st => (st.id === sectionId ? { ...st, items: [...(st.items || []), item] } : st));
    const nextDigits = sectionId === 'digits' ? [...digitOptions, item] : digitOptions;
    const nextCatalog = card ? [...catalog, { ...card, builderLink: link }] : catalog;
    return publishInventory(nextSteps, nextDigits, nextCatalog);
  };

  // Removing a product takes it out of the builder and the price list; the snapshot puts it back
  const handleRemoveInventoryItem = async (ref) => {
    const snapshot = { steps, digitOptions, catalog };
    const nextSteps = ref.kind === 'step'
      ? steps.map(st => (st.id !== ref.stepId ? st : { ...st, items: st.items.filter(it => it.id !== ref.id) }))
      : steps;
    const nextDigits = ref.kind === 'digit' ? digitOptions.filter(d => d.id !== ref.id) : digitOptions;
    const nextCatalog = catalog.filter(c => !(ref.kind === 'card' && c.id === ref.id) && !cardLinksTo(c, ref));
    const ok = await publishInventory(nextSteps, nextDigits, nextCatalog);
    return ok === false ? null : snapshot;
  };
  const handleRestoreInventory = (snapshot) => publishInventory(snapshot.steps, snapshot.digitOptions, snapshot.catalog);

  const handleSaveSale = async (nextSale) => {
    setSale(nextSale);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), sale: nextSale });
  };

  const handleSaveDeliveryConfig = async (nextConfig) => {
    setDeliveryConfig(nextConfig);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), deliveryConfig: nextConfig });
  };

  const handleSaveBundles = async (nextSlides) => {
    setInspirationSlides(nextSlides);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), inspirationSlides: nextSlides });
  };



  const handleSaveColours = async (nextColours) => {
    setBalloonColours(nextColours);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), balloonColours: nextColours });
  };

  const handleUploadPhotoForStudio = (file) =>
    new Promise((resolve, reject) => {
      handleUploadPhotoForTarget(file, resolve).catch(reject);
    });

  const handleSaveCuratedPalettes = async (nextPalettes) => {
    setCuratedPalettes(nextPalettes);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), curatedPalettes: nextPalettes });
  };

  // Orders load whenever staff are logged in, including after a page refresh
  useEffect(() => {
    if (isAdminUnlocked && !IS_PREVIEW_BUILD) fetchAdminQuotes();
  }, [isAdminUnlocked]);

  // Business and bank details live on the studio server, not in the public site data
  useEffect(() => {
    if (!isAdminUnlocked || IS_PREVIEW_BUILD) return;
    fetch('/api/admin/settings', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.ok && data.settings) setStudioSettings(data.settings); })
      .catch(() => {});
  }, [isAdminUnlocked]);

  // Links to Laura's Drive folders, set up by the sheet script's "Set up my Google Drive"
  const handleFetchDriveLinks = async () => {
    if (IS_PREVIEW_BUILD) return { connected: false, links: null };
    const res = await fetch('/api/admin/drive-links', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
      body: '{}'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Drive links unavailable');
    return data;
  };

  const handleSaveStudioSettings = async (nextSettings) => {
    if (IS_PREVIEW_BUILD) {
      setStudioSettings(nextSettings);
      return nextSettings;
    }
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(nextSettings)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'Settings not saved');
    setStudioSettings(data.settings);
    return data.settings;
  };

  // Verify Studio PIN (Default: 2026)
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAdminUnlocked(true);
        setCsrfToken(data.csrfToken);
        setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
        setShowPinModal(false);
        setPinInput('');
        setStaffMode('studio');
      } else {
        setPinError(data.error || "That PIN isn't right. Try again.");
      }
    } catch (_err) {
      setPinError("Couldn't reach the studio just now. Check your connection and try again.");
    }
  };

  const fetchAdminQuotes = async () => {
    try {
      const res = await fetch('/api/quotes', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.ok && Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
        setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
      }
    } catch (_e) {}
  };



  // One change to an order from the Studio: status, money, notes, plus a line for its history.
  // Shown at once; put back if the server doesn't save it.
  const handleUpdateOrder = async (quoteId, patch, historyText) => {
    const before = quotes;
    const at = new Date().toISOString();
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;
      const next = { ...q, configuration: { ...(q.configuration || {}) }, client: { ...(q.client || {}) } };
      if (patch.status) next.status = patch.status;
      ['quotedPrice', 'depositPaid', 'balancePaid'].forEach(k => {
        if (k in patch) next.configuration[k] = patch[k] === '' || patch[k] == null ? (k === 'quotedPrice' ? undefined : 0) : Number(patch[k]);
      });
      if ('staffNotes' in patch) next.client.staffNotes = patch.staffNotes;
      if (historyText) next.history = [...(q.history || []), { at, text: historyText }];
      return next;
    }));
    if (IS_PREVIEW_BUILD) return true;
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({ ...patch, historyText })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'not saved');
      if (data.quote) setQuotes(prev => prev.map(q => (q.id === quoteId ? data.quote : q)));
      if (typeof data.unreadEnquiriesCount === 'number') setUnreadEnquiriesCount(data.unreadEnquiriesCount);
      return true;
    } catch (_e) {
      setQuotes(before);
      flashToast("That change wasn't saved. Check your connection and try again.");
      return false;
    }
  };

  // Quotes and invoices: issued once, kept on the server as a tax record, filed in Drive
  const postAdmin = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "That wasn't saved. Check your connection and try again.");
    if (data.order) setQuotes(prev => prev.map(q => (q.id === data.order.id ? data.order : q)));
    return data;
  };

  const handleIssueDocument = async (orderId, payload) => {
    if (!IS_PREVIEW_BUILD) return postAdmin('/api/admin/documents', { orderId, ...payload });
    const order = quotes.find(q => q.id === orderId);
    const docs = order?.documents || [];
    const version = docs.filter(d => d.kind === payload.kind).length + 1;
    const doc = {
      id: Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8),
      kind: payload.kind,
      number: documentNumber(payload.kind, orderId, version),
      version,
      total: payload.total,
      issuedAt: new Date().toISOString(),
      status: 'issued',
      lines: payload.lines,
      notes: payload.notes
    };
    setPreviewDocs(prev => ({ ...prev, [doc.id]: payload.html }));
    setQuotes(prev => prev.map(q => (q.id !== orderId ? q : {
      ...q,
      documents: [...(q.documents || []).map(d => (payload.kind === 'quote' && d.kind === 'quote' && d.status === 'issued' ? { ...d, status: 'replaced' } : d)), doc],
      configuration: payload.kind === 'quote' ? { ...(q.configuration || {}), quotedPrice: payload.total } : q.configuration,
      history: [...(q.history || []), { at: doc.issuedAt, text: `${doc.number} issued, £${payload.total}` }]
    })));
    return { ok: true, document: doc, drive: { ok: false, error: "the preview can't reach Google Drive." } };
  };

  const handleDocumentAction = async (docId, what, body) => {
    if (!IS_PREVIEW_BUILD) return postAdmin(`/api/admin/documents/${docId}/${what}`, body);
    if (what === 'file') return { ok: true, drive: { ok: false, error: "the preview can't reach Google Drive." } };
    const at = new Date().toISOString();
    setQuotes(prev => prev.map(q => {
      const doc = (q.documents || []).find(d => d.id === docId);
      if (!doc) return q;
      const patch = what === 'void' ? { status: 'void', voidReason: body.reason, voidedAt: at } : { status: 'paid', paidAt: at };
      return {
        ...q,
        documents: q.documents.map(d => (d.id === docId ? { ...d, ...patch } : d)),
        history: [...(q.history || []), { at, text: what === 'void' ? `${doc.number} voided: ${body.reason}` : `${doc.number} paid` }]
      };
    }));
    return { ok: true };
  };

  const documentSource = (doc) => (IS_PREVIEW_BUILD ? { html: previewDocs[doc.id] || '' } : { src: `/api/admin/documents/${doc.id}` });

  // A booking agreed on Facebook, Instagram or the phone, added so the diary knows about it
  const handleAddBooking = async (booking) => {
    if (IS_PREVIEW_BUILD) {
      const order = buildLocalBooking(booking, quotes);
      setQuotes(prev => [order, ...prev]);
      return order;
    }
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(booking)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'not saved');
    setQuotes(prev => [data.quote, ...prev]);
    return data.quote;
  };

  const handleDeleteQuoteGdpr = async (quoteId, clientName) => {
    if (!window.confirm(`Delete ${clientName}'s details (${quoteId})? Any invoice stays on record, as HMRC requires.`)) {
      return;
    }
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    if (IS_PREVIEW_BUILD) return;
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken || '' }
      });
      const data = await res.json().catch(() => ({}));
      if (data.keptForTax) {
        fetchAdminQuotes();
        flashToast("Contact details deleted. The invoice stays on record for HMRC.");
        return;
      }
      flashToast(`Enquiry ${quoteId} and the customer's details deleted.`);
    } catch (_e) {}
  };



  // Layer-1 + Layer-2 Photo Upload Pipeline
  const handleUploadPhotoForTarget = async (file, applyUrlCallback) => {
    try {
      flashToast('⏳ Compressing & stripping EXIF GPS metadata...');
      const compressedDataUrl = await compressAndStripExifJpeg(file, 1200, 0.82);
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ imageDataUrl: compressedDataUrl })
        });
        const data = await res.json();
        if (res.ok && data.ok && data.url) {
          applyUrlCallback(data.url);
          flashToast('Photo added. Press Save to publish it.');
          return;
        }
      } catch (_e) {}
      applyUrlCallback(compressedDataUrl);
      flashToast('Photo changed. Press Save to publish it.');
    } catch (err) {
      flashToast(`That photo didn't upload: ${err.message}`);
    }
  };

  // Pull Latest Prices & Stock from Google Sheet (Two-Way Sync)


  // Mutators for Builder Items, Digit Options, Colours, Lookbook Slides & Catalog
  const updateBuilderItem = (stepId, itemId, patch) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          items: step.items.map(it => (it.id === itemId ? { ...it, ...patch } : it))
        };
      })
    );
  };

  const toggleBuilderItemStock = (stepId, itemId) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          items: step.items.map(it => (it.id === itemId ? { ...it, inStock: !it.inStock } : it))
        };
      })
    );
  };

  const updateDigitOption = (optId, patch) => {
    setDigitOptions(prev => prev.map(o => (o.id === optId ? { ...o, ...patch } : o)));
  };

  const toggleColourStock = (colourId) => {
    setBalloonColours(prev =>
      prev.map(c => (c.id === colourId ? { ...c, inStock: !c.inStock } : c))
    );
  };

  const updateColour = (colourId, patch) => {
    setBalloonColours(prev =>
      prev.map(c => (c.id === colourId ? { ...c, ...patch } : c))
    );
    flashToast(`Colour updated to ${patch.name || 'your custom shade'}.`);
  };

  const addNewColour = (colourData) => {
    const nextCode = 101 + balloonColours.length;
    const newId = `colour-${Date.now()}`;
    const newColour = {
      id: newId,
      code: nextCode,
      name: colourData.name || `Shade #${nextCode}`,
      hex: colourData.hex || '#7A8C68',
      finish: colourData.finish || 'Matte',
      inStock: true
    };
    setBalloonColours(prev => [...prev, newColour]);
    flashToast(`${newColour.name} added.`);
  };

  const updateSlide = (slideId, patch) => {
    setInspirationSlides(prev =>
      prev.map(s => (s.id === slideId ? { ...s, ...patch } : s))
    );
  };

  const updateSlidePreset = (slideId, presetPatch) => {
    setInspirationSlides(prev =>
      prev.map(s => {
        if (s.id !== slideId) return s;
        const nextPreset = { ...(s.preset || {}), ...presetPatch };
        const calc = calculateLookRecipePrice(nextPreset, steps, digitOptions, balloonColours, curatedPalettes, s.cornerBanner);
        const autoDesc = generateLookDescription(nextPreset, steps, digitOptions, curatedPalettes);
        return {
          ...s,
          preset: nextPreset,
          description: autoDesc || s.description,
          guidePrice: calc.finalTotal || s.guidePrice
        };
      })
    );
  };

  const handleAddNewBlankLook = () => {
    const newLook = {
      id: `insp-${Date.now()}`,
      category: inspireCategory === 'All' ? 'Parties' : inspireCategory,
      title: 'New Bespoke Signature Look',
      description: 'Click to describe the backdrop, balloon palette, and finishing touches included in this setup.',
      guidePrice: 185,
      image: 'public/assets/inspire-birthday.jpg',
      isExampleWatermark: true,
      cornerBanner: { enabled: true, text: 'NEW LOOK', style: 'sage', position: 'top-right', discountType: 'none', discountValue: 0 },
      preset: {
        paletteId: curatedPalettes[0].id,
        backdropId: 'wooden-board',
        shimmerSize: 'small',
        balloonId: 'garland-7ft',
        digitOptionId: 'digits-none',
        digitText: '',
        extraIds: ['add-on-flowers']
      }
    };
    setInspirationSlides(prev => [newLook, ...prev]);
    setCarouselIndex(0);
    setShowLookRecipeEditor(true);
    flashToast('New bundle added. Choose what goes in it below.');
  };

  const handleSaveBuilderSetupAsLook = (recipe, total) => {
    const newLook = {
      id: `insp-${Date.now()}`,
      category: 'Parties',
      title: 'New Custom 3D Builder Edit',
      description: 'Created directly from the 3D Studio Configurator. Click to customise the title or upload a venue photo.',
      guidePrice: total,
      image: 'public/assets/inspire-birthday.jpg',
      isExampleWatermark: true,
      cornerBanner: { enabled: true, text: 'NEW LOOK', style: 'gold', position: 'top-right', discountType: 'none', discountValue: 0 },
      preset: recipe
    };
    setInspirationSlides(prev => [newLook, ...prev]);
    setInspireCategory('All');
    setCarouselIndex(0);
    const el = document.getElementById('be-inspired');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    flashToast('Saved as a new bundle.');
  };

  const handleDeleteLookSlide = (slideId) => {
    if (inspirationSlides.length <= 1) return;
    if (!window.confirm('Remove this Look from the Lookbook carousel?')) return;
    setInspirationSlides(prev => prev.filter(s => s.id !== slideId));
    setCarouselIndex(0);
  };

  const updateCatalogCard = (cardId, patch) => {
    setCatalog(prev =>
      prev.map(card => {
        if (card.id !== cardId) return card;
        // Also propagate price/stock edits to linked Builder item if linked
        if (card.builderLink) {
          if (card.builderLink.type === 'digit' && typeof patch.basePrice === 'number') {
            updateDigitOption(card.builderLink.id, { basePrice: patch.basePrice });
          } else if (card.builderLink.type === 'step' && typeof patch.basePrice === 'number') {
            updateBuilderItem(card.builderLink.stepId, card.builderLink.id, {
              price: patch.basePrice,
              packageBasePrice: card.builderLink.usePackagePrice ? patch.basePrice : undefined
            });
          }
          if (typeof patch.inStock === 'boolean') {
            if (card.builderLink.type === 'digit') {
              updateDigitOption(card.builderLink.id, { inStock: patch.inStock });
            } else if (card.builderLink.type === 'step') {
              updateBuilderItem(card.builderLink.stepId, card.builderLink.id, { inStock: patch.inStock });
            }
          }
        }
        return { ...card, ...patch };
      })
    );
  };

  // Resolves only once the studio server has stored the enquiry; throws otherwise,
  // so the customer is never told an order was received when it was not.
  const handleSubmitCustomerQuote = async (quotePayload) => {
    if (IS_PREVIEW_BUILD) {
      throw Object.assign(new Error('preview build'), {
        customerMessage: 'This is a preview of the new website, so orders are not sent yet. Everything else works as it will for customers.'
      });
    }
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotePayload)
    });
    const data = await res.json().catch(() => ({}));
    if (data.code === 'unavailable') {
      throw Object.assign(new Error('unavailable'), { code: 'unavailable', customerMessage: data.error });
    }
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'The enquiry could not be saved.');
    }
    if (data.ignored) return data;
    setQuotes(prev => [{ ...quotePayload, id: data.quoteId || quotePayload.id }, ...prev]);
    setUnreadEnquiriesCount(prev => prev + 1);
    return data;
  };

  const inspireCategories = ['All', 'Birthdays', 'Baby Showers', 'Anniversaries', 'Parties'];
  const filteredSlides = shop.inspirationSlides.filter(
    s => inspireCategory === 'All' || s.category === inspireCategory
  );
  const activeSlide = filteredSlides[carouselIndex % Math.max(1, filteredSlides.length)] || shop.inspirationSlides[0];
  const activeSlideRecipeCalc = activeSlide
    ? calculateLookRecipePrice(activeSlide.preset, shop.steps, shop.digitOptions, balloonColours, curatedPalettes, activeSlide.cornerBanner)
    : null;
  const activeSlideLivePrice = activeSlide
    ? (activeSlide.manualPriceOverride
        ? applyCornerBannerDiscount(activeSlide.guidePrice, activeSlide.cornerBanner)
        : (activeSlideRecipeCalc?.finalTotal || activeSlide.guidePrice))
    : 0;
  const activeSlideOriginalPrice = activeSlide
    ? (activeSlide.manualPriceOverride
        ? activeSlide.guidePrice
        : (activeSlideRecipeCalc?.originalTotal || activeSlide.guidePrice))
    : 0;

  const handleLoadInspirationIntoBuilder = (preset) => {
    setExternalPreset(preset);
    const el = document.getElementById('build-your-edit');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // The price list uses the builder's own groups, so customers see the same choices in both
  const sectionOf = (card) => {
    const l = card.builderLink;
    if (!l) return 'Packages and more';
    if (l.type === 'digit') return 'Numbers and letters';
    return { backdrop: 'Bases', balloons: 'Balloon displays', extras: 'Finishing touches' }[l.stepId] || 'Packages and more';
  };
  const priceSections = ['All', ...['Bases', 'Balloon displays', 'Numbers and letters', 'Finishing touches', 'Packages and more'].filter(sec => shopCatalog.some(c => sectionOf(c) === sec))];
  const filteredCatalog = shopCatalog.filter(item => priceSectionFilter === 'All' || sectionOf(item) === priceSectionFilter);

  return (
    <div className="oe-site-wrapper">
      {/* Staff bar: one switch between the customer's view, editing the page and the Studio */}
      {isAdminUnlocked && (
        <div className="oe-studio-topbar" role="region" aria-label="Staff controls">
          <StaffSwitch mode={staffMode} onChange={setStaffMode} unread={unreadEnquiriesCount} />
          <div className="oe-studio-topbar-right">
            {isDirty && <span className="oe-unsaved-badge">Unsaved changes</span>}
            {isDirty && (
              <button type="button" onClick={handleDiscardChanges} className="oe-studio-bar-btn discard-btn">
                Discard
              </button>
            )}
            {isDirty && (
              <button
                type="button"
                disabled={isSavingSite}
                onClick={() => handleSaveAndPublish(false)}
                className="oe-studio-bar-btn save-btn"
              >
                {isSavingSite ? 'Saving' : 'Save'}
              </button>
            )}
            {!isDirty && saveToast && <span className="oe-studio-bar-note" role="status">{saveToast}</span>}
            <button type="button" onClick={handleLockStudio} className="oe-studio-bar-btn">
              Log out
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: MOCKUP V1 HERO WITH CENTERED ANIMATED LOGO */}
      <header id="top" className="oe-hero-section">
        {shop.live && sale?.showBanner && (
          <p className="oe-sale-band" role="note">{saleBannerText(sale)}</p>
        )}
        <img
          src="public/assets/hero-v1-bg.jpg"
          alt="Luxury Sage, Pearl, Blush and Gold Balloon Crescent Arch"
          className="oe-hero-bg-photo"
          fetchpriority="high"
        />

        <div className="oe-hero-center-emblem">
          <div className="oe-hero-v1-circle-content">
            <span className="oe-hero-sparkle oe-sp-1" aria-hidden="true">✦</span>
            <span className="oe-hero-sparkle oe-sp-2" aria-hidden="true">✦</span>
            <span className="oe-hero-sparkle oe-sp-3" aria-hidden="true">✦</span>

            {/* Lettered to match the logo: script "the", spaced serif OCCASION, small spaced EDIT */}
            <h1 className="oe-wordmark" aria-label="The Occasion Edit">
              <span className="oe-wordmark-the" aria-hidden="true">the</span>
              <span className="oe-wordmark-occasion" aria-hidden="true">Occasion</span>
              <span className="oe-wordmark-edit" aria-hidden="true">Edit</span>
            </h1>
            <a href="#build-your-edit" className="oe-hero-primary-btn">
              Build yours now
            </a>
          </div>
        </div>

        <nav className="oe-hero-floating-nav" aria-label="Primary Navigation">
          <a href="#be-inspired" className="oe-hero-nav-link">
            Be inspired
          </a>
          <a href="#price-guide" className="oe-hero-nav-link">
            Prices
          </a>
          <a href="#delivery-rates" className="oe-hero-nav-link">
            Delivery
          </a>
          <button
            type="button"
            onClick={() => setShowOffersModal(true)}
            className="oe-hero-offers-pill"
          >
            Offers
          </button>
        </nav>
      </header>

      {/* SECTION 2: GET INSPIRED (Categories + Carousel with EXAMPLE Watermarks & Live Stock Recipe Compiler) */}
      <section id="be-inspired" className="oe-inspire-section">
        <div className="oe-container">
          <div className="oe-section-header-center">
            <h2 className="oe-section-title">Get inspired</h2>
            <p className="oe-section-subtitle">Take a look at our pre-packaged bundles for some great offers, or a little inspiration to build your own.</p>

            <div className="oe-category-filter-bar" role="tablist">
              {inspireCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={inspireCategory === cat}
                  onClick={() => {
                    setInspireCategory(cat);
                    setCarouselIndex(0);
                  }}
                  className={`oe-category-pill ${inspireCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddNewBlankLook}
                  className="oe-category-pill active"
                  style={{ borderStyle: 'dashed' }}
                >
                  + Add New Look Card
                </button>
              )}
            </div>
          </div>

          {activeSlide && (
            <div className={`oe-lookbook-split-layout ${isEditMode ? 'has-dock' : ''}`}>
              <div className="oe-lookbook-card-col">
                <div className={`oe-carousel-stage oe-carousel-main-card ${isEditMode ? 'oe-inspector-active-card' : ''} ${activeSlide.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}>
                  <CornerRibbon banner={activeSlide.cornerBanner} />

                  <div className="oe-carousel-image-wrap">
                    <img
                      src={activeSlide.image}
                      alt={activeSlide.title}
                      className="oe-carousel-img"
                    />
                    {activeSlide.isExampleWatermark && (
                      <div className="oe-watermark-overlay" aria-hidden="true">
                        <span className="oe-watermark-stamp">EXAMPLE</span>
                      </div>
                    )}
                    <span className="oe-carousel-category-badge">{activeSlide.category}</span>
                  </div>

                  <div className="oe-carousel-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      {isEditMode ? (
                        <select
                          value={activeSlide.category || 'Birthdays'}
                          onChange={(e) => updateSlide(activeSlide.id, { category: e.target.value })}
                          className="oe-category-classifier-select"
                          title="Classify occasion for this Look"
                        >
                          <option value="Birthdays">Birthdays</option>
                          <option value="Baby Showers">Baby Showers</option>
                          <option value="Weddings">Weddings</option>
                          <option value="Milestones">Milestones</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Parties">Parties</option>
                        </select>
                      ) : null}
                    </div>

                    <div className={isEditMode ? 'oe-editable-box-blue' : ''}>
                      <EditableText
                        isEditMode={isEditMode}
                        value={activeSlide.title}
                        onChange={(val) => updateSlide(activeSlide.id, { title: val })}
                        tag="h3"
                        className="oe-carousel-title"
                      />
                    </div>

                    <div className={isEditMode ? 'oe-editable-box-blue' : ''} style={{ marginTop: '0.4rem' }}>
                      <EditableText
                        isEditMode={isEditMode}
                        value={activeSlide.description}
                        onChange={(val) => updateSlide(activeSlide.id, { description: val })}
                        tag="p"
                        multiline={true}
                        className="oe-carousel-desc"
                      />
                    </div>

                    {/* Recipe Item Chips */}
                    {activeSlideRecipeCalc && activeSlideRecipeCalc.lines.length > 0 && (
                      <div className="oe-recipe-Included-tags" aria-label="Items included in this look">
                        {activeSlideRecipeCalc.lines.map((line, i) => (
                          <span key={i} className="oe-recipe-line-tag">
                            ✓ {line.label} (£{line.amount})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={`oe-carousel-price-box ${isEditMode ? 'oe-guide-price-blue-box' : ''}`}>
                      <span style={{ fontWeight: 600 }}>Guide Price:</span>
                      {isEditMode ? (
                        <span className="oe-price-badge-highlight">From £{activeSlideLivePrice}</span>
                      ) : (
                        <strong>
                          {activeSlideLivePrice < activeSlideOriginalPrice && (
                            <span className="oe-price-old">£{activeSlideOriginalPrice}</span>
                          )}
                          <span className={activeSlideLivePrice < activeSlideOriginalPrice ? 'oe-price-new' : ''}>
                            From £{activeSlideLivePrice}
                          </span>
                        </strong>
                      )}
                    </div>

                {isEditMode && openLookRibbonId === activeSlide.id && (
                  <RibbonPickerPopover
                    banner={activeSlide.cornerBanner}
                    onChange={(newBanner) => updateSlide(activeSlide.id, { cornerBanner: newBanner })}
                    onClose={() => setOpenLookRibbonId(null)}
                  />
                )}

                {/* STUDIO MODE: "Compile Look from Stock" Recipe Checklist */}
                {isEditMode && showLookRecipeEditor && (
                  <div className="oe-look-recipe-drawer">
                    <h4>What's in this bundle</h4>
                    <div className="oe-recipe-grid">
                      <div className="oe-recipe-field">
                        <label>Occasion Category</label>
                        <select
                          value={activeSlide.category}
                          onChange={(e) => updateSlide(activeSlide.id, { category: e.target.value })}
                          className="oe-recipe-select"
                        >
                          {inspireCategories.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>1. Signature Palette</label>
                        <select
                          value={activeSlide.preset?.paletteId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { paletteId: e.target.value })}
                          className="oe-recipe-select"
                        >
                          {curatedPalettes.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>2. Backdrop / Wall</label>
                        <select
                          value={activeSlide.preset?.backdropId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { backdropId: e.target.value || null })}
                          className="oe-recipe-select"
                        >
                          <option value="">None (Freestanding)</option>
                          {steps[1].items.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.shortName} (£{b.packageBasePrice || b.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>Wall Size Tier</label>
                        <select
                          value={activeSlide.preset?.shimmerSize || 'small'}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { shimmerSize: e.target.value })}
                          className="oe-recipe-select"
                        >
                          <option value="small">Small Wall (£150)</option>
                          <option value="large">Large Wall (£180)</option>
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>3. Balloon Garland</label>
                        <select
                          value={activeSlide.preset?.balloonId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { balloonId: e.target.value || null })}
                          className="oe-recipe-select"
                        >
                          <option value="">None</option>
                          {steps[2].items.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.shortName} (£{g.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>4. Numbers / Letters</label>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <select
                            value={activeSlide.preset?.digitOptionId || 'digits-none'}
                            onChange={(e) => updateSlidePreset(activeSlide.id, { digitOptionId: e.target.value })}
                            className="oe-recipe-select"
                          >
                            {digitOptions.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          {activeSlide.preset?.digitOptionId && activeSlide.preset.digitOptionId !== 'digits-none' && (
                            <input
                              type="text"
                              maxLength={6}
                              value={activeSlide.preset?.digitText || ''}
                              placeholder="21"
                              onChange={(e) => updateSlidePreset(activeSlide.id, { digitText: e.target.value })}
                              className="oe-inline-edit-input"
                              style={{ width: '58px' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="oe-recipe-field" style={{ marginTop: '0.65rem' }}>
                      <label>5. Finishing Extras (Click to toggle in this Look)</label>
                      <div className="oe-recipe-extras-chips">
                        {steps[4].items.map(ex => {
                          const currentExtras = activeSlide.preset?.extraIds || [];
                          const isIncluded = currentExtras.includes(ex.id);
                          return (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => {
                                const nextExtras = isIncluded
                                  ? currentExtras.filter(id => id !== ex.id)
                                  : [...currentExtras, ex.id];
                                updateSlidePreset(activeSlide.id, { extraIds: nextExtras });
                              }}
                              className={`oe-recipe-chip ${isIncluded ? 'selected' : ''}`}
                            >
                              {isIncluded ? '✓ ' : '+ '}{ex.shortName} (£{ex.price})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="oe-carousel-actions">
                  <button
                    type="button"
                    onClick={() => handleLoadInspirationIntoBuilder(activeSlide.preset)}
                    className="oe-btn-sage-solid"
                  >
                    Start from this look
                  </button>

                  <div className="oe-carousel-arrows">
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex(i => (i - 1 + filteredSlides.length) % filteredSlides.length)
                      }
                      className="oe-arrow-btn"
                      aria-label="Previous look"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex(i => (i + 1) % filteredSlides.length)
                      }
                      className="oe-arrow-btn"
                      aria-label="Next look"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT RAIL: STUDIO INSPECTOR DOCK (MOCKUP MATCH) */}
          {isEditMode && (
            <div className="oe-studio-dock-col" role="region" aria-label="Studio Look Inspector">
              {/* PANEL 1: CORNER BANNER */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">Label and offer</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">Ready-made labels</span>
                    <div className="oe-dock-pills-list">
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'NEW', style: 'gold', discountType: 'none', discountValue: 0 }
                        })}
                        className="oe-dock-pill-btn oe-pill-new"
                      >
                        NEW
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'MOST POPULAR', style: 'coral', discountType: 'none', discountValue: 0 }
                        })}
                        className="oe-dock-pill-btn oe-pill-popular"
                      >
                        MOST POPULAR
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: '10% OFF', style: 'coral', discountType: 'percent', discountValue: 10 }
                        })}
                        className="oe-dock-pill-btn oe-pill-10off"
                      >
                        10% OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: '15% OFF', style: 'coral', discountType: 'percent', discountValue: 15 }
                        })}
                        className="oe-dock-pill-btn oe-pill-15off"
                      >
                        15% OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'SAVE £20', style: 'coral', discountType: 'fixed', discountValue: 20 }
                        })}
                        className="oe-dock-pill-btn oe-pill-save20"
                      >
                        SAVE £20
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="oe-dock-col-label">Your own words</span>
                    <input
                      type="text"
                      value={activeSlide.cornerBanner?.text || ''}
                      placeholder="CUSTOM"
                      onChange={(e) => updateSlide(activeSlide.id, {
                        cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: true, text: e.target.value }
                      })}
                      className="oe-dock-input"
                    />
                    <div className="oe-ribbon-swatch-strip">
                      {[
                        { name: 'gold', bg: '#D4AF37' },
                        { name: 'coral', bg: '#E07A5F' },
                        { name: 'sage', bg: '#7C9082' },
                        { name: 'espresso', bg: '#2C221E' },
                        { name: 'sky', bg: '#6EB9EB' }
                      ].map(sw => (
                        <div
                          key={sw.name}
                          onClick={() => updateSlide(activeSlide.id, {
                            cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: true, style: sw.name }
                          })}
                          className="oe-ribbon-swatch-dot"
                          style={{ background: sw.bg }}
                          title={sw.name}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSlide(activeSlide.id, {
                        cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: false }
                      })}
                      className="oe-dock-action-btn"
                    >
                      Clear Banner
                    </button>
                  </div>
                </div>
              </div>

              {/* PANEL 2: PICK & MIX STOCK */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">What's in this bundle</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">Choose the items</span>
                    <div className="oe-product-tree">
                      {/* Branch 1: Backdrops & Walls */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Backdrops &amp; Walls</span>
                        <div className="oe-tree-items">
                          {steps[1]?.items?.map(b => {
                            const isChecked = activeSlide.preset?.backdropId === b.id;
                            return (
                              <label key={b.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { backdropId: isChecked ? null : b.id })}
                                />
                                <span className="oe-tree-item-name">{b.shortName}</span>
                                <span className="oe-tree-item-price">£{b.packageBasePrice || b.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 2: Garlands & Arches */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Garlands &amp; Arches</span>
                        <div className="oe-tree-items">
                          {steps[2]?.items?.map(g => {
                            const isChecked = activeSlide.preset?.balloonId === g.id;
                            return (
                              <label key={g.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { balloonId: isChecked ? null : g.id })}
                                />
                                <span className="oe-tree-item-name">{g.shortName}</span>
                                <span className="oe-tree-item-price">£{g.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 3: Numbers & Stacks */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Numbers &amp; Stacks</span>
                        <div className="oe-tree-items">
                          {digitOptions?.filter(d => d.type !== 'none').map(d => {
                            const isChecked = activeSlide.preset?.digitOptionId === d.id;
                            return (
                              <label key={d.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { digitOptionId: isChecked ? null : d.id })}
                                />
                                <span className="oe-tree-item-name">{d.shortName || d.name}</span>
                                <span className="oe-tree-item-price">£{d.price || 35}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 4: Finishing Extras */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Finishing Extras</span>
                        <div className="oe-tree-items">
                          {steps[4]?.items?.map(ex => {
                            const isChecked = (activeSlide.preset?.extraIds || []).includes(ex.id);
                            return (
                              <label key={ex.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const cur = activeSlide.preset?.extraIds || [];
                                    const next = isChecked ? cur.filter(id => id !== ex.id) : [...cur, ex.id];
                                    updateSlidePreset(activeSlide.id, { extraIds: next });
                                  }}
                                />
                                <span className="oe-tree-item-name">{ex.shortName}</span>
                                <span className="oe-tree-item-price">£{ex.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="oe-dock-col-label">Offer</span>
                    <div className="oe-discount-input-row" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                      <input
                        type="number"
                        min="0"
                        max={activeSlide.cornerBanner?.discountType === 'percent' ? 100 : undefined}
                        placeholder="0"
                        value={activeSlide.cornerBanner?.discountValue || ''}
                        onChange={(e) => {
                          const rawVal = parseFloat(e.target.value) || 0;
                          const currentType = activeSlide.cornerBanner?.discountType === 'fixed' ? 'fixed' : 'percent';
                          const clampedVal = currentType === 'percent' ? Math.min(100, Math.max(0, rawVal)) : Math.max(0, rawVal);
                          const ribbonText = clampedVal > 0
                            ? (currentType === 'percent' ? `${clampedVal}% OFF` : `SAVE £${clampedVal}`)
                            : (activeSlide.cornerBanner?.text || 'SALE');
                          updateSlide(activeSlide.id, {
                            cornerBanner: {
                              ...(activeSlide.cornerBanner || {}),
                              enabled: clampedVal > 0,
                              discountType: currentType,
                              discountValue: clampedVal,
                              text: ribbonText
                            }
                          });
                        }}
                        className="oe-dock-input oe-discount-num-input"
                        style={{ margin: 0, flex: '1 1 50%', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}
                      />
                      <select
                        value={activeSlide.cornerBanner?.discountType === 'fixed' ? 'fixed' : 'percent'}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          const curVal = activeSlide.cornerBanner?.discountValue || 0;
                          const clampedVal = nextType === 'percent' ? Math.min(100, curVal) : curVal;
                          const ribbonText = clampedVal > 0
                            ? (nextType === 'percent' ? `${clampedVal}% OFF` : `SAVE £${clampedVal}`)
                            : (activeSlide.cornerBanner?.text || 'SALE');
                          updateSlide(activeSlide.id, {
                            cornerBanner: {
                              ...(activeSlide.cornerBanner || {}),
                              enabled: clampedVal > 0,
                              discountType: nextType,
                              discountValue: clampedVal,
                              text: ribbonText
                            }
                          });
                        }}
                        className="oe-dock-input oe-discount-type-select"
                        style={{ margin: 0, flex: '1 1 50%', minWidth: '105px', paddingRight: '1.85rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="percent">% OFF</option>
                        <option value="fixed">£ OFF</option>
                      </select>
                    </div>

                    <span className="oe-dock-col-label" style={{ marginTop: '0.5rem' }}>Guide price</span>
                    <div className="oe-dock-price-display">
                      <span className="price-num">£{activeSlideLivePrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 3: UPLOAD PHOTO */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">Photo</h4>
                <div className="oe-dock-photo-row">
                  <img src={activeSlide.image} alt={activeSlide.title} className="oe-dock-photo-thumb" />
                  <div className="oe-dock-photo-controls">
                    <label className="oe-dock-action-btn" style={{ textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                      SELECT IMAGE FROM FILE
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUploadPhotoForTarget(e.target.files[0], (url) =>
                              updateSlide(activeSlide.id, { image: url, isExampleWatermark: false })
                            );
                          }
                        }}
                      />
                    </label>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#0369A1' }}>
                      <input
                        type="checkbox"
                        checked={activeSlide.isExampleWatermark}
                        onChange={() => updateSlide(activeSlide.id, { isExampleWatermark: !activeSlide.isExampleWatermark })}
                        style={{ accentColor: '#0284C7' }}
                      />
                      EDIT WATERMARK: EXAMPLE (ON)
                    </label>
                    {inspirationSlides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLookSlide(activeSlide.id)}
                        className="oe-dock-action-btn"
                        style={{ border: '1px solid #FCA5A5', color: '#B91C1C', background: '#FEF2F2', padding: '0.25rem 0.4rem', fontSize: '0.65rem' }}
                      >
                        Delete this bundle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          <div className="oe-carousel-thumb-strip">
            {filteredSlides.map((slide, idx) => {
              const thumbCalc = calculateLookRecipePrice(slide.preset, steps, digitOptions, balloonColours, curatedPalettes, slide.cornerBanner);
              const thumbPrice = slide.manualPriceOverride
                ? applyCornerBannerDiscount(slide.guidePrice, slide.cornerBanner)
                : (thumbCalc.finalTotal || slide.guidePrice);
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCarouselIndex(idx)}
                  className={`oe-carousel-thumb-card ${idx === carouselIndex % filteredSlides.length ? 'active' : ''}`}
                >
                  <div className="oe-thumb-img-box">
                    <img src={slide.image} alt={slide.title} loading="lazy" />
                  </div>
                  <div className="oe-thumb-meta">
                    <strong>{slide.title}</strong>
                    <span>From £{thumbPrice}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: BUILD YOUR EDIT */}
      <ProductBuilder
        steps={shop.steps}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        digitOptions={shop.digitOptions}
        bundles={shop.inspirationSlides}
        deliveryZones={deliveryConfig.zones}
        offers={offers}
        externalPreset={externalPreset}
        onClearExternalPreset={() => setExternalPreset(null)}
        onSubmitQuote={handleSubmitCustomerQuote}
        getAvailability={getAvailability}
        isEditMode={isEditMode}
        onUpdateBuilderItem={updateBuilderItem}
        onToggleBuilderItemStock={toggleBuilderItemStock}
        onUpdateDigitOption={updateDigitOption}
        onToggleColourStock={toggleColourStock}
        onUpdateColour={updateColour}
        onAddNewColour={addNewColour}
        onUploadPhotoForTarget={handleUploadPhotoForTarget}
        onSaveCurrentSetupAsLook={handleSaveBuilderSetupAsLook}
      />

      {/* SECTION 4: REDESIGNED INTERACTIVE PRICE GUIDE (Unified with Builder Stock & Prices) */}
      <section id="price-guide" className="oe-pricelist-section">
        <div className="oe-container">
          <div className="oe-pricelist-header-grid">
            <div>
              <h2 className="oe-section-title">Prices</h2>
              <p className="oe-section-subtitle">Every display is made for your venue and your colours.</p>
            </div>

          </div>

          <div className="oe-category-filter-bar">
            {priceSections.map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => setPriceSectionFilter(sec)}
                className={`oe-category-pill ${priceSectionFilter === sec ? 'active' : ''}`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="oe-pricelist-cards-grid">
            {filteredCatalog.map(item => {
              const discPrice = applyCornerBannerDiscount(item.basePrice, item.cornerBanner);
              return (
                <article
                  key={item.id}
                  className={`oe-pricelist-card ${!item.inStock ? 'out-of-stock' : ''} ${item.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                >
                  <CornerRibbon banner={item.cornerBanner} />

                  {item.image && (
                    <div className="oe-pricelist-img-box">
                      <img src={item.image} alt={item.name} className="oe-pricelist-photo" loading="lazy" />
                      {item.image.includes('/examples/') && (
                        <span className="oe-example-photo-tag">Example image</span>
                      )}
                      <span className={`oe-hire-badge oe-hire-badge-float ${item.hireOnly ? 'hire' : 'keep'}`}>
                        {item.hireOnly ? 'Hire' : 'Yours to keep'}
                      </span>
                    </div>
                  )}
                  <div className="oe-pricelist-card-body">
                    <EditableText
                      isEditMode={isEditMode}
                      value={item.name}
                      onChange={(val) => updateCatalogCard(item.id, { name: val })}
                      tag="h3"
                      className="oe-pricelist-item-title"
                    />
                    <EditableText
                      isEditMode={isEditMode}
                      value={item.style}
                      onChange={(val) => updateCatalogCard(item.id, { style: val })}
                      tag="p"
                      className="oe-pricelist-item-desc"
                    />

                    {/* Dedicated Detail Chips Row for Package Pricing */}
                    <div className="oe-pricelist-chips-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0 0.2rem' }}>
                      {item.displayPrices ? item.displayPrices.map(d => {
                        const name = d.label || { none: 'On its own', clusters: 'With corner clusters', garland: 'With a garland', arch: 'With a full archway' }[d.id];
                        const fmt = v => (v == null || v === '' ? 'price to confirm' : `£${v}`);
                        return (
                          <span key={d.id} className="oe-pricelist-detail-chip">
                            {name}: {d.priceLarge !== undefined ? `${fmt(d.price)} small, ${fmt(d.priceLarge)} large` : fmt(d.price)}
                          </span>
                        );
                      }) : item.secondPrice ? (
                        <>
                          <span className="oe-pricelist-detail-chip">
                            {item.name?.toLowerCase().includes('number') || item.name?.toLowerCase().includes('digit') ? '1 digit' : 'Small / Solo'}: £{item.basePrice}
                          </span>
                          <span className="oe-pricelist-detail-chip">
                            {item.name?.toLowerCase().includes('number') || item.name?.toLowerCase().includes('digit') ? '2 digits' : 'Large / Upgrade'}: £{item.secondPrice}
                          </span>
                          {/helium/i.test(item.name || '') && item.secondPrice < item.basePrice * 2 && (
                            <span className="oe-pricelist-detail-chip oe-saving-chip">
                              Save £{item.basePrice * 2 - item.secondPrice} on 2 digits
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="oe-pricelist-card-bottom">
                    <span className="oe-pricelist-price">
                      {!item.inStock && !isEditMode ? (
                        'Not available right now'
                      ) : isEditMode ? (
                        <EditablePrice
                          isEditMode={true}
                          value={item.basePrice}
                          prefix="From £"
                          onChange={(num) => updateCatalogCard(item.id, { basePrice: num, pricingText: `From £${num}` })}
                        />
                      ) : discPrice < item.basePrice ? (
                        <>
                          <span className="oe-price-old">£{item.basePrice}</span>
                          <span className="oe-price-new">From £{discPrice}</span>
                        </>
                      ) : item.secondPrice || item.displayPrices ? (
                        item.basePrice ? `From £${item.basePrice}` : ''
                      ) : (
                        item.pricingText
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadInspirationIntoBuilder(item.builderPreset || {})}
                      className="oe-pricelist-build-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                    >
                      Add to my edit
                    </button>
                  </div>

                  {isEditMode && (
                    <div className="oe-card-edit-overlay-bar" style={{ padding: '0.5rem 1rem 0.85rem' }}>
                      <button
                        type="button"
                        onClick={() => updateCatalogCard(item.id, { inStock: !item.inStock })}
                        className={`oe-mini-admin-btn ${item.inStock ? 'in-stock' : 'out-stock'}`}
                      >
                        {item.inStock ? 'In stock' : 'Out of stock'}
                      </button>
                      <label className="oe-mini-admin-btn">
                        Photo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadPhotoForTarget(e.target.files[0], (url) =>
                                updateCatalogCard(item.id, { image: url })
                              );
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenCatalogRibbonId(openCatalogRibbonId === item.id ? null : item.id)}
                        className="oe-mini-admin-btn"
                      >
                        Label and offer
                      </button>
                    </div>
                  )}

                  {isEditMode && openCatalogRibbonId === item.id && (
                    <div style={{ padding: '0 1rem 1rem' }}>
                      <RibbonPickerPopover
                        banner={item.cornerBanner}
                        onChange={(newBanner) => updateCatalogCard(item.id, { cornerBanner: newBanner })}
                        onClose={() => setOpenCatalogRibbonId(null)}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4B: DELIVERY RADIUS & RATES */}
      <section id="delivery-rates" className="oe-delivery-rates-standalone" aria-label="Delivery Radius and Mileage Rates">
        <DeliveryRadiusMap
          deliveryConfig={deliveryConfig}
          onUpdateDeliveryConfig={setDeliveryConfig}
          isEditMode={isEditMode}
        />
      </section>


      {/* FOOTER */}
      <footer className="oe-footer">
        <div className="oe-footer-inner">
          <div className="oe-footer-brand">
            <img src="public/assets/logo.jpg" alt="The Occasion Edit Logo" className="oe-footer-logo" loading="lazy" />
            <div>
              <p className="oe-footer-title">The Occasion Edit</p>
              <p className="oe-footer-sub">Bespoke Balloon Styling &amp; Prop Hire</p>
              <p className="oe-footer-location">Bottesford, Leicestershire · Serving the Vale of Belvoir &amp; East Midlands</p>
            </div>
          </div>

          <div className="oe-footer-links">
            <button type="button" onClick={() => openLegalModal('terms-and-conditions')} className="oe-footer-btn">
              Terms &amp; Conditions
            </button>
            <button type="button" onClick={() => openLegalModal('privacy-policy')} className="oe-footer-btn">
              Privacy Policy
            </button>
            <button type="button" onClick={() => openLegalModal('cookie-policy')} className="oe-footer-btn">
              Cookie Policy
            </button>
            <button type="button" onClick={() => openLegalModal('booking-agreement')} className="oe-footer-btn">
              Hire Agreement
            </button>
            <button
              type="button"
              onClick={openStudio}
              className="oe-footer-staff-link"
            >
              {isAdminUnlocked ? 'Studio' : 'Staff login'}
            </button>
          </div>
        </div>

        <div className="oe-footer-bottom-bar" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#5E5A52' }}>
            &copy; {new Date().getFullYear()} The Occasion Edit
          </span>
        </div>
      </footer>

      {/* MODAL: OFFERS */}
      {showOffersModal && (
        <div className="oe-modal-backdrop" onClick={() => setShowOffersModal(false)}>
          <div className="oe-modal-panel" onClick={e => e.stopPropagation()}>
            <div className="oe-modal-header">
              <h3>Current Offers &amp; Promotions</h3>
              <button type="button" onClick={() => setShowOffersModal(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>
            <div className="oe-offers-banner-list">
              {offers.filter(o => o.active).map(o => (
                <div key={o.id} className="oe-offer-card">
                  <span className="oe-offer-code">CODE: {o.code}</span>
                  <span>{o.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STUDIO ADMIN PIN UNLOCK */}
      {showPinModal && (
        <div className="oe-modal-backdrop" onClick={() => setShowPinModal(false)}>
          <div className="oe-modal-panel" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="oe-modal-header">
              <h3>Staff login</h3>
              <button type="button" onClick={() => setShowPinModal(false)} className="oe-close-btn">
                Close
              </button>
            </div>
            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#4A4843', margin: 0 }}>
                Enter your PIN to open the Studio.
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                aria-label="Studio PIN"
                placeholder="PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="oe-form-input"
              />
              {pinError && (
                <p style={{ color: '#A33E31', fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{pinError}</p>
              )}
              <button type="submit" className="oe-btn-primary">
                Open the Studio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Master Orders & Stock Dashboard */}
      <MasterOrdersDashboard
        isOpen={showMasterDashboard}
        onClose={() => setStaffMode('customer')}
        staffMode={staffMode}
        onStaffModeChange={setStaffMode}
        onLogOut={handleLockStudio}
        quotes={quotes}
        onUpdateOrder={handleUpdateOrder}
        onAddBooking={handleAddBooking}
        onIssueDocument={handleIssueDocument}
        onDocumentAction={handleDocumentAction}
        documentSource={documentSource}
        onDeleteQuote={handleDeleteQuoteGdpr}
        catalog={catalog}
        steps={steps}
        digitOptions={digitOptions}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        onSaveCuratedPalettes={handleSaveCuratedPalettes}
        onSaveInventoryItem={handleSaveInventoryItem}
        onAddInventoryItem={handleAddInventoryItem}
        onRemoveInventoryItem={handleRemoveInventoryItem}
        onRestoreInventory={handleRestoreInventory}
        inspirationSlides={inspirationSlides}
        onSaveBundles={handleSaveBundles}
        sale={sale}
        onSaveSale={handleSaveSale}
        onSaveDeliveryConfig={handleSaveDeliveryConfig}
        onSaveColours={handleSaveColours}
        onUploadPhoto={handleUploadPhotoForStudio}
        deliveryConfig={deliveryConfig}
        studioSettings={studioSettings}
        onSaveStudioSettings={handleSaveStudioSettings}
        onFetchDriveLinks={handleFetchDriveLinks}
        flashToast={setSaveToast}
      />

      {/* Legal Documents Suite Modal */}
      <LegalDocumentsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialDocId={activeLegalDocId}
        studioSettings={studioSettings}
      />
    </div>
  );
}
