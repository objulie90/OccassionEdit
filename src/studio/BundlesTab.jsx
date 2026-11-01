import React, { useState, useEffect } from 'react';
import { calculateLookRecipePrice, applyCornerBannerDiscount } from '../data/catalogData.js';
import { CornerRibbon } from '../components/ui';
import { LABELS, bannerFromForm } from './CatalogueTabs';
import { money } from './studioFormat';

const RIBBON_COLOURS = [
  ['gold', 'Gold', '#B8902F'],
  ['coral', 'Coral', '#C4553A'],
  ['sage', 'Sage', '#5E7262'],
  ['espresso', 'Espresso', '#2C221E'],
  ['blush', 'Blush', '#C98B8B']
];

// The label and offer on a bundle, as the choices in the panel
function bannerChoices(b) {
  const banner = b && b.enabled ? b : null;
  const preset = banner && LABELS.some(([v]) => v === banner.text) ? banner.text : null;
  const isOfferText = banner && /off$|^save/i.test(banner.text || '');
  return {
    label: !banner ? 'none' : preset || (isOfferText ? 'none' : 'custom'),
    customLabel: banner && !preset && !isOfferText ? banner.text : '',
    discountType: banner?.discountType && banner.discountType !== 'none' ? banner.discountType : 'none',
    discountValue: banner?.discountValue || '',
    ribbonStyle: banner?.style || ''
  };
}

const recipeOf = s => ({
  paletteId: s.preset?.paletteId || null,
  backdropId: s.preset?.backdropId || null,
  shimmerSize: s.preset?.shimmerSize || 'small',
  balloonId: s.preset?.balloonId || null,
  digitOptionId: s.preset?.digitOptionId || 'digits-none',
  digitText: s.preset?.digitText || '',
  extraIds: s.preset?.extraIds || []
});

const priceOf = item => {
  const p = item.price;
  return p === null || p === undefined || p === '' ? 'To confirm' : money(p);
};

/**
 * Get inspired, exactly as customers see it, with the editing panel beside it.
 * Changes show on the card straight away and go live with one Save and publish.
 */
