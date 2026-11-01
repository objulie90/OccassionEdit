import React, { useState, useEffect, useRef } from 'react';
import {
  calculateLookRecipePrice,
  applyCornerBannerDiscount
} from '../data/catalogData.js';
import { ProductPreview } from './ProductPreview';
import { BalloonGraphic, EditableText, EditablePrice, VisualColourPicker, CornerRibbon, RibbonPickerPopover } from './ui';
import { captureSvgSnapshotDataUrl } from '../lib/media';
import { EventStep, formatEventDate } from './EventStep';
import { picksFor, stylePicksFor, offerLine } from '../lib/upsell';
import { BOOKING_TERMS } from '../lib/terms';

/**
 * ProductBuilder Component — Simple, clean two-panel builder using "Our" wording
 * Now powered by the unified calculateLookRecipePrice engine & Carbon-Copy Studio Edit Mode.
 */
export function ProductBuilder({
  steps,
  balloonColours,
  curatedPalettes,
  digitOptions,
  offers,
  externalPreset,
  onClearExternalPreset,
  onSubmitQuote,
  getAvailability,
  isEditMode,
  onUpdateBuilderItem,
  onToggleBuilderItemStock,
  onUpdateDigitOption,
  onToggleColourStock,
  onUpdateColour,
  onAddNewColour,
  onUploadPhotoForTarget,
  onSaveCurrentSetupAsLook
}) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [paletteMode, setPaletteMode] = useState('curated');
  // The builder starts empty: every choice is the customer's
  const [activePaletteId, setActivePaletteId] = useState(null);
  const [shimmerSize, setShimmerSize] = useState('small');
  const [isDragOver, setIsDragOver] = useState(false);
  const [openRibbonItemId, setOpenRibbonItemId] = useState(null);
  const [editingColourTarget, setEditingColourTarget] = useState(null); // { id, name, hex, finish, isNew }

  const canvasWrapRef = useRef(null);
  const formStartTimeRef = useRef(Date.now());

  const [selectedColours, setSelectedColours] = useState([]);

  const [selection, setSelection] = useState({
    backdrop: null,
    balloons: null,
    extras: []
  });

  const [digitSelection, setDigitSelection] = useState(digitOptions[0]);
  const [digitText, setDigitText] = useState('');

  const [boardCustomization, setBoardCustomization] = useState({
    color: '#F5EFEB',
    colorName: 'Warm Ivory',
    text: '',
    vinylColor: 'gold'
  });
  const [neonPhrase, setNeonPhrase] = useState('Happy Birthday');
  const [bubbleText, setBubbleText] = useState('');

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteSubmitError, setQuoteSubmitError] = useState('');
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    accessTime: '10:00',
    venueName: '',
    postcode: '',
    setting: 'indoor',
    notes: '',
    occasion: '',
    occasionOther: '',
    hasVenue: '',
    area: '',
    hasBudget: '',
    budget: 0,
    style: '',
    placeConfirmed: false
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Step 0: the customer's date and postcode decide which hire props can be offered
  const [eventConfirmed, setEventConfirmed] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [availabilityNote, setAvailabilityNote] = useState('');
  const isBookedOut = (item) =>
    !!(item && item.hireOnly && availability?.valid && (availability.items?.[item.id]?.free ?? 1) < 1);
  const eventDateLabel = formatEventDate(clientForm.eventDate);

  // A prop picked before the date was known comes off the edit if it's booked that day
  useEffect(() => {
    if (!availability) return;
    const booked = [selection.backdrop, ...selection.extras].filter(isBookedOut);
    if (booked.length === 0) return;
    setSelection(prev => ({
      ...prev,
      backdrop: isBookedOut(prev.backdrop) ? null : prev.backdrop,
      extras: prev.extras.filter(ex => !isBookedOut(ex))
    }));
    setAvailabilityNote(`${booked.map(b => b.name).join(' and ')} ${booked.length > 1 ? 'are' : 'is'} already booked for ${eventDateLabel}, so we've taken ${booked.length > 1 ? 'them' : 'it'} off your edit.`);
  }, [availability]);

  // Keep selected items synchronized when prices/stock/banners are edited live in Studio Mode
  useEffect(() => {
    setSelection(prev => {
      const updatedBackdrop = prev.backdrop
        ? steps[1].items.find(i => i.id === prev.backdrop.id) || prev.backdrop
        : null;
      const updatedBalloons = prev.balloons
        ? steps[2].items.find(i => i.id === prev.balloons.id) || prev.balloons
        : null;
      const updatedExtras = (prev.extras || [])
        .map(ex => steps[4].items.find(i => i.id === ex.id) || ex)
        .filter(Boolean);
      return {
        backdrop: updatedBackdrop,
        balloons: updatedBalloons,
        extras: updatedExtras
      };
    });
    setDigitSelection(prev => digitOptions.find(d => d.id === prev?.id) || prev);
  }, [steps, digitOptions]);

  useEffect(() => {
    if (!externalPreset) return;
    if (externalPreset.paletteId) {
      const pal = curatedPalettes.find(p => p.id === externalPreset.paletteId);
      if (pal) {
        setActivePaletteId(pal.id);
        setPaletteMode('curated');
        setSelectedColours(
          pal.colourIds.map(id => balloonColours.find(c => c.id === id)).filter(Boolean)
        );
      }
    }
    if (externalPreset.shimmerSize) {
      setShimmerSize(externalPreset.shimmerSize);
    }
    const backdropItem = externalPreset.backdropId === null
      ? null
      : (steps[1].items.find(i => i.id === externalPreset.backdropId) || null);
    const balloonItem = externalPreset.balloonId === null
      ? null
      : (steps[2].items.find(i => i.id === externalPreset.balloonId) || null);
    const extraItems = (externalPreset.extraIds || [])
      .map(id => steps[4].items.find(i => i.id === id))
      .filter(Boolean);
    setSelection({
      backdrop: backdropItem,
      balloons: balloonItem,
      extras: extraItems
    });
    if (externalPreset.digitOptionId) {
      const dOpt = digitOptions.find(d => d.id === externalPreset.digitOptionId);
      if (dOpt) setDigitSelection(dOpt);
    }
    if (typeof externalPreset.digitText === 'string') {
      setDigitText(externalPreset.digitText);
    }
    onClearExternalPreset();
  }, [externalPreset]);

  const currentStep = steps[activeStepIndex];

  // Unified Recipe Pricing Engine (Matches Lookbook & Corner Banners 100%)
  const currentRecipe = {
    paletteId: activePaletteId,
    backdropId: selection.backdrop?.id || null,
    shimmerSize,
    balloonId: selection.balloons?.id || null,
    digitOptionId: digitSelection?.id || 'digits-none',
    digitText,
    extraIds: (selection.extras || []).map(e => e.id)
  };

  const recipeCalc = calculateLookRecipePrice(
    currentRecipe,
    steps,
    digitOptions,
    balloonColours,
    curatedPalettes
  );
  const lineItems = recipeCalc.lines;
  const subtotal = recipeCalc.finalTotal;

  const calculateFinalTotal = () => {
    if (!appliedOffer) return subtotal;
    if (appliedOffer.discountPercent) {
      return Math.round(subtotal * (1 - appliedOffer.discountPercent / 100));
    }
    if (appliedOffer.discountFixed && (!appliedOffer.minSpend || subtotal >= appliedOffer.minSpend)) {
      return Math.max(0, subtotal - appliedOffer.discountFixed);
    }
    return subtotal;
  };

  const finalTotal = calculateFinalTotal();

  // Upselling: framed against their budget and what they've already chosen
  const budget = clientForm.hasBudget === 'yes' ? Number(clientForm.budget) || 0 : 0;
  const picks = picksFor(clientForm.occasion);
  const stylePicks = stylePicksFor(clientForm.style);
  const isPick = (id) => !!(picks && picks.ids.includes(id));
  const isStylePick = (id) => !isPick(id) && !!(stylePicks && stylePicks.includes(id));
  const totalWith = (patch) =>
    calculateLookRecipePrice({ ...currentRecipe, ...patch }, steps, digitOptions, balloonColours, curatedPalettes).finalTotal;
  const offerFor = (stepId, item, isSelected) => {
    const patch = stepId === 'backdrop' ? { backdropId: item.id }
      : stepId === 'balloons' ? { balloonId: item.id }
      : stepId === 'extras' ? { extraIds: [...currentRecipe.extraIds, item.id] }
      : { digitOptionId: item.id };
    const hasCurrentChoice = stepId === 'backdrop' ? !!selection.backdrop
      : stepId === 'balloons' ? !!selection.balloons
      : stepId === 'digits' ? !!digitSelection && digitSelection.type !== 'none'
      : false;
    return offerLine({
      name: item.shortName || item.name,
      isSelected,
      isAddOn: stepId === 'extras',
      hasCurrentChoice,
      newTotal: totalWith(patch),
      currentTotal: subtotal,
      budget
    });
  };
  const completeTheLook = currentStep && currentStep.id === 'extras' && (picks || stylePicks)
    ? currentStep.items.filter(it => (isPick(it.id) || isStylePick(it.id)) && it.inStock && !isBookedOut(it) && !selection.extras.some(e => e.id === it.id)).slice(0, 2)
    : [];

  const handleSelectCuratedPalette = (palette) => {
    if (!palette.inStock && !isEditMode) return;
    setActivePaletteId(palette.id);
    const resolved = palette.colourIds
      .map(id => balloonColours.find(c => c.id === id))
      .filter(Boolean);
    setSelectedColours(resolved);
  };

  const handleToggleCustomColour = (colour) => {
    if (!colour.inStock && !isEditMode) return;
    setActivePaletteId('custom');
    setSelectedColours(prev => {
      const exists = prev.some(c => c.id === colour.id);
      if (exists) {
        return prev.length > 1 ? prev.filter(c => c.id !== colour.id) : prev;
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), colour];
      }
      return [...prev, colour];
    });
  };

  const handleSelectOrDropItem = (stepId, item) => {
    if (!isEditMode && (!item.inStock || isBookedOut(item))) return;

    if (stepId === 'backdrop') {
      setSelection(prev => ({
        ...prev,
        backdrop: prev.backdrop?.id === item.id ? null : item
      }));
    } else if (stepId === 'balloons') {
      setSelection(prev => ({
        ...prev,
        balloons: prev.balloons?.id === item.id ? null : item
      }));
    } else if (stepId === 'extras') {
      setSelection(prev => {
        const exists = prev.extras.some(e => e.id === item.id);
        return {
          ...prev,
          extras: exists
            ? prev.extras.filter(e => e.id !== item.id)
            : [...prev.extras, item]
        };
      });
    }
  };

  const handleSkipCurrentStep = () => {
    if (currentStep.id === 'backdrop') {
      setSelection(prev => ({ ...prev, backdrop: null }));
    } else if (currentStep.id === 'balloons') {
      setSelection(prev => ({ ...prev, balloons: null }));
    } else if (currentStep.id === 'digits') {
      setDigitSelection(digitOptions[0]);
    } else if (currentStep.id === 'extras') {
      setSelection(prev => ({ ...prev, extras: [] }));
    }

    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      formStartTimeRef.current = Date.now();
      setShowQuoteModal(true);
    }
  };

  const handleNextStep = () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      formStartTimeRef.current = Date.now();
      setShowQuoteModal(true);
    }
  };

  const handlePrevStep = () => {
    if (showQuoteModal) {
      setShowQuoteModal(false);
      return;
    }
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const found = offers.find(
      o => o.active && o.code.toLowerCase() === promoCode.trim().toLowerCase()
    );
    setAppliedOffer(found || null);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingQuote) return;
    if (selectedColours.length === 0) {
      setQuoteSubmitError('Please choose your colours first.');
      return;
    }
    if (!selection.backdrop && !selection.balloons && selection.extras.length === 0 && (!digitSelection || digitSelection.type === 'none')) {
      setQuoteSubmitError('Please choose at least one thing for your display.');
      return;
    }
    if (digitSelection && digitSelection.type !== 'none' && !digitText.trim()) {
      setQuoteSubmitError('Please type the numbers or letters you would like on your balloons.');
      return;
    }
    if (selection.backdrop?.id === 'wooden-board' && !(boardCustomization.text || '').trim()) {
      setQuoteSubmitError('Please type the wording for your personalised board.');
      return;
    }
    setIsSubmittingQuote(true);

    const svgEl = canvasWrapRef.current ? canvasWrapRef.current.querySelector('svg') : null;
    const snapshotDataUrl = await captureSvgSnapshotDataUrl(svgEl, 360);
    const fillMs = Math.max(2000, Date.now() - (formStartTimeRef.current || Date.now() - 5000));

    // Derive stock IDs for workshop fulfillment & date conflict prevention
    const stockIds = [];
    if (selection.backdrop?.id) stockIds.push(`id_backdrop_${selection.backdrop.id}`);
    if (selection.balloons?.id) stockIds.push(`id_garland_${selection.balloons.id}`);
    if (digitSelection?.id && digitSelection.type !== 'none') stockIds.push(`id_digit_${digitSelection.id}`);
    (selection.extras || []).forEach(ex => stockIds.push(`id_prop_${ex.id}`));

    // Generate workshop balloon pull list based on selected palette
    const pullItems = selectedColours.map((c, i) => {
      const code = c.code || (101 + i);
      return `25 × ${code}_M (${c.name})`;
    });
    const pullListStr = pullItems.length > 0 ? pullItems.join(', ') : 'Standard Mix';

    const bundleDiscount = recipeCalc.hasDiscount ? Math.max(0, recipeCalc.originalTotal - recipeCalc.finalTotal) : 0;

    const quotePayload = {
      id: `OE-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'New Enquiry',
      _company_website: honeypotWebsite,
      _formFillMs: fillMs,
      previewSnapshotDataUrl: snapshotDataUrl,
      client: {
        ...clientForm,
        occasion: clientForm.occasion === 'Something else' ? (clientForm.occasionOther || 'Something else') : clientForm.occasion
      },
      configuration: {
        palette: selectedColours.map(c => c.name),
        backdrop: selection.backdrop ? selection.backdrop.name : 'Skipped (Freestanding)',
        boardCustomization: selection.backdrop?.id === 'wooden-board' ? boardCustomization : null,
        shimmerSize: selection.backdrop?.hasSizeTier ? shimmerSize : 'N/A',
        balloonLayout: selection.balloons ? selection.balloons.name : 'Skipped',
        digitsOrLetters: digitSelection?.type !== 'none' ? `${digitSelection.name} ("${digitText}")` : 'None',
        extras: selection.extras.map(ex => `${ex.shortName} (£${applyCornerBannerDiscount(ex.price, ex.cornerBanner)})`),
        neonPhrase: selection.extras.some(e => e.id === 'neon-sign') ? neonPhrase : null,
        bubbleText: selection.extras.some(e => e.id === 'bubble-balloon') ? bubbleText : null,
        promoCode: appliedOffer ? appliedOffer.code : null,
        subtotal: recipeCalc.originalTotal || finalTotal,
        bundleDiscount,
        estimatedTotal: finalTotal,
        depositPaid: 0,
        balanceDue: finalTotal,
        stockIds,
        balloonPullList: pullListStr,
        backdropId: selection.backdrop?.id || null,
        balloonId: selection.balloons?.id || null,
        digitId: digitSelection?.type !== 'none' ? digitSelection?.id : null,
        digitText: digitSelection?.type !== 'none' ? digitText : '',
        extraIds: selection.extras.map(ex => ex.id)
      }
    };

    setQuoteSubmitError('');
    try {
      await onSubmitQuote(quotePayload);
      setSubmittedSuccess(true);
    } catch (err) {
      setQuoteSubmitError(err?.customerMessage || "Sorry, your edit didn't send. Your design is still here, so please try again in a minute, or message us on Facebook.");
      // Something was booked while they were choosing: refresh the date so it greys out
      if (err?.code === 'unavailable' && getAvailability) {
        getAvailability(clientForm.eventDate).then(setAvailability).catch(() => {});
      }
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  return (
    <section id="build-your-edit" className="oe-builder-section" aria-label="Build your edit">
      <header className="oe-builder-head">
        <h2 className="oe-builder-title">Build your edit</h2>
        <nav aria-label="Stages">
          <ol className="oe-stages">
            <li>
              <button
                type="button"
                onClick={() => { setEventConfirmed(false); setAvailabilityNote(''); }}
                aria-current={!eventConfirmed ? 'step' : undefined}
                className={`oe-stage ${!eventConfirmed ? 'is-current' : 'is-done'}`}
              >
                <span className="oe-stage-mark">{eventConfirmed ? '✓' : 1}</span>
                <span className="oe-stage-label">
                  {eventConfirmed ? new Date(clientForm.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Your day'}
                </span>
              </button>
            </li>
            {steps.map((step, idx) => {
              const isCurrent = eventConfirmed && !showQuoteModal && idx === activeStepIndex;
              const isDone = eventConfirmed && (idx < activeStepIndex || showQuoteModal);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={!eventConfirmed}
                    onClick={() => { setShowQuoteModal(false); setActiveStepIndex(idx); }}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`oe-stage ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
                  >
                    <span className="oe-stage-mark">{isDone ? '✓' : idx + 2}</span>
                    <span className="oe-stage-label">{String(step.shortTab || step.title).replace(/^\d+\.\s*/, '').replace(' & Letters', '')}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                disabled={!eventConfirmed}
                onClick={() => { formStartTimeRef.current = Date.now(); setShowQuoteModal(true); }}
                aria-current={eventConfirmed && showQuoteModal ? 'step' : undefined}
                className={`oe-stage ${eventConfirmed && showQuoteModal ? 'is-current' : ''}`}
              >
                <span className="oe-stage-mark">{steps.length + 2}</span>
                <span className="oe-stage-label">Send</span>
              </button>
            </li>
          </ol>
        </nav>
      </header>

      <div className="oe-builder-two-panel">
        {/* LEFT PANEL: Clean Square Canvas + Simple Total */}
        <div className="oe-left-canvas-panel oe-build-card">
          <div className="oe-canvas-frame" ref={canvasWrapRef}>
            <ProductPreview
              selection={selection}
              selectedColours={selectedColours}
              shimmerSize={shimmerSize}
              digitSelection={digitSelection}
              digitText={digitText}
              boardCustomization={boardCustomization}
              neonPhrase={neonPhrase}
              bubbleText={bubbleText}
              onDropItem={handleSelectOrDropItem}
              isDragOver={isDragOver}
              setIsDragOver={setIsDragOver}
            />
          </div>

          {/* Simple, Uncluttered Price & Palette Bar beneath Canvas */}
          <div className="oe-simple-summary-bar" aria-live="polite">
            <div className="oe-simple-summary-top">
              <div className="oe-simple-palette-dots">
                {selectedColours.map(col => (
                  <span
                    key={col.id}
                    className="oe-simple-dot"
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  />
                ))}
              </div>

              <div className="oe-simple-total">
                <span>Guide price</span>
                {recipeCalc.hasDiscount && (
                  <span className="oe-price-old">£{recipeCalc.originalTotal}</span>
                )}
                <strong>£{finalTotal}</strong>
              </div>
            </div>

            {selection.backdrop?.hasSizeTier && (
              <div className="oe-wall-size-pill-group" role="group" aria-label="Shimmer Wall Size">
                <button
                  type="button"
                  onClick={() => setShimmerSize('small')}
                  className={`oe-size-btn ${shimmerSize === 'small' ? 'active' : ''}`}
                >
                  Small Wall (£{selection.backdrop.packageBasePrice || 150})
                </button>
                <button
                  type="button"
                  onClick={() => setShimmerSize('large')}
                  className={`oe-size-btn ${shimmerSize === 'large' ? 'active' : ''}`}
                >
                  Large Wall (£{selection.backdrop.packageLargePrice || 180})
                </button>
              </div>
            )}

            {lineItems.length > 0 && (
              <p className="oe-simple-items-line">
                {lineItems.map(l => `${l.label} (£${l.amount})`).join('  ·  ')}
              </p>
            )}

            {isEditMode && (
              <button
                type="button"
                onClick={() => onSaveCurrentSetupAsLook(currentRecipe, finalTotal)}
                className="oe-save-builder-as-look-btn"
              >
                ✨ Save Current 3D Builder Setup as a Lookbook Card (£{finalTotal})
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Guided 5-Step Configurator Controls */}
        <div className="oe-right-controls-panel">

          {availabilityNote && eventConfirmed && (
            <p className="oe-availability-note" role="status">{availabilityNote}</p>
          )}

          {!eventConfirmed ? (
            <EventStep
              form={clientForm}
              onChange={patch => setClientForm(prev => ({ ...prev, ...patch }))}
              getAvailability={getAvailability}
              onConfirmed={result => {
                setAvailability(result);
                setEventConfirmed(true);
              }}
            />
          ) : !showQuoteModal ? (
            <div className="oe-step-card-surface">
              <div className="oe-step-card-header">
                <div>
                  <h3 className="oe-active-step-heading">{currentStep.title}</h3>
                  {currentStep.subtitle && <p className="oe-active-step-desc">{currentStep.subtitle}</p>}
                </div>
                {currentStep.allowSkip && (
                  <button
                    type="button"
                    onClick={handleSkipCurrentStep}
                    className="oe-prominent-skip-btn"
                  >
                    Skip →
                  </button>
                )}
              </div>

              <div className="oe-step-scrollable-body">
              {/* STEP 1: COLOUR PALETTES */}
              {currentStep.id === 'colours' && (
                <div className="oe-palette-step-wrap">
                  <div className="oe-palette-mode-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paletteMode === 'curated'}
                      onClick={() => setPaletteMode('curated')}
                      className={`oe-mode-tab-btn ${paletteMode === 'curated' ? 'active' : ''}`}
                    >
                      Our palettes
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paletteMode === 'custom'}
                      onClick={() => setPaletteMode('custom')}
                      className={`oe-mode-tab-btn ${paletteMode === 'custom' ? 'active' : ''}`}
                    >
                      Pick up to 5 colours
                    </button>
                  </div>

                  {paletteMode === 'curated' ? (
                    <div className="oe-curated-palettes-list">
                      {curatedPalettes.map(pal => {
                        const isSelected = activePaletteId === pal.id;
                        const palColours = pal.colourIds
                          .map(id => balloonColours.find(c => c.id === id))
                          .filter(Boolean);

                        return (
                          <button
                            key={pal.id}
                            type="button"
                            disabled={!pal.inStock && !isEditMode}
                            onClick={() => handleSelectCuratedPalette(pal)}
                            className={`oe-curated-palette-card ${isSelected ? 'selected' : ''} ${!pal.inStock ? 'out-of-stock' : ''}`}
                          >
                            <div className="oe-curated-info">
                              <div className="oe-curated-title-row">
                                <span className="oe-curated-name">{pal.name}</span>
                              </div>
                              <p className="oe-curated-desc">{pal.description}</p>
                            </div>

                            <div className="oe-curated-balloon-bunch" aria-label={`Balloons in ${pal.name}`}>
                              {palColours.map(c => (
                                <div key={c.id} className="oe-bunch-balloon-item" title={c.name}>
                                  <BalloonGraphic hex={c.hex} finish={c.finish} size={40} />
                                  <span className="oe-bunch-balloon-label">{c.name}</span>
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="oe-custom-palette-builder">
                      <p className="oe-custom-instruction">
                        Select up to 5 balloons to create your palette ({selectedColours.length}/5 selected):
                      </p>
                      <div className="oe-balloon-swatch-grid">
                        {balloonColours.map((colour, idx) => {
                          const isSelected = selectedColours.some(c => c.id === colour.id);
                          return (
                            <div
                              key={colour.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleCustomColour(colour)}
                              className={`oe-balloon-card-btn ${isSelected ? 'selected' : ''} ${!colour.inStock ? 'out-of-stock' : ''}`}
                            >
                              <span className="oe-swatch-code-badge">#{colour.code || (101 + idx)}</span>
                              <BalloonGraphic hex={colour.hex} finish={colour.finish} size={48} />
                              <span className="oe-balloon-card-name">{colour.name}</span>
                              <span className="oe-balloon-card-finish">
                                {!colour.inStock ? 'Out of Stock' : colour.finish}
                              </span>
                              {isEditMode && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', width: '100%' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleColourStock(colour.id);
                                    }}
                                    className={`oe-mini-admin-btn ${colour.inStock ? 'in-stock' : 'out-stock'}`}
                                  >
                                    {colour.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingColourTarget({ ...colour, isNew: false });
                                    }}
                                    className="oe-mini-admin-btn"
                                    style={{ background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }}
                                  >
                                    🎨 Change Shade
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isEditMode && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditingColourTarget({ isNew: true, name: '', hex: '#7A8C68', finish: 'Matte' })}
                            className="oe-balloon-card-btn"
                            style={{ border: '2px dashed #0284C7', background: '#F0F9FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '1.5rem', color: '#0284C7' }}>+</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>Add New Shade</span>
                            <span style={{ fontSize: '0.62rem', color: '#64748B', textAlign: 'center', marginTop: '0.2rem' }}>Pick from visual tray</span>
                          </div>
                        )}
                      </div>

                      {/* Visual Colour Swatch Picker Modal */}
                      {editingColourTarget && (
                        <VisualColourPicker
                          currentHex={editingColourTarget.hex}
                          currentName={editingColourTarget.name}
                          currentFinish={editingColourTarget.finish}
                          onClose={() => setEditingColourTarget(null)}
                          onSelectColour={(chosen) => {
                            if (editingColourTarget.isNew) {
                              onAddNewColour(chosen);
                            } else {
                              onUpdateColour(editingColourTarget.id, chosen);
                            }
                            setEditingColourTarget(null);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEPS 2, 3, 5: BACKDROPS, GARLANDS & EXTRAS */}
              {(currentStep.id === 'backdrop' || currentStep.id === 'balloons' || currentStep.id === 'extras') && (
              <div className="oe-step-options-wrap">
                {completeTheLook.length > 0 && (
                  <div className="oe-complete-look">
                    <p className="oe-complete-look-title">Complete the look for your {clientForm.occasion === 'Something else' ? 'celebration' : clientForm.occasion.toLowerCase()}</p>
                    <div className="oe-complete-look-row">
                      {completeTheLook.map(it => (
                        <button
                          key={it.id}
                          type="button"
                          className="oe-complete-look-item"
                          onClick={() => handleSelectOrDropItem('extras', it)}
                        >
                          {it.image && <img src={it.image} alt="" />}
                          <span>
                            <strong>{it.shortName || it.name}</strong>
                            <span>{offerFor('extras', it, false)?.text}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="oe-accessible-options-grid">
                  {currentStep.items.map(item => {
                    const bookedOut = !isEditMode && isBookedOut(item);
                    const available = item.inStock && !bookedOut;
                    const isSelected =
                      (currentStep.id === 'backdrop' && selection.backdrop?.id === item.id) ||
                      (currentStep.id === 'balloons' && selection.balloons?.id === item.id) ||
                      (currentStep.id === 'extras' && selection.extras.some(e => e.id === item.id));

                    const rawBase = item.packageBasePrice || item.price;
                    const discountedBase = applyCornerBannerDiscount(rawBase, item.cornerBanner);
                    const hasDiscount = discountedBase < rawBase;
                    const displayPrefix = item.packageBasePrice ? 'From ' : '+';

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={available || isEditMode ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-disabled={!available && !isEditMode}
                        draggable={available}
                        onDragStart={(e) => {
                          if (!available) return;
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ stepId: currentStep.id, item })
                          );
                        }}
                        onClick={() => handleSelectOrDropItem(currentStep.id, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectOrDropItem(currentStep.id, item);
                          }
                        }}
                        className={`oe-option-card ${isSelected ? 'selected' : ''} ${!available ? 'out-of-stock' : ''} ${item.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                      >
                        <CornerRibbon banner={item.cornerBanner} />

                        <div className="oe-option-card-top-with-thumb">
                          {item.image && (
                            <img src={item.image} alt={item.image.includes('/examples/') ? `Example image of ${item.name}` : item.name} title={item.image.includes('/examples/') ? 'Example image' : undefined} className="oe-option-card-thumb" loading="lazy" />
                          )}
                          <div className="oe-option-card-header-text">
                            <div className="oe-option-card-top">
                              <EditableText
                                isEditMode={isEditMode}
                                value={item.name}
                                onChange={(val) => onUpdateBuilderItem(currentStep.id, item.id, { name: val })}
                                tag="span"
                                className="oe-option-card-title"
                              />
                              <span className="oe-option-card-price">
                                {bookedOut ? (
                                  'BOOKED'
                                ) : !item.inStock && !isEditMode ? (
                                  'OUT OF STOCK'
                                ) : isEditMode ? (
                                  <EditablePrice
                                    isEditMode={true}
                                    value={rawBase}
                                    prefix={item.packageBasePrice ? 'From £' : '+£'}
                                    onChange={(num) =>
                                      onUpdateBuilderItem(currentStep.id, item.id, {
                                        price: num,
                                        packageBasePrice: item.packageBasePrice ? num : undefined
                                      })
                                    }
                                  />
                                ) : hasDiscount ? (
                                  <>
                                    <span className="oe-price-old">£{rawBase}</span>
                                    <span className="oe-price-new">{displayPrefix}£{discountedBase}</span>
                                  </>
                                ) : (
                                  `${displayPrefix}£${rawBase}`
                                )}
                              </span>
                            </div>
                            <EditableText
                              isEditMode={isEditMode}
                              value={item.styleNote}
                              onChange={(val) => onUpdateBuilderItem(currentStep.id, item.id, { styleNote: val })}
                              tag="p"
                              className="oe-option-card-desc"
                            />
                          </div>
                        </div>
                        <div className="oe-option-card-footer">
                          <span className="oe-option-badge">
                            {item.hireOnly ? 'Hire Prop' : 'Yours to Keep'}
                          </span>
                          {isPick(item.id) && available && <span className="oe-pick-tag">Perfect for {picks.label}</span>}
                          {isStylePick(item.id) && available && <span className="oe-pick-tag">A {clientForm.style} touch</span>}
                          <span className="oe-option-action-text">
                            {bookedOut
                              ? `Booked for ${eventDateLabel}`
                              : !item.inStock
                              ? 'Unavailable'
                              : isSelected
                              ? ''
                              : (offerFor(currentStep.id, item, isSelected)?.text || 'Select +')}
                          </span>
                        </div>

                        {isEditMode && (
                          <div className="oe-card-edit-overlay-bar" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onToggleBuilderItemStock(currentStep.id, item.id)}
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
                                    onUploadPhotoForTarget(e.target.files[0], (url) =>
                                      onUpdateBuilderItem(currentStep.id, item.id, { image: url })
                                    );
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setOpenRibbonItemId(openRibbonItemId === item.id ? null : item.id)}
                              className="oe-mini-admin-btn"
                            >
                              🎀 Corner Banner
                            </button>
                          </div>
                        )}

                        {isEditMode && openRibbonItemId === item.id && (
                          <RibbonPickerPopover
                            banner={item.cornerBanner}
                            onChange={(newBanner) =>
                              onUpdateBuilderItem(currentStep.id, item.id, { cornerBanner: newBanner })
                            }
                            onClose={() => setOpenRibbonItemId(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentStep.id === 'backdrop' && selection.backdrop?.id === 'wooden-board' && (
                  <div className="oe-board-personalisation-deck">
                    <div className="oe-deck-header">
                      <h4 className="oe-deck-title">Your board</h4>
                      <p className="oe-deck-subtitle">Choose the paint colour and your wording.</p>
                    </div>

                    <div className="oe-deck-grid">
                      <div>
                        <label className="oe-field-label">1. Board Paint Finish</label>
                        <div className="oe-paint-swatches">
                          {[
                            { name: 'Warm Ivory', hex: '#F5EFEB' },
                            { name: 'Organic Sage', hex: '#8A9A7B' },
                            { name: 'Soft Blush', hex: '#E8D3CE' },
                            { name: 'Warm Taupe', hex: '#C8B098' },
                            { name: 'Matte White', hex: '#FDFDFD' },
                            { name: 'Obsidian Black', hex: '#242623' }
                          ].map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => setBoardCustomization(prev => ({ ...prev, color: p.hex, colorName: p.name }))}
                              className={`oe-paint-swatch-btn ${boardCustomization.colorName === p.name ? 'active' : ''}`}
                              title={p.name}
                            >
                              <span className="oe-swatch-circle" style={{ backgroundColor: p.hex }} />
                              <span className="oe-swatch-text">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="oe-field-label">2. Vinyl Lettering Colour</label>
                        <div className="oe-vinyl-options">
                          {[
                            { id: 'gold', name: '✦ Metallic Gold' },
                            { id: 'white', name: '⚪ Matte White' },
                            { id: 'black', name: '⚫ Gloss Black' },
                            { id: 'rose-gold', name: '✨ Rose Gold' }
                          ].map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setBoardCustomization(prev => ({ ...prev, vinylColor: v.id }))}
                              className={`oe-vinyl-btn ${boardCustomization.vinylColor === v.id ? 'active' : ''}`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="oe-field-label">3. Custom Vinyl Lettering / Message</label>
                        <input
                          type="text"
                          maxLength={40}
                          placeholder="e.g. Welcome to Sophie's 30th / Oh Baby / Happy Birthday"
                          value={boardCustomization.text}
                          onChange={(e) => setBoardCustomization(prev => ({ ...prev, text: e.target.value }))}
                          className="oe-form-input"
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep.id === 'extras' && selection.extras.some(e => e.id === 'neon-sign') && (
                  <div className="oe-extra-bespoke-card">
                    <label className="oe-field-label">Neon Sign Phrase (Warm White Glow)</label>
                    <div className="oe-neon-phrase-chips">
                      {['Happy Birthday', "Let's Party", 'Oh Baby', 'Better Together', 'Twenty One'].map(phrase => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setNeonPhrase(phrase)}
                          className={`oe-recipe-chip ${neonPhrase === phrase ? 'selected' : ''}`}
                        >
                          {neonPhrase === phrase ? '✓ ' : ''}{phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.id === 'extras' && selection.extras.some(e => e.id === 'bubble-balloon') && (
                  <div className="oe-extra-bespoke-card">
                    <label className="oe-field-label">Personalised Bubble Balloon Lettering</label>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. Happy 30th Sophie"
                      value={bubbleText}
                      onChange={(e) => setBubbleText(e.target.value)}
                      className="oe-form-input"
                      style={{ marginTop: '0.4rem' }}
                    />
                  </div>
                )}
              </div>
            )}

              {/* STEP 4: DIGITS, NUMBER STACKS & LETTER BALLOONS */}
              {currentStep.id === 'digits' && (
                <div className="oe-digits-step-wrap">
                  <div className="oe-accessible-options-grid">
                    {digitOptions.map(opt => {
                      const isSelected = digitSelection?.id === opt.id;
                      const rawBase = opt.basePrice;
                      const discBase = applyCornerBannerDiscount(rawBase, opt.cornerBanner);
                      return (
                        <div
                          key={opt.id}
                          role="button"
                          tabIndex={opt.inStock || isEditMode ? 0 : -1}
                          onClick={() => {
                            if (!opt.inStock && !isEditMode) return;
                            setDigitSelection(opt);
                            if (opt.defaultText) setDigitText(opt.defaultText);
                          }}
                          className={`oe-option-card ${isSelected ? 'selected' : ''} ${!opt.inStock ? 'out-of-stock' : ''} ${opt.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                        >
                          <CornerRibbon banner={opt.cornerBanner} />
                          <div className="oe-option-card-top-with-thumb">
                            {opt.image && (
                              <img src={opt.image} alt={opt.image.includes('/examples/') ? `Example image of ${opt.name}` : opt.name} title={opt.image.includes('/examples/') ? 'Example image' : undefined} className="oe-option-card-thumb" loading="lazy" />
                            )}
                            <div className="oe-option-card-header-text">
                              <div className="oe-option-card-top">
                                <EditableText
                                  isEditMode={isEditMode}
                                  value={opt.name}
                                  onChange={(val) => onUpdateDigitOption(opt.id, { name: val })}
                                  tag="span"
                                  className="oe-option-card-title"
                                />
                                <span className="oe-option-card-price">
                                  {opt.basePrice === 0 ? (
                                    '£0'
                                  ) : isEditMode ? (
                                    <EditablePrice
                                      isEditMode={true}
                                      value={opt.basePrice}
                                      prefix="From £"
                                      onChange={(num) => onUpdateDigitOption(opt.id, { basePrice: num })}
                                    />
                                  ) : discBase < rawBase ? (
                                    <>
                                      <span className="oe-price-old">£{rawBase}</span>
                                      <span className="oe-price-new">From £{discBase}</span>
                                    </>
                                  ) : opt.perLetter ? (
                                    `£${opt.basePrice}/letter`
                                  ) : (
                                    `From £${opt.basePrice}`
                                  )}
                                </span>
                              </div>
                              <EditableText
                                isEditMode={isEditMode}
                                value={opt.description}
                                onChange={(val) => onUpdateDigitOption(opt.id, { description: val })}
                                tag="p"
                                className="oe-option-card-desc"
                              />
                              {opt.showTwoNumberSaving && opt.secondDigitPrice < opt.basePrice * 2 && (
                                <span className="oe-saving-chip">
                                  Two numbers £{opt.secondDigitPrice}, save £{opt.basePrice * 2 - opt.secondDigitPrice}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="oe-option-card-footer">
                            {isPick(opt.id) && <span className="oe-pick-tag">Perfect for {picks.label}</span>}
                            {isStylePick(opt.id) && <span className="oe-pick-tag">A {clientForm.style} touch</span>}
                            <span className="oe-option-action-text">
                              {isSelected || opt.type === 'none' ? '' : (offerFor('digits', opt, isSelected)?.text || 'Select +')}
                            </span>
                          </div>

                          {isEditMode && opt.type !== 'none' && (
                            <div className="oe-card-edit-overlay-bar" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => onUpdateDigitOption(opt.id, { inStock: !opt.inStock })}
                                className={`oe-mini-admin-btn ${opt.inStock ? 'in-stock' : 'out-stock'}`}
                              >
                                {opt.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenRibbonItemId(openRibbonItemId === opt.id ? null : opt.id)}
                                className="oe-mini-admin-btn"
                              >
                                🎀 Corner Banner
                              </button>
                            </div>
                          )}

                          {isEditMode && openRibbonItemId === opt.id && (
                            <RibbonPickerPopover
                              banner={opt.cornerBanner}
                              onChange={(newBanner) => onUpdateDigitOption(opt.id, { cornerBanner: newBanner })}
                              onClose={() => setOpenRibbonItemId(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {digitSelection && digitSelection.type !== 'none' && (
                    <div className="oe-digit-input-panel">
                      <label htmlFor="custom-digits-input" className="oe-digit-input-label">
                        {digitSelection.type === 'letters'
                          ? 'Enter the word or name for your Letter Balloons (up to 8 letters):'
                          : 'Enter the age or number(s) you need (e.g. 1, 18, 21, 30):'}
                      </label>
                      <div className="oe-digit-input-row">
                        <input
                          id="custom-digits-input"
                          type="text"
                          maxLength={digitSelection.maxChars || 6}
                          value={digitText}
                          onChange={(e) => setDigitText(e.target.value)}
                          className="oe-digit-text-input"
                          placeholder={digitSelection.defaultText || '21'}
                        />
                        <span className="oe-digit-live-calc">
                          Characters: <strong>{Math.max(1, digitText.replace(/\s+/g, '').length)}</strong>
                          {digitSelection.showTwoNumberSaving && digitText.replace(/\s+/g, '').length === 2 && digitSelection.secondDigitPrice < digitSelection.basePrice * 2 && (
                            <> · You save £{digitSelection.basePrice * 2 - digitSelection.secondDigitPrice} on two numbers</>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>

              <div className="oe-step-action-bar">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={activeStepIndex === 0}
                  className="oe-btn-secondary"
                >
                  ← Back
                </button>

                <div className="oe-step-action-right">
                  {currentStep.allowSkip && (
                    <button
                      type="button"
                      onClick={handleSkipCurrentStep}
                      className="oe-btn-skip"
                    >
                      {currentStep.skipLabel || 'Skip Step'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="oe-btn-primary"
                  >
                    {activeStepIndex === steps.length - 1
                      ? `Review & Send Edit (£${finalTotal}) →`
                      : `Next: ${String(steps[activeStepIndex + 1].shortTab).replace(/^\d+\.\s*/, '').replace(' & Letters', '')}`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 6: SEND EDIT FORM */
            <div className="oe-step-card-surface">
              {submittedSuccess ? (
                <div className="oe-quote-confirmation">
                  <h3 className="oe-active-step-heading">Your Edit Has Been Sent!</h3>
                  <p className="oe-active-step-desc">
                    Thank you, <strong>{clientForm.name}</strong>. We have received your custom 3D display snapshot and estimated quote (<strong>£{finalTotal}</strong>) and will be in touch shortly to confirm availability for your date.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedSuccess(false);
                      setShowQuoteModal(false);
                      setActiveStepIndex(0);
                    }}
                    className="oe-btn-primary"
                  >
                    ← Back to Builder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleQuoteSubmit} className="oe-quote-form">
                  <h3 className="oe-active-step-heading">Send Your Custom Edit</h3>
                  <p className="oe-active-step-desc">
                    We will receive your exact visual template, colour palette, and selected options so we can confirm availability and provide a final quote for your venue.
                  </p>

                  {/* Anti-Bot Honeypot Field (Invisible to real users) */}
                  <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <label>
                      Company Website
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypotWebsite}
                        onChange={(e) => setHoneypotWebsite(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="oe-promo-row">
                    <input
                      type="text"
                      placeholder="Discount code (e.g. OCCASION10)"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      className="oe-form-input"
                    />
                    <button type="button" onClick={handleApplyPromo} className="oe-btn-secondary">
                      Apply
                    </button>
                  </div>
                  {appliedOffer && (
                    <p className="oe-offer-applied-banner">✓ Applied: {appliedOffer.title}</p>
                  )}

                  <div className="oe-form-grid">
                    <div>
                      <label className="oe-field-label">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={clientForm.name}
                        onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="sarah@example.com"
                        value={clientForm.email}
                        onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="07700 900000"
                        value={clientForm.phone}
                        onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <span className="oe-field-label">Event date</span>
                      <p className="oe-event-date-readonly">
                        {eventDateLabel}{' '}
                        <button
                          type="button"
                          className="oe-text-link"
                          onClick={() => { setShowQuoteModal(false); setEventConfirmed(false); }}
                        >
                          Change
                        </button>
                      </p>
                    </div>
                    <div>
                      <label className="oe-field-label">
                        {clientForm.hasVenue === 'no' ? 'Venue postcode, if you have one now' : 'Venue postcode *'}
                      </label>
                      <input
                        type="text"
                        required={clientForm.hasVenue !== 'no'}
                        placeholder="e.g. NG13 0AA"
                        value={clientForm.postcode}
                        onChange={e => setClientForm({ ...clientForm, postcode: e.target.value.toUpperCase() })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Venue / Room Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Vale of Belvoir Country Hotel / Home"
                        value={clientForm.venueName || ''}
                        onChange={e => setClientForm({ ...clientForm, venueName: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Access / Setup Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM arrival"
                        value={clientForm.accessTime || ''}
                        onChange={e => setClientForm({ ...clientForm, accessTime: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Setting Environment</label>
                      <div className="oe-setting-toggle-pills">
                        <button
                          type="button"
                          onClick={() => setClientForm({ ...clientForm, setting: 'indoor' })}
                          className={`oe-setting-pill-btn ${(clientForm.setting || 'indoor') === 'indoor' ? 'active' : ''}`}
                        >
                          🏢 Indoor Display
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientForm({ ...clientForm, setting: 'outdoor' })}
                          className={`oe-setting-pill-btn ${clientForm.setting === 'outdoor' ? 'active' : ''}`}
                        >
                          🌳 Outdoor Setup
                        </button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="oe-field-label">Personalisation / Theme Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Preferred delivery window, theme colours, or access instructions"
                        value={clientForm.notes}
                        onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                  </div>

                  <p className="oe-terms-note">
                    Nothing to pay today. When we confirm your date, a {BOOKING_TERMS.depositPercent}% deposit secures it, and the rest is due a week before your celebration.
                  </p>
                  {quoteSubmitError && (
                    <p className="oe-quote-submit-error" role="alert">
                      {quoteSubmitError}
                    </p>
                  )}
                  <div className="oe-step-action-bar">
                    <button type="button" onClick={handlePrevStep} className="oe-btn-secondary">
                      ← Back
                    </button>
                    <button type="submit" disabled={isSubmittingQuote} className="oe-btn-primary">
                      {isSubmittingQuote ? 'Sending Your Edit...' : `Send My Edit (£${finalTotal}) →`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
