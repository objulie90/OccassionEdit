// Shared pieces for editing what customers see: product labels and offers, and the ready-made palettes
import React, { useState, useEffect } from 'react';
import { BalloonGraphic } from '../components/ui';

export const LABELS = [
  ['none', 'No label'],
  ['New', 'New'],
  ['Best seller', 'Best seller'],
  ['Most popular', 'Most popular'],
  ['custom', 'Your own words']
];

export function bannerFromForm(f) {
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

const NAME_LIMIT = 24;
const DESCRIPTION_LIMIT = 90;

// The ready-made palettes customers pick from in step 1 of the builder
export function PaletteEditor({ palettes, colours, onSave }) {
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
              <textarea
                id={`st-pal-desc-${pal.id}`}
                rows={2}
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
