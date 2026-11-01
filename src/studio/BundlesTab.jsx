import React, { useState } from 'react';
import { calculateLookRecipePrice } from '../data/catalogData.js';
import { LABELS, bannerFromForm } from './CatalogueTabs';
import { money } from './studioFormat';

function bannerChoices(b) {
  const banner = b && b.enabled ? b : null;
  const preset = banner && LABELS.some(([v]) => v === banner.text) ? banner.text : null;
  const isOfferText = banner && /off$|^save/i.test(banner.text || '');
  return {
    label: !banner ? 'none' : preset || (isOfferText ? 'none' : 'custom'),
    customLabel: banner && !preset && !isOfferText ? banner.text : '',
    discountType: banner?.discountType && banner.discountType !== 'none' ? banner.discountType : 'none',
    discountValue: banner?.discountValue || ''
  };
}

/**
 * The ready-made looks in Get inspired: what's in each, its photo, words,
 * price and any offer. Customers can load one into the builder and change it.
 */
export function BundlesTab({ inspirationSlides = [], steps = [], digitOptions = [], balloonColours = [], curatedPalettes = [], onSaveBundles, onUploadPhoto }) {
  const [openId, setOpenId] = useState(null);
  const [removed, setRemoved] = useState(null);
  const categories = [...new Set(inspirationSlides.map(s => s.category).filter(Boolean))];

  const save = (next) => onSaveBundles(next);
  const update = (id, patch) => save(inspirationSlides.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const add = async () => {
    const id = `bundle-${Date.now().toString(36)}`;
    const ok = await save([...inspirationSlides, { id, category: categories[0] || 'Birthdays', title: 'New bundle', description: '', guidePrice: 0, image: '', isExampleWatermark: false, cornerBanner: null, preset: { extraIds: [] } }]);
    if (ok !== false) setOpenId(id);
  };
  const remove = async (slide, index) => {
    setOpenId(null);
    const ok = await save(inspirationSlides.filter(s => s.id !== slide.id));
    if (ok !== false) setRemoved({ slide, index });
  };
  const restore = async () => {
    const next = [...inspirationSlides];
    next.splice(Math.min(removed.index, next.length), 0, removed.slide);
    await save(next);
    setRemoved(null);
  };

  return (
    <div className="st-catalogue">
      <div className="st-cat-top">
        <h3 className="st-section-title">Bundles</h3>
        {onSaveBundles && <button type="button" className="st-btn st-btn-primary" onClick={add}>Add a bundle</button>}
      </div>
      <p className="st-cat-note">The ready-made looks in Get inspired. Customers see them cheapest first, and can start their edit from any of them.</p>
      {removed && (
        <div className="st-undo" role="status">
          <span>{removed.slide.title} removed.</span>
          <button type="button" className="st-link" onClick={restore}>Undo</button>
          <button type="button" className="st-link st-link-quiet" onClick={() => setRemoved(null)}>Dismiss</button>
        </div>
      )}
      <ul className="st-product-list">
        {inspirationSlides.map((slide, index) => (
          <li key={slide.id} className="st-product-row">
            <div className="st-bundle-row">
              <button type="button" className="st-product" aria-expanded={openId === slide.id} onClick={() => setOpenId(openId === slide.id ? null : slide.id)}>
                <span className="st-product-thumb" aria-hidden="true">{slide.image ? <img src={slide.image} alt="" loading="lazy" /> : null}</span>
                <span className="st-product-main">
                  <span className="st-product-name">
                    {slide.title}
                    {slide.cornerBanner?.enabled && slide.cornerBanner.text && <span className="st-tag st-tag-offer">{slide.cornerBanner.text}</span>}
                  </span>
                  <span className="st-code">{slide.category}</span>
                </span>
                <span className="st-tag">Bundle</span>
                <span className="st-product-price">{money(slide.guidePrice)}</span>
                <span className="st-stock is-in">{slide.manualPriceOverride ? 'Your price' : 'Follows your prices'}</span>
              </button>
            </div>
            {openId === slide.id && (
              <BundleEditor
                slide={slide}
                categories={categories}
                steps={steps}
                digitOptions={digitOptions}
                balloonColours={balloonColours}
                curatedPalettes={curatedPalettes}
                onSave={patch => update(slide.id, patch)}
                onRemove={() => remove(slide, index)}
                onUploadPhoto={onUploadPhoto}
                onClose={() => setOpenId(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BundleEditor({ slide, categories, steps, digitOptions, balloonColours, curatedPalettes, onSave, onRemove, onUploadPhoto, onClose }) {
  const preset = slide.preset || {};
  const [f, setF] = useState(() => ({
    title: slide.title || '',
    category: slide.category || '',
    description: slide.description || '',
    guidePrice: slide.guidePrice ?? '',
    ownPrice: Boolean(slide.manualPriceOverride),
    image: slide.image || '',
    isExampleWatermark: Boolean(slide.isExampleWatermark),
    paletteId: preset.paletteId || '',
    backdropId: preset.backdropId || '',
    shimmerSize: preset.shimmerSize || 'small',
    balloonId: preset.balloonId || '',
    digitOptionId: preset.digitOptionId || 'digits-none',
    digitText: preset.digitText || '',
    extraIds: preset.extraIds || [],
    ...bannerChoices(slide.cornerBanner)
  }));
  const [state, setState] = useState('idle');
  const set = patch => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };
  const itemsOf = id => steps.find(st => st.id === id)?.items || [];
  const backdrop = itemsOf('backdrop').find(i => i.id === f.backdropId);
  const recipe = {
    paletteId: f.paletteId || null,
    backdropId: f.backdropId || null,
    shimmerSize: f.shimmerSize,
    balloonId: f.balloonId || null,
    digitOptionId: f.digitOptionId,
    digitText: f.digitText,
    extraIds: f.extraIds
  };
  const worked = calculateLookRecipePrice(recipe, steps, digitOptions, balloonColours, curatedPalettes, null).originalTotal;
  const banner = bannerFromForm(f);
  const guide = f.ownPrice ? Number(f.guidePrice) || 0 : worked;
  const offerPrice = banner && banner.discountType !== 'none'
    ? (banner.discountType === 'percent' ? Math.round(guide * (1 - banner.discountValue / 100)) : Math.max(0, guide - banner.discountValue))
    : null;

  const choosePhoto = async (file) => {
    if (!file || !onUploadPhoto) return;
    setState('uploading');
    try { set({ image: await onUploadPhoto(file) }); } catch (_e) { setState('error'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setState('saving');
    const ok = await onSave({
      title: f.title.trim() || 'New bundle',
      category: f.category.trim(),
      description: f.description.trim(),
      guidePrice: f.ownPrice ? Math.max(0, Number(f.guidePrice) || 0) : worked,
      manualPriceOverride: f.ownPrice,
      image: f.image,
      isExampleWatermark: f.isExampleWatermark,
      cornerBanner: banner ? { ...banner, position: 'top-right' } : null,
      preset: { ...recipe, paletteId: recipe.paletteId || undefined, backdropId: recipe.backdropId || undefined, balloonId: recipe.balloonId || undefined }
    });
    setState(ok === false ? 'error' : 'saved');
  };

  const sid = slide.id;
  return (
    <form className="st-product-editor" onSubmit={submit} aria-label={`Edit ${slide.title}`}>
      <div className="st-editor-photo">
        {f.image ? <img src={f.image} alt="" /> : <span className="st-empty">No photo yet</span>}
        <label className="st-btn">
          {state === 'uploading' ? 'Adding photo' : f.image ? 'Change photo' : 'Add a photo'}
          <input type="file" accept="image/*" hidden onChange={e => choosePhoto(e.target.files?.[0])} />
        </label>
        <label className="st-check"><input type="checkbox" checked={f.isExampleWatermark} onChange={e => set({ isExampleWatermark: e.target.checked })} /><span>Mark it "Example image" (not your own photo)</span></label>
      </div>
      <div className="st-editor-fields">
        <div className="st-field"><label htmlFor={`bd-title-${sid}`}>Name</label><input id={`bd-title-${sid}`} type="text" value={f.title} onChange={e => set({ title: e.target.value })} /></div>
        <div className="st-field" role="group" aria-label="Occasion">
          <span className="st-field-label">Occasion</span>
          <div className="st-filter">
            {categories.map(c => <button key={c} type="button" className="st-chip" aria-pressed={f.category === c} onClick={() => set({ category: c })}>{c}</button>)}
          </div>
          <input type="text" aria-label="Or a new occasion" placeholder="Or type a new one" value={categories.includes(f.category) ? '' : f.category} onChange={e => set({ category: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor={`bd-desc-${sid}`}>Words</label>
          <textarea id={`bd-desc-${sid}`} rows={3} value={f.description} onChange={e => set({ description: e.target.value })} />
          <span className="st-hint">Sell the moment: how the day will feel and look.</span>
        </div>

        <fieldset className="st-prop-pick">
          <legend className="st-field-label">What's in it</legend>
          <div className="st-form-grid">
            <div className="st-field">
              <label htmlFor={`bd-pal-${sid}`}>Colours</label>
              <select id={`bd-pal-${sid}`} value={f.paletteId} onChange={e => set({ paletteId: e.target.value })}>
                <option value="">Customer chooses</option>
                {curatedPalettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="st-field">
              <label htmlFor={`bd-base-${sid}`}>Base</label>
              <select id={`bd-base-${sid}`} value={f.backdropId} onChange={e => set({ backdropId: e.target.value })}>
                <option value="">No base</option>
                {itemsOf('backdrop').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            {backdrop?.hasSizeTier && (
              <div className="st-field">
                <label htmlFor={`bd-size-${sid}`}>Wall size</label>
                <select id={`bd-size-${sid}`} value={f.shimmerSize} onChange={e => set({ shimmerSize: e.target.value })}>
                  <option value="small">Small</option>
                  <option value="large">Large</option>
                </select>
              </div>
            )}
            <div className="st-field">
              <label htmlFor={`bd-struc-${sid}`}>Balloons</label>
              <select id={`bd-struc-${sid}`} value={f.balloonId} onChange={e => set({ balloonId: e.target.value })}>
                <option value="">None</option>
                {itemsOf('balloons').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="st-field">
              <label htmlFor={`bd-num-${sid}`}>Numbers or letters</label>
              <select id={`bd-num-${sid}`} value={f.digitOptionId} onChange={e => set({ digitOptionId: e.target.value })}>
                {digitOptions.map(d => <option key={d.id} value={d.id}>{d.id === 'digits-none' ? 'None' : d.name}</option>)}
              </select>
            </div>
            {f.digitOptionId !== 'digits-none' && (
              <div className="st-field"><label htmlFor={`bd-text-${sid}`}>Which numbers or letters</label><input id={`bd-text-${sid}`} type="text" maxLength={8} value={f.digitText} onChange={e => set({ digitText: e.target.value })} /></div>
            )}
          </div>
          <span className="st-field-label">Finishing touches</span>
          <ul>
            {itemsOf('extras').map(i => (
              <li key={i.id}><label className="st-check"><input type="checkbox" checked={f.extraIds.includes(i.id)} onChange={() => set({ extraIds: f.extraIds.includes(i.id) ? f.extraIds.filter(x => x !== i.id) : [...f.extraIds, i.id] })} /><span>{i.name}</span></label></li>
            ))}
          </ul>
        </fieldset>

        <div className="st-field">
          <span className="st-field-label">Price</span>
          <span className="st-hint">What's in it comes to {money(worked)} at today's prices, and the bundle price follows your prices automatically.</span>
          <label className="st-check"><input type="checkbox" checked={f.ownPrice} onChange={e => set({ ownPrice: e.target.checked, guidePrice: f.guidePrice || worked })} /><span>Set my own price instead</span></label>
          {f.ownPrice && (
            <input id={`bd-price-${sid}`} type="number" inputMode="decimal" min="0" aria-label="Your price (£)" value={f.guidePrice} onChange={e => set({ guidePrice: e.target.value })} />
          )}
          <span className="st-hint">Customers who build these same items themselves get the same saving automatically.</span>
        </div>
        <div className="st-field" role="group" aria-label="Label on the photo">
          <span className="st-field-label">Label on the photo</span>
          <div className="st-filter">
            {LABELS.map(([value, text]) => <button key={value} type="button" className="st-chip" aria-pressed={f.label === value} onClick={() => set({ label: value })}>{text}</button>)}
          </div>
          {f.label === 'custom' && <input type="text" aria-label="Your label" maxLength={22} value={f.customLabel} onChange={e => set({ customLabel: e.target.value })} />}
        </div>
        <div className="st-field" role="group" aria-label="Offer">
          <span className="st-field-label">Offer</span>
          <div className="st-filter">
            {[['none', 'No offer'], ['percent', '% off'], ['fixed', '£ off']].map(([value, text]) => (
              <button key={value} type="button" className="st-chip" aria-pressed={f.discountType === value} onClick={() => set({ discountType: value })}>{text}</button>
            ))}
          </div>
          {f.discountType !== 'none' && <input type="number" inputMode="decimal" min="0" aria-label={f.discountType === 'percent' ? 'Percent off' : 'Pounds off'} value={f.discountValue} onChange={e => set({ discountValue: e.target.value })} />}
          {offerPrice !== null && <span className="st-hint">Customers will see {money(guide)} crossed out and pay {money(offerPrice)}.</span>}
        </div>
        <div className="st-business-actions">
          <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving' || state === 'uploading'}>{state === 'saving' ? 'Saving' : 'Save and publish'}</button>
          <button type="button" className="st-link st-link-quiet" onClick={onClose}>Close</button>
          <span role="status" className="st-save-state">
            {state === 'saved' && 'Saved. Customers see it now.'}
            {state === 'error' && 'Not saved. Check your connection and try again.'}
          </span>
        </div>
        <button type="button" className="st-link st-link-danger st-remove-link" onClick={onRemove}>Remove this bundle</button>
      </div>
    </form>
  );
}
