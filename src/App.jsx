import React, { useState, useEffect, useRef } from 'react';
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
  const [showBookingsDrawer, setShowBookingsDrawer] = useState(false);
  const [showSheetSyncDrawer, setShowSheetSyncDrawer] = useState(false);
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
  const [maxBudget, setMaxBudget] = useState(220);
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
    fetch('/api/site-data', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data || !data.ok) return;
        const sd = data.siteData || {};
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
    sheetConfig
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

  const isDirty = isAdminUnlocked && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

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
    flashToast('↺ Changes discarded.');
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

  const openStudio = () => {
    if (IS_PREVIEW_BUILD) {
      setIsAdminUnlocked(true);
      setShowMasterDashboard(true);
      return;
    }
    if (isAdminUnlocked) setShowMasterDashboard(true);
    else setShowPinModal(true);
  };

  const handleSaveCuratedPalettes = async (nextPalettes) => {
    setCuratedPalettes(nextPalettes);
    if (IS_PREVIEW_BUILD) return true;
    return handleSaveAndPublish(false, { ...buildSiteDataPayload(), curatedPalettes: nextPalettes });
  };

  // Business and bank details live on the studio server, not in the public site data
  useEffect(() => {
    if (!isAdminUnlocked) return;
    fetch('/api/admin/settings', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.ok && data.settings) setStudioSettings(data.settings); })
      .catch(() => {});
  }, [isAdminUnlocked]);

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
        setIsEditMode(true);
        setCsrfToken(data.csrfToken);
        setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
        setShowPinModal(false);
        setPinInput('');
        flashToast('✦ Studio Mode Unlocked · Click any text, price, or photo to edit directly.');
        fetchAdminQuotes();
      } else {
        setPinError(data.error || 'Incorrect Studio PIN.');
      }
    } catch (_err) {
      if (pinInput.trim() === '2026') {
        setIsAdminUnlocked(true);
        setIsEditMode(true);
        setShowPinModal(false);
        setPinInput('');
        flashToast('✦ Studio Mode Unlocked (Local Preview)');
      } else {
        setPinError('Incorrect Studio PIN.');
      }
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

  const handleOpenBookingsDrawer = async () => {
    setShowBookingsDrawer(true);
    await fetchAdminQuotes();
    if (unreadEnquiriesCount > 0) {
      try {
        await fetch('/api/quotes/mark-seen', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-CSRF-Token': csrfToken || '' }
        });
        setUnreadEnquiriesCount(0);
      } catch (_e) {}
    }
  };

  const handleUpdateQuoteStatus = async (quoteId, newStatus, depositVal = null) => {
    const before = quotes;
    setQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const nextQ = { ...q, status: newStatus };
        if (depositVal !== null && depositVal !== undefined) {
          const cfg = nextQ.configuration || {};
          const dep = parseFloat(depositVal) || 0;
          const tot = parseFloat(cfg.estimatedTotal || cfg.subtotal || 0);
          nextQ.configuration = {
            ...cfg,
            depositPaid: dep,
            balanceDue: Math.max(0, Math.round((tot - dep) * 100) / 100)
          };
        }
        return nextQ;
      }
      return q;
    }));
    if (IS_PREVIEW_BUILD) return;
    try {
      const payload = { status: newStatus };
      if (depositVal !== null && depositVal !== undefined) {
        payload.depositPaid = parseFloat(depositVal) || 0;
      }
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'not saved');
      if (typeof data.unreadEnquiriesCount === 'number') {
        setUnreadEnquiriesCount(data.unreadEnquiriesCount);
      }
    } catch (_e) {
      setQuotes(before);
      flashToast("That change wasn't saved. Check your connection and try again.");
    }
  };

  const handleDeleteQuoteGdpr = async (quoteId, clientName) => {
    if (!window.confirm(`Permanently erase enquiry ${quoteId} (${clientName}) from the website and Google Sheets for UK GDPR compliance?`)) {
      return;
    }
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    if (IS_PREVIEW_BUILD) return;
    try {
      await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken || '' }
      });
      flashToast(`🗑 Erased enquiry ${quoteId} (GDPR).`);
    } catch (_e) {}
  };

  const handleExportSafeCsv = () => {
    const headers = ['Enquiry ID', 'Received At', 'Status', 'Client Name', 'Phone', 'Email', 'Event Date', 'Postcode', 'Palette', 'Backdrop', 'Garland', 'Digits/Letters', 'Extras', 'Estimated Total (GBP)', 'Notes'];
    const rows = quotes.map(q => [
      sanitizeCsvCell(q.id),
      sanitizeCsvCell(q.createdAt),
      sanitizeCsvCell(q.status || 'New Enquiry'),
      sanitizeCsvCell(q.client?.name),
      sanitizeCsvCell(q.client?.phone),
      sanitizeCsvCell(q.client?.email),
      sanitizeCsvCell(q.client?.eventDate),
      sanitizeCsvCell(q.client?.postcode),
      sanitizeCsvCell((q.configuration?.palette || []).join(', ')),
      sanitizeCsvCell(q.configuration?.backdrop),
      sanitizeCsvCell(q.configuration?.balloonLayout),
      sanitizeCsvCell(q.configuration?.digitsOrLetters),
      sanitizeCsvCell((q.configuration?.extras || []).join(', ')),
      sanitizeCsvCell(q.configuration?.estimatedTotal),
      sanitizeCsvCell(q.client?.notes)
    ]);
    const csvContent = [headers.map(sanitizeCsvCell).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-occasion-edit-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          flashToast('📷 Photo uploaded & EXIF GPS stripped! Click "Save & Publish" to make permanent.');
          return;
        }
      } catch (_e) {}
      applyUrlCallback(compressedDataUrl);
      flashToast('📷 Photo updated! Click "Save & Publish" to save.');
    } catch (err) {
      flashToast(`⚠️ Photo error: ${err.message}`);
    }
  };

  // Pull Latest Prices & Stock from Google Sheet (Two-Way Sync)
  const handlePullFromGoogleSheet = async () => {
    if (!sheetConfig.webAppUrl) {
      flashToast('⚠️ Paste your Google Apps Script Web App URL first.');
      return;
    }
    flashToast('⏳ Pulling latest prices & stock from Google Sheets...');
    try {
      const res = await fetch('/api/sync-from-sheet', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ webAppUrl: sheetConfig.webAppUrl })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.sheetRevisionMs) setLoadedSheetRevisionMs(data.sheetRevisionMs);
        if (Array.isArray(data.balloonColours) && data.balloonColours.length > 0) setBalloonColours(data.balloonColours);
        if (Array.isArray(data.inspirationSlides) && data.inspirationSlides.length > 0) setInspirationSlides(data.inspirationSlides);
        if (Array.isArray(data.offers) && data.offers.length > 0) setOffers(data.offers);
        if (Array.isArray(data.builderItems) && data.builderItems.length > 0) {
          setSteps(prevSteps =>
            prevSteps.map(st => ({
              ...st,
              items: st.items.map(it => {
                const match = data.builderItems.find(b => b.id === it.id);
                return match
                  ? {
                      ...it,
                      name: match.name || it.name,
                      price: Number(match.price ?? it.price),
                      packageBasePrice: match.packageBasePrice ? Number(match.packageBasePrice) : it.packageBasePrice,
                      packageLargePrice: match.packageLargePrice ? Number(match.packageLargePrice) : it.packageLargePrice,
                      inStock: Boolean(match.inStock),
                      image: match.image || it.image
                    }
                  : it;
              })
            }))
          );
        }
        flashToast('✓ Synced latest prices & stock from Google Sheet!');
      } else {
        flashToast(`⚠️ Sheet sync failed: ${data.error || 'Check Web App URL'}`);
      }
    } catch (_e) {
      flashToast('⚠️ Could not reach Google Sheet Web App.');
    }
  };

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
    flashToast(`✓ Updated colour shade to "${patch.name || 'Custom'}"`);
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
    flashToast(`✨ Added new shade #${nextCode}: ${newColour.name}!`);
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
    flashToast('✦ Added new Lookbook card! Use "Compile Look from Stock" below to pick its items.');
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
    flashToast('✨ Saved your 3D Builder setup as a new Lookbook Card!');
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
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'The enquiry could not be saved.');
    }
    if (data.ignored) return data;
    setQuotes(prev => [{ ...quotePayload, id: data.quoteId || quotePayload.id }, ...prev]);
    setUnreadEnquiriesCount(prev => prev + 1);
    return data;
  };

  const inspireCategories = ['All', 'Birthdays', 'Baby Showers', 'Anniversaries', 'Parties'];
  const filteredSlides = inspirationSlides.filter(
    s => inspireCategory === 'All' || s.category === inspireCategory
  );
  const activeSlide = filteredSlides[carouselIndex % Math.max(1, filteredSlides.length)] || inspirationSlides[0];
  const activeSlideRecipeCalc = activeSlide
    ? calculateLookRecipePrice(activeSlide.preset, steps, digitOptions, balloonColours, curatedPalettes, activeSlide.cornerBanner)
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

  const priceSections = ['All', 'Backdrops, Walls & Garlands', 'Numbers, Helium & Gifts', 'Hire Props & Finishing Extras'];
  const filteredCatalog = unifiedCatalog.filter(item => {
    const matchesSection = priceSectionFilter === 'All' || item.section === priceSectionFilter;
    const matchesBudget = item.basePrice <= maxBudget;
    return matchesSection && matchesBudget;
  });

  return (
    <div className="oe-site-wrapper">
      {IS_PREVIEW_BUILD && (
        <div className="oe-preview-banner" role="note">
          Preview of the new website · orders are not sent · the Studio shows a demo order
        </div>
      )}
      {/* STICKY STUDIO ADMIN TOP BAR (Calm STUDIO OS) */}
      {isAdminUnlocked && (
        <div className="oe-studio-topbar" role="region" aria-label="Studio Admin Controls">
          <div className="oe-studio-topbar-left">
            <span className="oe-studio-mode-pill">
              ✦ STUDIO OS
            </span>

            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`oe-studio-bar-btn ${isEditMode ? 'active-toggle' : ''}`}
            >
              {isEditMode ? '✎ Edit Directly' : '👁 Customer View'}
            </button>

            <button
              type="button"
              onClick={() => setShowMasterDashboard(true)}
              className="oe-studio-bar-btn"
            >
              📊 Master Sheet &amp; Orders ({quotes.length})
              {unreadEnquiriesCount > 0 && (
                <span className="oe-notif-badge">🔔 {unreadEnquiriesCount} New</span>
              )}
            </button>
          </div>

          <div className="oe-studio-topbar-right">
            {isDirty && (
              <span className="oe-unsaved-badge">● Unsaved changes</span>
            )}
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="oe-studio-bar-btn discard-btn"
                title="Discard unsaved edits and restore published website"
              >
                ↺ Discard
              </button>
            )}
            {saveToast && (
              <span style={{ color: '#F3DFB2', fontWeight: 700, fontSize: '0.75rem' }}>
                {saveToast}
              </span>
            )}
            <button
              type="button"
              disabled={isSavingSite}
              onClick={() => handleSaveAndPublish(false)}
              className="oe-studio-bar-btn save-btn"
            >
              {isSavingSite ? 'Saving...' : '💾 Save & Publish'}
            </button>
            <button
              type="button"
              onClick={handleLockStudio}
              className="oe-studio-bar-btn"
              title="Lock Studio Admin"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: MOCKUP V1 HERO WITH CENTERED ANIMATED LOGO */}
      <header id="top" className="oe-hero-section">
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

            <span className="oe-hero-the">THE</span>
            <h1 className="oe-hero-title">
              <span>Occasion</span>
              <span className="oe-hero-edit-word">Edit</span>
            </h1>
            <a href="#build-your-edit" className="oe-hero-primary-btn">
              BUILD YOURS NOW
            </a>
          </div>
        </div>

        <nav className="oe-hero-floating-nav" aria-label="Primary Navigation">
          <a href="#build-your-edit" className="oe-hero-nav-link">
            BUILD YOUR OWN
          </a>
          <a href="#be-inspired" className="oe-hero-nav-link">
            BE INSPIRED
          </a>
          <a href="#price-guide" className="oe-hero-nav-link">
            PRICE GUIDE
          </a>
          <a href="#delivery-rates" className="oe-hero-nav-link">
            DELIVERY &amp; RATES
          </a>
          <a href="#faq" className="oe-hero-nav-link">
            FAQ
          </a>
          <button
            type="button"
            onClick={() => setShowOffersModal(true)}
            className="oe-hero-offers-pill"
          >
            OFFERS
          </button>
          <button
            type="button"
            onClick={openStudio}
            className="oe-hero-offers-pill"
            style={{ background: '#1C1E1B', color: '#C5A059', border: '1.5px solid #C5A059', marginLeft: '0.45rem', fontWeight: 800 }}
          >
            ✦ STUDIO OS
          </button>
        </nav>
      </header>

      {/* SECTION 2: GET INSPIRED (Categories + Carousel with EXAMPLE Watermarks & Live Stock Recipe Compiler) */}
      <section id="be-inspired" className="oe-inspire-section">
        <div className="oe-container">
          <div className="oe-section-header-center">
            <span className="oe-eyebrow">CURATED LOOKBOOK</span>
            <h2 className="oe-section-title">Get Inspired</h2>
            <p className="oe-section-subtitle">
              Browse our signature event setups by occasion · click any template to load its exact colours and items straight into the builder.
            </p>

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
                      <span className="oe-carousel-counter">
                        LOOK 0{(carouselIndex % filteredSlides.length) + 1} OF 0{filteredSlides.length}
                      </span>
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
                      ) : (
                        <span className="oe-carousel-category-badge">{activeSlide.category}</span>
                      )}
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
                    <h4>🧩 Compile This Look&apos;s Recipe from Live Stock</h4>
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
                    Customise This Look →
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
                <h4 className="oe-dock-title">CORNER BANNER</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">PRE-BUILT</span>
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
                    <span className="oe-dock-col-label">CUSTOM BANNER</span>
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
                <h4 className="oe-dock-title">PICK &amp; MIX STOCK</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">SELECT STOCK RECIPE</span>
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
                    <span className="oe-dock-col-label">APPLY DISCOUNT</span>
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

                    <span className="oe-dock-col-label" style={{ marginTop: '0.5rem' }}>LOOK GUIDE PRICE</span>
                    <div className="oe-dock-price-display">
                      <span className="price-num">£{activeSlideLivePrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 3: UPLOAD PHOTO */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">UPLOAD PHOTO</h4>
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
                        🗑 Delete Look Card
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
                    {slide.isExampleWatermark && (
                      <span className="oe-thumb-watermark">EXAMPLE</span>
                    )}
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
        steps={steps}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        digitOptions={digitOptions}
        offers={offers}
        externalPreset={externalPreset}
        onClearExternalPreset={() => setExternalPreset(null)}
        onSubmitQuote={handleSubmitCustomerQuote}
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
              <span className="oe-eyebrow">OUR COLLECTION</span>
              <h2 className="oe-section-title">Price List &amp; Budget Explorer</h2>
              <p className="oe-section-subtitle">
                Every display is tailored to your venue and colour palette. Filter by category or use the budget slider to explore our options.
              </p>
            </div>

            <div className="oe-budget-explorer-card">
              <div className="oe-budget-card-top">
                <label htmlFor="price-budget-slider">Filter by Budget:</label>
                <strong className="oe-budget-amount-badge">Up to £{maxBudget}</strong>
              </div>
              <input
                id="price-budget-slider"
                type="range"
                min="35"
                max="220"
                step="5"
                value={maxBudget}
                onChange={e => setMaxBudget(Number(e.target.value))}
                className="oe-accessible-range"
              />
              <div className="oe-budget-scale-labels">
                <span>£35 (Stacks &amp; Orbs)</span>
                <span>£105 (Garlands)</span>
                <span>£180+ (Shimmer Walls)</span>
              </div>
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
                        {item.hireOnly ? 'Hire Only' : 'Yours to Keep'}
                      </span>
                    </div>
                  )}
                  <div className="oe-pricelist-card-body">
                    <div className="oe-pricelist-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="oe-pricelist-cat-tag">{item.category}</span>
                      {item.tier && (
                        <span className={`oe-tier-pill ${item.tier.toLowerCase()}`}>
                          {item.tier.toUpperCase()}
                        </span>
                      )}
                    </div>
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
                      {item.secondPrice ? (
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
                      ) : (
                        <span className="oe-pricelist-detail-chip">
                          Package: £{item.basePrice}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="oe-pricelist-card-bottom">
                    <span className="oe-pricelist-price">
                      {!item.inStock && !isEditMode ? (
                        'Currently Unavailable'
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
                      + Add to Edit
                    </button>
                  </div>

                  {isEditMode && (
                    <div className="oe-card-edit-overlay-bar" style={{ padding: '0.5rem 1rem 0.85rem' }}>
                      <button
                        type="button"
                        onClick={() => updateCatalogCard(item.id, { inStock: !item.inStock })}
                        className={`oe-mini-admin-btn ${item.inStock ? 'in-stock' : 'out-stock'}`}
                      >
                        {item.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                      </button>
                      <label className="oe-mini-admin-btn">
                        📷 Photo
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
                        🎀 Ribbon
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

      {/* SECTION 5: EDITORIAL FAQ & LOCAL SERVICE AREA COVERAGE (AIEO + SEO) */}
      <section id="faq" className="oe-faq-section" aria-label="Frequently Asked Questions and Service Areas">
        <div className="oe-container">
          <div className="oe-section-header-center">
            <span className="oe-eyebrow">GOOD TO KNOW</span>
            <h2 className="oe-section-title">Frequently Asked Questions</h2>
            <p className="oe-section-subtitle">
              Everything you need to know about our prop hire, bespoke installations, and delivery across Bottesford, the Vale of Belvoir &amp; East Midlands borders.
            </p>
          </div>

          <div className="oe-faq-grid">
            {faqs.map((faq, idx) => (
              <article key={faq.id || idx} className="oe-faq-item">
                <EditableText
                  isEditMode={isEditMode}
                  value={faq.question}
                  onChange={(val) =>
                    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, question: val } : f)))
                  }
                  tag="h3"
                  className="oe-faq-question"
                />
                <EditableText
                  isEditMode={isEditMode}
                  value={faq.answer}
                  onChange={(val) =>
                    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, answer: val } : f)))
                  }
                  tag="p"
                  multiline={true}
                  className="oe-faq-answer"
                />
              </article>
            ))}
          </div>

          <div className="oe-service-area-banner">
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E805E' }}>
                Areas We Cover ({seoSettings.postcodePrefixes})
              </strong>
              <EditableText
                isEditMode={isEditMode}
                value={seoSettings.serviceAreas}
                onChange={(val) => setSeoSettings({ ...seoSettings, serviceAreas: val })}
                tag="p"
                className="oe-faq-answer"
              />
            </div>
            <a href="#build-your-edit" className="oe-btn-sage-solid">
              Start Your Custom Edit →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="oe-footer">
        <div className="oe-footer-inner">
          <div className="oe-footer-brand">
            <img src="public/assets/logo.jpg" alt="The Occasion Edit Logo" className="oe-footer-logo" loading="lazy" />
            <div>
              <p className="oe-footer-title">THE OCCASION EDIT</p>
              <p className="oe-footer-sub">Bespoke Balloon Styling &amp; Prop Hire</p>
              <p className="oe-footer-location">📍 Bottesford, Leicestershire · Serving the Vale of Belvoir &amp; East Midlands</p>
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
            <button type="button" onClick={() => setShowOffersModal(true)} className="oe-footer-btn">
              Current Offers
            </button>
            <button
              type="button"
              onClick={() => {
                if (IS_PREVIEW_BUILD) {
                  openStudio();
                } else if (isAdminUnlocked) {
                  setIsEditMode(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setShowPinModal(true);
                }
              }}
              className="oe-footer-btn oe-footer-admin-btn"
            >
              {isAdminUnlocked ? `✦ Studio Mode Active (${quotes.length})` : 'Studio Admin'}
            </button>
          </div>
        </div>

        <div className="oe-footer-bottom-bar" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#7A756D' }}>
            &copy; {new Date().getFullYear()} THE Occasion Edit · Bespoke Balloon Styling &amp; Prop Hire · Bottesford, Leicestershire
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
              <h3>Unlock Studio Edit Mode</h3>
              <button type="button" onClick={() => setShowPinModal(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>
            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#4A4843', margin: 0 }}>
                Enter your Studio PIN to edit prices, stock, photos, corner banners, and view customer enquiries directly on the page.
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                placeholder="Studio PIN (e.g. 2026)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="oe-form-input"
              />
              {pinError && (
                <p style={{ color: '#A33E31', fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{pinError}</p>
              )}
              <button type="submit" className="oe-btn-primary">
                Unlock Studio Mode →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: ENQUIRIES & BOOKINGS */}
      {showBookingsDrawer && (
        <div className="oe-admin-drawer-backdrop" onClick={() => setShowBookingsDrawer(false)}>
          <aside className="oe-admin-drawer" onClick={e => e.stopPropagation()} aria-label="Customer Enquiries Drawer">
            <div className="oe-admin-drawer-header">
              <div>
                <h3>Customer Enquiries &amp; Bookings ({quotes.length})</h3>
                <p style={{ fontSize: '0.78rem', color: '#5C5852', margin: '0.2rem 0 0' }}>
                  Every enquiry includes the client&apos;s live 3D visual build snapshot and 1-tap WhatsApp reply.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                {quotes.length > 0 && (
                  <button type="button" onClick={handleExportSafeCsv} className="oe-mini-admin-btn">
                    ⬇ Safe CSV
                  </button>
                )}
                <button type="button" onClick={() => setShowBookingsDrawer(false)} className="oe-close-btn">
                  CLOSE ×
                </button>
              </div>
            </div>

            {quotes.length === 0 ? (
              <p className="oe-admin-empty">No customer enquiries received yet.</p>
            ) : (
              quotes.map(q => {
                const cleanPhone = (q.client?.phone || '').replace(/\D+/g, '').replace(/^0/, '44');
                const waText = encodeURIComponent(
                  `Hi ${q.client?.name || ''}! Thank you for sending your custom Occasion Edit enquiry for ${q.client?.eventDate || 'your event'} (${q.configuration?.backdrop || 'Custom Display'}, est. £${q.configuration?.estimatedTotal || 0}). We'd love to check availability for you!`
                );
                return (
                  <div key={q.id} className="oe-booking-card">
                    <div>
                      {q.previewSnapshotDataUrl ? (
                        <img
                          src={q.previewSnapshotDataUrl}
                          alt="Customer 3D Build Snapshot"
                          className="oe-booking-snapshot"
                        />
                      ) : (
                        <div className="oe-booking-snapshot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#8C857B', textAlign: 'center', padding: '0.5rem' }}>
                          3D Build Snapshot
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.98rem' }}>{q.client?.name}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#5C5852' }}>
                            Event Date: <strong>{q.client?.eventDate || 'TBC'}</strong> · Postcode: <strong>{q.client?.postcode || 'TBC'}</strong>
                          </span>
                        </div>
                        <strong style={{ fontSize: '1.05rem', color: '#6E805E' }}>
                          £{q.configuration?.estimatedTotal}
                        </strong>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#3B3834', marginTop: '0.45rem', lineHeight: 1.45 }}>
                        <div><strong>Palette:</strong> {(q.configuration?.palette || []).join(', ')}</div>
                        <div><strong>Backdrop:</strong> {q.configuration?.backdrop} · <strong>Garland:</strong> {q.configuration?.balloonLayout}</div>
                        <div><strong>Numbers/Letters:</strong> {q.configuration?.digitsOrLetters}</div>
                        <div><strong>Extras:</strong> {(q.configuration?.extras || []).join(', ') || 'None'}</div>
                        {q.client?.notes && <div><strong>Notes:</strong> &ldquo;{q.client.notes}&rdquo;</div>}
                      </div>

                      <div className="oe-booking-actions-row">
                        <select
                          value={q.status || 'New Enquiry'}
                          onChange={(e) => handleUpdateQuoteStatus(q.id, e.target.value)}
                          className="oe-recipe-select"
                          style={{ width: 'auto' }}
                        >
                          <option value="New Enquiry">New Enquiry</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Deposit Paid">Deposit Paid</option>
                          <option value="Completed">Completed</option>
                        </select>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="oe-wa-btn"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                        {q.client?.phone && (
                          <a href={`tel:${q.client.phone}`} className="oe-contact-pill">
                            📞 {q.client.phone}
                          </a>
                        )}
                        {q.client?.email && (
                          <a href={`mailto:${q.client.email}`} className="oe-contact-pill">
                            ✉️ Email
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuoteGdpr(q.id, q.client?.name)}
                          className="oe-mini-admin-btn danger"
                        >
                          🗑 Delete (GDPR)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </aside>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: GOOGLE SHEET TWO-WAY SYNC */}
      {showSheetSyncDrawer && (
        <div className="oe-admin-drawer-backdrop" onClick={() => setShowSheetSyncDrawer(false)}>
          <aside className="oe-admin-drawer" onClick={e => e.stopPropagation()} aria-label="Google Sheet Sync Settings">
            <div className="oe-admin-drawer-header">
              <h3>📊 Two-Way Google Sheet Sync</h3>
              <button type="button" onClick={() => setShowSheetSyncDrawer(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: '#4A4843', margin: 0 }}>
              Connect your Google Sheet (powered by <code>GoogleAppsScript.gs</code>) so every customer quote automatically logs to <strong>1_Bookings_and_Quotes</strong>, and you can sync prices &amp; stock both ways.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="oe-field-label">Google Apps Script Web App URL (Ends in /exec)</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetConfig.webAppUrl || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, webAppUrl: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div>
                <label className="oe-field-label">Your Google Sheet URL (For 1-Click Open)</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetConfig.sheetUrl || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, sheetUrl: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div>
                <label className="oe-field-label">Admin Sync Secret (Matches Script Properties ADMIN_SYNC_SECRET)</label>
                <input
                  type="password"
                  placeholder="e.g. occasion-edit-sync-2026"
                  value={sheetConfig.adminSecret || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, adminSecret: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSaveAndPublish(false)}
                  className="oe-btn-primary"
                >
                  💾 Save Sheet Connection &amp; Push Website Data
                </button>

                <button
                  type="button"
                  onClick={handlePullFromGoogleSheet}
                  className="oe-btn-secondary"
                >
                  ↻ Pull Latest Prices &amp; Stock from Sheet
                </button>

                {sheetConfig.sheetUrl && (
                  <a
                    href={sheetConfig.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-contact-pill"
                    style={{ padding: '0.65rem 1rem', fontWeight: 700 }}
                  >
                    Open My Google Sheet ↗
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Master Orders & Stock Dashboard */}
      <MasterOrdersDashboard
        isOpen={showMasterDashboard}
        onClose={() => setShowMasterDashboard(false)}
        quotes={quotes}
        onUpdateQuoteStatus={handleUpdateQuoteStatus}
        onDeleteQuote={handleDeleteQuoteGdpr}
        catalog={catalog}
        steps={steps}
        digitOptions={digitOptions}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        onSaveCuratedPalettes={handleSaveCuratedPalettes}
        deliveryConfig={deliveryConfig}
        studioSettings={studioSettings}
        onSaveStudioSettings={handleSaveStudioSettings}
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