export function BundlesTab({ inspirationSlides = [], steps = [], digitOptions = [], balloonColours = [], curatedPalettes = [], onSaveBundles, onUploadPhoto }) {
  const [draft, setDraft] = useState(inspirationSlides);
  const [activeId, setActiveId] = useState(inspirationSlides[0]?.id || null);
  const [category, setCategory] = useState('All');
  const [removed, setRemoved] = useState(null);
  const [state, setState] = useState('idle');
  // What Laura has picked in the label and offer panel, per bundle, kept while she types
  const [offerForms, setOfferForms] = useState({});

  useEffect(() => { setDraft(inspirationSlides); setOfferForms({}); }, [inspirationSlides]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(inspirationSlides);
  const categories = [...new Set(draft.map(s => s.category).filter(Boolean))];
  const shown = category === 'All' ? draft : draft.filter(s => s.category === category);
  const slide = draft.find(s => s.id === activeId) || shown[0] || draft[0];
  const index = slide ? shown.findIndex(s => s.id === slide.id) : -1;
  const itemsOf = id => steps.find(st => st.id === id)?.items || [];

  const worked = s => calculateLookRecipePrice(recipeOf(s), steps, digitOptions, balloonColours, curatedPalettes, null);
  const guideOf = s => (s.manualPriceOverride ? Number(s.guidePrice) || 0 : worked(s).originalTotal);

  const patch = (changes) => { setDraft(d => d.map(s => (s.id === slide.id ? { ...s, ...changes } : s))); setState('idle'); };
  const patchPreset = (changes) => patch({ preset: { ...(slide.preset || {}), ...changes } });
  const patchBanner = (changes) => {
    const f = { ...(offerForms[slide.id] || bannerChoices(slide.cornerBanner)), ...changes };
    setOfferForms(forms => ({ ...forms, [slide.id]: f }));
    const banner = bannerFromForm(f);
    patch({ cornerBanner: banner ? { ...banner, style: f.ribbonStyle || banner.style, position: 'top-right' } : null });
  };

  const add = () => {
    const id = `bundle-${Date.now().toString(36)}`;
    setDraft(d => [...d, { id, category: category !== 'All' ? category : categories[0] || 'Birthdays', title: 'New bundle', description: '', guidePrice: 0, image: '', isExampleWatermark: false, cornerBanner: null, preset: { extraIds: [] } }]);
    setActiveId(id);
    setState('idle');
  };
  const remove = () => {
    const at = draft.findIndex(s => s.id === slide.id);
    setRemoved({ slide, at });
    const next = draft.filter(s => s.id !== slide.id);
    setDraft(next);
    setActiveId(next[0]?.id || null);
  };
  const undoRemove = () => {
    const next = [...draft];
    next.splice(Math.min(removed.at, next.length), 0, removed.slide);
    setDraft(next);
    setActiveId(removed.slide.id);
    setRemoved(null);
  };
  const step = (by) => {
    if (!shown.length) return;
    setActiveId(shown[(index + by + shown.length) % shown.length].id);
  };

  const save = async () => {
    setState('saving');
    const clean = draft.map(s => ({ ...s, title: (s.title || '').trim() || 'New bundle', description: (s.description || '').trim(), guidePrice: guideOf(s) }));
    const ok = await onSaveBundles(clean);
    setState(ok === false ? 'error' : 'saved');
    if (ok !== false) setRemoved(null);
  };

  const choosePhoto = async (file) => {
    if (!file || !onUploadPhoto) return;
    setState('uploading');
    try { patch({ image: await onUploadPhoto(file), isExampleWatermark: false }); } catch (_e) { setState('error'); }
  };

  const calc = slide ? worked(slide) : null;
  const guide = slide ? guideOf(slide) : 0;
  const price = slide ? applyCornerBannerDiscount(guide, slide.cornerBanner) : 0;
  const f = slide ? (offerForms[slide.id] || bannerChoices(slide.cornerBanner)) : null;
  const preset = slide ? recipeOf(slide) : null;
  const backdrop = preset && itemsOf('backdrop').find(i => i.id === preset.backdropId);

  return (
    <div className="st-catalogue st-bundles">
      <div className="st-cat-top">
        <h3 className="st-section-title">Bundles</h3>
        {onSaveBundles && <button type="button" className="st-btn" onClick={add}>Add a bundle</button>}
      </div>
      <p className="st-cat-note">This is Get inspired exactly as customers see it. Type on the card to change the words, and use the panel to change the rest.</p>

      {removed && (
        <div className="st-undo" role="status">
          <span>{removed.slide.title} removed.</span>
          <button type="button" className="st-link" onClick={undoRemove}>Undo</button>
        </div>
      )}

      <div className="oe-category-filter-bar st-bundle-filter" role="group" aria-label="Show bundles for">
        {['All', ...categories].map(c => (
          <button key={c} type="button" aria-pressed={category === c} className={`oe-category-pill ${category === c ? 'active' : ''}`} onClick={() => { setCategory(c); const first = c === 'All' ? draft[0] : draft.find(s => s.category === c); if (first) setActiveId(first.id); }}>{c}</button>
        ))}
      </div>

      {!slide && <p className="st-empty">No bundles yet. Add one to show customers a ready-made look.</p>}

      {slide && (
        <div className="st-bundle-studio">
          <div className="st-bundle-stage">
            <div className={`oe-carousel-stage oe-carousel-main-card ${slide.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}>
              <CornerRibbon banner={slide.cornerBanner} />
              <div className="oe-carousel-image-wrap">
                {slide.image ? <img src={slide.image} alt="" className="oe-carousel-img" /> : <div className="st-bundle-nophoto">Add a photo in the panel</div>}
                {slide.isExampleWatermark && slide.image && (
                  <div className="oe-watermark-overlay" aria-hidden="true"><span className="oe-watermark-stamp">EXAMPLE</span></div>
                )}
                <span className="oe-carousel-category-badge">{slide.category}</span>
              </div>
              <div className="oe-carousel-content">
                <label className="st-visually-hidden" htmlFor={`bd-title-${slide.id}`}>Bundle name</label>
                <textarea id={`bd-title-${slide.id}`} className="oe-carousel-title st-inline-edit st-inline-title" rows={2} value={slide.title || ''} onChange={e => patch({ title: e.target.value.replace(/\n/g, ' ') })} />
                <label className="st-visually-hidden" htmlFor={`bd-desc-${slide.id}`}>Words that sell it</label>
                <textarea id={`bd-desc-${slide.id}`} className="oe-carousel-desc st-inline-edit" rows={4} placeholder="How the day will feel and look" value={slide.description || ''} onChange={e => patch({ description: e.target.value })} />
                {calc.lines.length > 0 && (
                  <div className="oe-recipe-Included-tags" aria-label="Items included in this look">
                    {calc.lines.map((line, i) => (
                      <span key={i} className="oe-recipe-line-tag">{line.label} ({line.tbc ? 'price to confirm' : `£${line.amount}`})</span>
                    ))}
                  </div>
                )}
                <div className="oe-carousel-price-box">
                  <span style={{ fontWeight: 600 }}>Guide Price:</span>
                  <strong>
                    {price < guide && <span className="oe-price-old">£{guide}</span>}
                    <span className={price < guide ? 'oe-price-new' : ''}>From £{price}</span>
                  </strong>
                </div>
                <div className="oe-carousel-actions">
                  <span className="st-hint">{index + 1} of {shown.length}</span>
                  <div className="oe-carousel-arrows">
                    <button type="button" onClick={() => step(-1)} className="oe-arrow-btn" aria-label="Previous bundle">← Prev</button>
                    <button type="button" onClick={() => step(1)} className="oe-arrow-btn" aria-label="Next bundle">Next →</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="oe-carousel-thumb-strip st-bundle-thumbs">
              {shown.map(s => (
                <button key={s.id} type="button" onClick={() => setActiveId(s.id)} aria-pressed={s.id === slide.id} className={`oe-carousel-thumb-card ${s.id === slide.id ? 'active' : ''}`}>
                  <div className="oe-thumb-img-box">{s.image ? <img src={s.image} alt="" loading="lazy" /> : null}</div>
                  <div className="oe-thumb-meta"><strong>{s.title}</strong><span>From £{applyCornerBannerDiscount(guideOf(s), s.cornerBanner)}</span></div>
                </button>
              ))}
            </div>
          </div>

          <aside className="st-bundle-dock" aria-label={`Edit ${slide.title}`}>
            <section className="st-dock-card" aria-labelledby="dock-label">
              <h4 id="dock-label" className="st-dock-title">Label and offer</h4>
              <div className="st-field" role="group" aria-label="Label on the photo">
                <span className="st-field-label">Label on the photo</span>
                <div className="st-filter">
                  {LABELS.map(([value, text]) => <button key={value} type="button" className="st-chip" aria-pressed={f.label === value} onClick={() => patchBanner({ label: value })}>{text}</button>)}
                </div>
                {f.label === 'custom' && <input type="text" aria-label="Your own words" placeholder="Type your label" autoFocus maxLength={22} value={f.customLabel} onChange={e => patchBanner({ customLabel: e.target.value })} />}
              </div>
              <div className="st-field" role="group" aria-label="Offer">
                <span className="st-field-label">Offer</span>
                <div className="st-filter">
                  {[['none', 'No offer'], ['percent', '% off'], ['fixed', '£ off']].map(([value, text]) => (
                    <button key={value} type="button" className="st-chip" aria-pressed={f.discountType === value} onClick={() => patchBanner({ discountType: value })}>{text}</button>
                  ))}
                </div>
                {f.discountType !== 'none' && (
                  <div className="st-offer-amount">
                    {f.discountType === 'fixed' && <span aria-hidden="true">£</span>}
                    <input type="number" inputMode="decimal" min="0" max={f.discountType === 'percent' ? 90 : undefined} autoFocus aria-label={f.discountType === 'percent' ? 'Percent off' : 'Pounds off'} placeholder={f.discountType === 'percent' ? '10' : '20'} value={f.discountValue} onChange={e => patchBanner({ discountValue: e.target.value })} />
                    {f.discountType === 'percent' && <span aria-hidden="true">% off</span>}
                    {f.discountType === 'fixed' && <span aria-hidden="true">off</span>}
                  </div>
                )}
                {f.discountType !== 'none' && price < guide && <span className="st-hint">Customers see £{guide} crossed out and pay £{price}.</span>}
              </div>
              {slide.cornerBanner && (
                <div className="st-field" role="group" aria-label="Label colour">
                  <span className="st-field-label">Label colour</span>
                  <div className="st-ribbon-colours">
                    {RIBBON_COLOURS.map(([value, name, hex]) => (
                      <button key={value} type="button" className="st-ribbon-colour" aria-pressed={slide.cornerBanner.style === value} aria-label={name} title={name} style={{ background: hex }} onClick={() => patchBanner({ ribbonStyle: value })} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="st-dock-card" aria-labelledby="dock-items">
              <h4 id="dock-items" className="st-dock-title">What's in it</h4>
              <div className="st-field" role="group" aria-label="Occasion">
                <span className="st-field-label">Occasion</span>
                <div className="st-filter">
                  {categories.map(c => <button key={c} type="button" className="st-chip" aria-pressed={slide.category === c} onClick={() => patch({ category: c })}>{c}</button>)}
                </div>
              </div>
              <div className="st-field">
                <label htmlFor={`bd-pal-${slide.id}`}>Colours</label>
                <select id={`bd-pal-${slide.id}`} value={preset.paletteId || ''} onChange={e => patchPreset({ paletteId: e.target.value || undefined })}>
                  <option value="">Customer chooses</option>
                  {curatedPalettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <PickGroup title="Base" items={itemsOf('backdrop')} isOn={i => preset.backdropId === i.id} onToggle={i => patchPreset({ backdropId: preset.backdropId === i.id ? undefined : i.id })} />
              {backdrop?.hasSizeTier && (
                <div className="st-filter st-pick-size" role="group" aria-label="Wall size">
                  {[['small', 'Small wall'], ['large', 'Large wall']].map(([v, t]) => <button key={v} type="button" className="st-chip" aria-pressed={preset.shimmerSize === v} onClick={() => patchPreset({ shimmerSize: v })}>{t}</button>)}
                </div>
              )}
              <PickGroup title="Balloons" items={itemsOf('balloons')} isOn={i => preset.balloonId === i.id} onToggle={i => patchPreset({ balloonId: preset.balloonId === i.id ? undefined : i.id })} />
              <PickGroup title="Numbers and letters" items={digitOptions.filter(d => d.id !== 'digits-none')} isOn={d => preset.digitOptionId === d.id} onToggle={d => patchPreset({ digitOptionId: preset.digitOptionId === d.id ? 'digits-none' : d.id })} />
              {preset.digitOptionId !== 'digits-none' && (
                <div className="st-field"><label htmlFor={`bd-text-${slide.id}`}>Which numbers or letters</label><input id={`bd-text-${slide.id}`} type="text" maxLength={8} value={preset.digitText} onChange={e => patchPreset({ digitText: e.target.value })} /></div>
              )}
              <PickGroup title="Finishing touches" items={itemsOf('extras')} isOn={i => preset.extraIds.includes(i.id)} onToggle={i => patchPreset({ extraIds: preset.extraIds.includes(i.id) ? preset.extraIds.filter(x => x !== i.id) : [...preset.extraIds, i.id] })} />
              <div className="st-dock-price">
                <span>Comes to {money(calc.originalTotal)} at your prices</span>
                <label className="st-check"><input type="checkbox" checked={Boolean(slide.manualPriceOverride)} onChange={e => patch({ manualPriceOverride: e.target.checked, guidePrice: slide.guidePrice || calc.originalTotal })} /><span>Set my own price</span></label>
                {slide.manualPriceOverride && <input type="number" inputMode="decimal" min="0" aria-label="Your price (£)" value={slide.guidePrice} onChange={e => patch({ guidePrice: e.target.value })} />}
              </div>
            </section>

            <section className="st-dock-card" aria-labelledby="dock-photo">
              <h4 id="dock-photo" className="st-dock-title">Photo</h4>
              <div className="st-dock-photo">
                {slide.image ? <img src={slide.image} alt="" /> : <span className="st-empty">No photo yet</span>}
                <div>
                  <label className="st-btn">
                    {state === 'uploading' ? 'Adding photo' : slide.image ? 'Change photo' : 'Add a photo'}
                    <input type="file" accept="image/*" hidden onChange={e => choosePhoto(e.target.files?.[0])} />
                  </label>
                  <label className="st-check"><input type="checkbox" checked={Boolean(slide.isExampleWatermark)} onChange={e => patch({ isExampleWatermark: e.target.checked })} /><span>Show "Example" across it (not your own work)</span></label>
                </div>
              </div>
              <button type="button" className="st-link st-link-danger" onClick={remove}>Remove this bundle</button>
            </section>
          </aside>
        </div>
      )}

      {(dirty || state === 'saved' || state === 'error') && (
        <div className="st-save-bar" role="region" aria-label="Save changes">
          <span role="status">
            {state === 'saved' && !dirty ? 'Saved. Customers see it now.' : state === 'error' ? 'Not saved. Check your connection and try again.' : 'You have changes customers can’t see yet.'}
          </span>
          {dirty && (
            <>
              <button type="button" className="st-link st-link-quiet" onClick={() => { setDraft(inspirationSlides); setOfferForms({}); setRemoved(null); setState('idle'); }}>Undo changes</button>
              <button type="button" className="st-btn st-btn-primary" onClick={save} disabled={state === 'saving' || state === 'uploading' || !onSaveBundles}>{state === 'saving' ? 'Saving' : 'Save and publish'}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PickGroup({ title, items, isOn, onToggle }) {
  if (!items.length) return null;
  return (
    <fieldset className="st-pick-group">
      <legend className="st-field-label">{title}</legend>
      {items.map(i => (
        <label key={i.id} className="st-pick-row">
          <input type="checkbox" checked={isOn(i)} onChange={() => onToggle(i)} />
          <span className="st-pick-name">{i.shortName || i.name}</span>
          <span className="st-pick-price">{priceOf(i)}</span>
        </label>
      ))}
    </fieldset>
  );
}
