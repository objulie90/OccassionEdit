import React, { useState, useEffect } from 'react';
import { BalloonGraphic } from '../components/ui';
import { money } from './studioFormat';

// Placeholder ids such as "csv-3" are not real product codes, so they are not shown
function realProductCode(item) {
  const code = item.sku || '';
  return /^csv-/i.test(code) ? '' : code;
}

// How many of each hire prop Laura owns: the diary uses this to grey props out
function HirePropCounts({ steps, onSave }) {
  const hireItems = steps.flatMap(st => (st.items || []).map(it => ({ ...it, stepId: st.id }))).filter(it => it.hireOnly && !it.madeToOrder);
  const initial = Object.fromEntries(hireItems.map(it => [it.id, it.ownedCount ?? '']));
  const [counts, setCounts] = useState(initial);
  const [state, setState] = useState('idle');
  const changed = hireItems.some(it => String(counts[it.id]) !== String(it.ownedCount ?? ''));

  const save = async () => {
    setState('saving');
    const ok = await onSave(Object.fromEntries(
      Object.entries(counts).filter(([, v]) => v !== '').map(([k, v]) => [k, Math.max(0, parseInt(v, 10) || 0)])
    ));
    setState(ok === false ? 'error' : 'saved');
  };

  return (
    <section className="st-palettes" aria-labelledby="st-hire-title">
      <h3 id="st-hire-title" className="st-section-title">Hire props you own</h3>
      <p className="st-cat-note">
        A prop is out from the party until you collect it the next day. When all of them are booked around a date,
        customers see it greyed out. Anything left blank counts as one.
      </p>
      <ul className="st-product-list">
        {hireItems.map(it => (
          <li key={it.id} className="st-product st-hire-row">
            <label className="st-product-main" htmlFor={`st-own-${it.id}`}>
              <span className="st-product-name">{it.name}</span>
            </label>
            <input
              id={`st-own-${it.id}`}
              className="st-count-input"
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              placeholder="1"
              value={counts[it.id]}
              onChange={e => { setCounts({ ...counts, [it.id]: e.target.value }); setState('idle'); }}
            />
          </li>
        ))}
      </ul>
      <div className="st-business-actions">
        <button type="button" className="st-btn st-btn-primary" disabled={!changed || state === 'saving'} onClick={save}>
          {state === 'saving' ? 'Saving' : 'Save numbers'}
        </button>
        <span role="status" className="st-save-state">
          {state === 'saved' && 'Saved. The diary now uses these numbers.'}
          {state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </section>
  );
}

const LABELS = [
  ['none', 'No label'],
  ['New', 'New'],
  ['Best seller', 'Best seller'],
  ['Most popular', 'Most popular'],
  ['custom', 'Your own words']
];

function bannerFromForm(f) {
  const discountValue = Number(f.discountValue) || 0;
  const hasOffer = f.discountType !== 'none' && discountValue > 0;
  const offerText = hasOffer ? (f.discountType === 'percent' ? `${discountValue}% off` : `£${discountValue} off`) : '';
  const labelText = f.label === 'none' ? '' : f.label === 'custom' ? f.customLabel.trim() : f.label;
  const text = labelText || offerText;
  if (!text && !hasOffer) return null;
  return {
    enabled: true,
    text,
    style: hasOffer ? 'coral' : f.label === 'New' ? 'gold' : 'sage',
    discountType: hasOffer ? f.discountType : 'none',
    discountValue: hasOffer ? discountValue : 0
  };
}

function formFromItem(item, builderNote) {
  const b = item.cornerBanner && item.cornerBanner.enabled ? item.cornerBanner : null;
  const preset = b && LABELS.some(([v]) => v === b.text) ? b.text : null;
  const offerText = b && b.discountType && b.discountType !== 'none';
  return {
    name: item.name || '',
    style: item.style || '',
    builderNote: builderNote ?? '',
    basePrice: item.basePrice ?? '',
    image: item.image || '',
    inStock: item.inStock !== false,
    label: !b ? 'none' : preset || (offerText && /off$/.test(b.text) ? 'none' : 'custom'),
    customLabel: b && !preset && !(offerText && /off$/.test(b.text)) ? b.text : '',
    discountType: b?.discountType && b.discountType !== 'none' ? b.discountType : 'none',
    discountValue: b?.discountValue || ''
  };
}

// Everything customers see about one product, edited in one place
function ProductEditor({ item, builderNote, onSave, onUploadPhoto, onClose }) {
  const [f, setF] = useState(() => formFromItem(item, builderNote));
  const [state, setState] = useState('idle'); // idle | uploading | saving | saved | error
  const set = (patch) => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };

  const choosePhoto = async (file) => {
    if (!file || !onUploadPhoto) return;
    setState('uploading');
    try {
      const url = await onUploadPhoto(file);
      set({ image: url });
    } catch (_e) {
      setState('error');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setState('saving');
    const patch = {
      name: f.name.trim() || item.name,
      style: f.style.trim(),
      basePrice: Math.max(0, Number(f.basePrice) || 0),
      image: f.image,
      inStock: f.inStock,
      cornerBanner: bannerFromForm(f)
    };
    if (builderNote !== null) patch.builderNote = f.builderNote.trim();
    const ok = await onSave(item.id, patch);
    setState(ok === false ? 'error' : 'saved');
  };

  const banner = bannerFromForm(f);
  const offerPrice = banner && banner.discountType !== 'none'
    ? (banner.discountType === 'percent' ? Math.round(f.basePrice * (1 - banner.discountValue / 100)) : Math.max(0, f.basePrice - banner.discountValue))
    : null;

  return (
    <form className="st-product-editor" onSubmit={save}>
      <div className="st-editor-photo">
        {f.image ? <img src={f.image} alt="" /> : <span className="st-empty">No photo yet</span>}
        <label className="st-btn">
          {state === 'uploading' ? 'Adding photo' : f.image ? 'Change photo' : 'Add a photo'}
          <input type="file" accept="image/*" hidden onChange={e => choosePhoto(e.target.files?.[0])} />
        </label>
      </div>
      <div className="st-editor-fields">
        <div className="st-field">
          <label htmlFor={`pe-name-${item.id}`}>Name</label>
          <input id={`pe-name-${item.id}`} type="text" value={f.name} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor={`pe-style-${item.id}`}>Description in the price list</label>
          <textarea id={`pe-style-${item.id}`} rows={3} value={f.style} onChange={e => set({ style: e.target.value })} />
          <span className="st-hint">Sell it: say why they'll love it, not what's in it.</span>
        </div>
        {builderNote !== null && (
          <div className="st-field">
            <label htmlFor={`pe-note-${item.id}`}>Short line on the builder card</label>
            <input id={`pe-note-${item.id}`} type="text" value={f.builderNote} onChange={e => set({ builderNote: e.target.value })} />
          </div>
        )}
        <div className="st-field">
          <label htmlFor={`pe-price-${item.id}`}>Price (£)</label>
          <input id={`pe-price-${item.id}`} type="number" inputMode="decimal" min="0" value={f.basePrice} onChange={e => set({ basePrice: e.target.value })} />
        </div>
        <div className="st-field" role="group" aria-label="Label on the photo">
          <span className="st-field-label">Label on the photo</span>
          <div className="st-filter">
            {LABELS.map(([value, text]) => (
              <button key={value} type="button" className="st-chip" aria-pressed={f.label === value} onClick={() => set({ label: value })}>{text}</button>
            ))}
          </div>
          {f.label === 'custom' && (
            <input type="text" aria-label="Your label" maxLength={22} placeholder="e.g. Just added" value={f.customLabel} onChange={e => set({ customLabel: e.target.value })} />
          )}
        </div>
        <div className="st-field" role="group" aria-label="Offer">
          <span className="st-field-label">Offer</span>
          <div className="st-filter">
            {[['none', 'No offer'], ['percent', '% off'], ['fixed', '£ off']].map(([value, text]) => (
              <button key={value} type="button" className="st-chip" aria-pressed={f.discountType === value} onClick={() => set({ discountType: value })}>{text}</button>
            ))}
          </div>
          {f.discountType !== 'none' && (
            <input type="number" inputMode="decimal" min="0" aria-label={f.discountType === 'percent' ? 'Percent off' : 'Pounds off'} placeholder={f.discountType === 'percent' ? 'e.g. 10' : 'e.g. 20'} value={f.discountValue} onChange={e => set({ discountValue: e.target.value })} />
          )}
          {offerPrice !== null && <span className="st-hint">Customers will see {money(f.basePrice)} crossed out and pay {money(offerPrice)}.</span>}
        </div>
        <div className="st-field" role="group" aria-label="Available to book">
          <span className="st-field-label">Available to book</span>
          <div className="st-filter">
            <button type="button" className="st-chip" aria-pressed={f.inStock} onClick={() => set({ inStock: true })}>Yes</button>
            <button type="button" className="st-chip" aria-pressed={!f.inStock} onClick={() => set({ inStock: false })}>Not right now</button>
          </div>
        </div>
        <div className="st-business-actions">
          <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving' || state === 'uploading'}>
            {state === 'saving' ? 'Saving' : 'Save and publish'}
          </button>
          <button type="button" className="st-link st-link-quiet" onClick={onClose}>Close</button>
          <span role="status" className="st-save-state">
            {state === 'saved' && 'Saved. Customers see it now.'}
            {state === 'error' && 'Not saved. Check your connection and try again.'}
          </span>
        </div>
      </div>
    </form>
  );
}

export function ProductsTab({ catalog, steps = [], digitOptions = [], onSaveHireCounts, onSaveProduct, onUploadPhoto }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [openId, setOpenId] = useState(null);
  const groups = [...new Set(catalog.map(i => i.department || i.section).filter(Boolean))];
  const term = search.trim().toLowerCase();
  const items = catalog.filter(i =>
    (group === 'all' || (i.department || i.section) === group) &&
    (!term || i.name.toLowerCase().includes(term) || realProductCode(i).toLowerCase().includes(term))
  );

  // The builder card's short line, when this product is also a builder option
  const builderNoteFor = (item) => {
    const link = item.builderLink;
    if (!link) return null;
    if (link.type === 'digit') return digitOptions.find(d => d.id === link.id)?.description ?? null;
    return steps.find(st => st.id === link.stepId)?.items?.find(it => it.id === link.id)?.styleNote ?? null;
  };

  return (
    <div className="st-catalogue">
      {onSaveHireCounts && <HirePropCounts steps={steps} onSave={onSaveHireCounts} />}
      <h3 className="st-section-title">Your products</h3>
      <div className="st-cat-head">
        <p className="st-cat-note">Tap a product to change its photo, words, price, label or offer.</p>
        <label htmlFor="st-product-search" className="st-visually-hidden">Search products</label>
        <input
          id="st-product-search"
          type="search"
          placeholder="Search products"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="st-filter" role="group" aria-label="Product group">
        {['all', ...groups].map(g => (
          <button key={g} type="button" className="st-chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
            {g === 'all' ? 'All' : g}
            <span className="st-chip-count">{g === 'all' ? catalog.length : catalog.filter(i => (i.department || i.section) === g).length}</span>
          </button>
        ))}
      </div>

      <ul className="st-product-list">
        {items.map(item => (
          <li key={item.id} className={`st-product-row ${item.inStock ? '' : 'is-out'}`}>
            <button
              type="button"
              className="st-product"
              aria-expanded={openId === item.id}
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
            >
              <span className="st-product-main">
                <span className="st-product-name">
                  {item.name}
                  {item.cornerBanner?.enabled && item.cornerBanner.text && <span className="st-tag st-tag-offer">{item.cornerBanner.text}</span>}
                </span>
                {item.style && <span className="st-product-style">{item.style}</span>}
              </span>
              <span className="st-tag">{item.hireOnly ? 'Hire' : 'Customer keeps'}</span>
              <span className="st-product-price">
                {money(item.basePrice)}
                {item.secondPrice ? <span className="st-product-second">or {money(item.secondPrice)}</span> : null}
              </span>
              <span className={`st-stock ${item.inStock ? 'is-in' : 'is-out'}`}>{item.inStock ? 'Available' : 'Not available'}</span>
            </button>
            {openId === item.id && onSaveProduct && (
              <ProductEditor
                item={item}
                builderNote={builderNoteFor(item)}
                onSave={onSaveProduct}
                onUploadPhoto={onUploadPhoto}
                onClose={() => setOpenId(null)}
              />
            )}
          </li>
        ))}
        {items.length === 0 && <li className="st-empty">No products match.</li>}
      </ul>
    </div>
  );
}

export function ColoursTab({ balloonColours, curatedPalettes = [], onSaveCuratedPalettes }) {
  return (
    <div className="st-catalogue">
      <PaletteEditor palettes={curatedPalettes} colours={balloonColours} onSave={onSaveCuratedPalettes} />

      <h3 className="st-section-title">All balloon colours</h3>
      <p className="st-cat-note">
        Colours customers can choose. To mark a colour as unavailable, close the studio and choose Edit directly.
      </p>
      <ul className="st-colour-grid">
        {balloonColours.map(c => (
          <li key={c.id} className={`st-colour-card ${c.inStock ? '' : 'is-out'}`}>
            <BalloonGraphic hex={c.hex} finish={c.finish} size={40} />
            <span className="st-colour-name">{c.name}</span>
            <span className="st-colour-finish">{c.finish}</span>
            <span className={`st-stock ${c.inStock ? 'is-in' : 'is-out'}`}>{c.inStock ? 'Available' : 'Not available'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NAME_LIMIT = 24;
const DESCRIPTION_LIMIT = 90;

// The ready-made palettes customers pick from in step 1 of the builder
function PaletteEditor({ palettes, colours, onSave }) {
  const [draft, setDraft] = useState(palettes);
  const [picking, setPicking] = useState(null); // { palette, slot }
  const [state, setState] = useState('idle'); // idle | saving | saved | error

  useEffect(() => { setDraft(palettes); }, [palettes]);

  const changed = JSON.stringify(draft) !== JSON.stringify(palettes);
  const missingName = draft.some(p => !(p.name || '').trim());
  const colourFor = id => colours.find(c => c.id === id) || { id, name: 'Unknown colour', hex: '#D8D2C8' };

  const update = (index, patch) => {
    setDraft(d => d.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setState('idle');
  };

  // Choosing a colour already in the palette swaps the two, so a palette never repeats a colour
  const chooseColour = (pIndex, slot, colourId) => {
    const ids = [...(draft[pIndex].colourIds || [])];
    const existing = ids.indexOf(colourId);
    if (existing !== -1) ids[existing] = ids[slot];
    ids[slot] = colourId;
    update(pIndex, { colourIds: ids });
    setPicking(null);
  };

  const save = async () => {
    if (!onSave || missingName) return;
    setState('saving');
    const cleaned = draft.map(p => ({ ...p, name: p.name.trim(), description: (p.description || '').trim() }));
    const ok = await onSave(cleaned);
    setState(ok === false ? 'error' : 'saved');
  };

  return (
    <section className="st-palettes" aria-labelledby="st-palettes-title">
      <h3 id="st-palettes-title" className="st-section-title">Ready-made palettes</h3>
      <p className="st-cat-note">
        Customers see these in step 1 of the builder. Tap a colour to change it.
      </p>
      <ol className="st-palette-list">
        {draft.map((pal, pIndex) => (
          <li key={pal.id} className="st-palette">
            <div className="st-field">
              <label htmlFor={`st-pal-name-${pal.id}`}>Palette {pIndex + 1} name</label>
              <input
                id={`st-pal-name-${pal.id}`}
                type="text"
                maxLength={NAME_LIMIT}
                value={pal.name || ''}
                onChange={e => update(pIndex, { name: e.target.value })}
              />
            </div>
            <div className="st-palette-slots" role="group" aria-label={`Colours in ${pal.name || 'this palette'}`}>
              {(pal.colourIds || []).map((id, slot) => {
                const col = colourFor(id);
                const active = picking && picking.palette === pIndex && picking.slot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`st-slot ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                    aria-label={`Colour ${slot + 1}: ${col.name}. Change`}
                    onClick={() => setPicking(active ? null : { palette: pIndex, slot })}
                  >
                    <BalloonGraphic hex={col.hex} finish={col.finish} size={30} />
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
            {picking && picking.palette === pIndex && (
              <div className="st-swatch-picker" role="group" aria-label="Choose a colour">
                {colours.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`st-swatch ${pal.colourIds[picking.slot] === c.id ? 'is-current' : ''}`}
                    onClick={() => chooseColour(pIndex, picking.slot, c.id)}
                  >
                    <BalloonGraphic hex={c.hex} finish={c.finish} size={26} />
                    <span>{c.name}</span>
                    {!c.inStock && <span className="st-swatch-out">Not available</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="st-field">
              <label htmlFor={`st-pal-desc-${pal.id}`}>One line about it</label>
              <input
                id={`st-pal-desc-${pal.id}`}
                type="text"
                maxLength={DESCRIPTION_LIMIT}
                value={pal.description || ''}
                onChange={e => update(pIndex, { description: e.target.value })}
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="st-business-actions">
        <button type="button" className="st-btn st-btn-primary" disabled={!changed || missingName || state === 'saving'} onClick={save}>
          {state === 'saving' ? 'Saving' : 'Save palettes'}
        </button>
        <span role="status" className="st-save-state">
          {missingName && 'Every palette needs a name.'}
          {!missingName && state === 'saved' && 'Saved. The builder now shows these palettes.'}
          {!missingName && state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </section>
  );
}
