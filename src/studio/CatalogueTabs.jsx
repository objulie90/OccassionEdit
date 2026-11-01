import React, { useState, useEffect } from 'react';
import { BalloonGraphic } from '../components/ui';
import { money } from './studioFormat';

// Placeholder ids such as "csv-3" are not real product codes, so they are not shown
function realProductCode(item) {
  const code = item.sku || '';
  return /^csv-/i.test(code) ? '' : code;
}

export function ProductsTab({ catalog }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const groups = [...new Set(catalog.map(i => i.department || i.section).filter(Boolean))];
  const term = search.trim().toLowerCase();
  const items = catalog.filter(i =>
    (group === 'all' || (i.department || i.section) === group) &&
    (!term || i.name.toLowerCase().includes(term) || realProductCode(i).toLowerCase().includes(term))
  );

  return (
    <div className="st-catalogue">
      <div className="st-cat-head">
        <p className="st-cat-note">
          To change a price, photo or whether something is available, close the studio and choose Edit directly.
        </p>
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
          <li key={item.id} className={`st-product ${item.inStock ? '' : 'is-out'}`}>
            <div className="st-product-main">
              <span className="st-product-name">{item.name}</span>
              {item.style && <span className="st-product-style">{item.style}</span>}
            </div>
            <span className="st-tag">{item.hireOnly ? 'Hire' : 'Customer keeps'}</span>
            <span className="st-product-price">
              {money(item.basePrice)}
              {item.secondPrice ? <span className="st-product-second">or {money(item.secondPrice)}</span> : null}
            </span>
            <span className={`st-stock ${item.inStock ? 'is-in' : 'is-out'}`}>{item.inStock ? 'Available' : 'Not available'}</span>
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
