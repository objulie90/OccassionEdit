import React, { useState, useEffect, useMemo } from 'react';
import { BalloonGraphic } from '../components/ui';
import { PaletteEditor } from './CatalogueTabs';
import { BALLOON_SIZES, DEFAULT_LOW_STOCK, committedBalloons, committedFoils } from './stockModel';

const FINISHES = ['Matte', 'Pearl', 'Chrome'];
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * The balloons in the cupboard. Laura counts what she has; the Studio takes off
 * what booked jobs will use and warns her before anything runs short.
 */
export function BalloonStock({ balloonColours = [], curatedPalettes = [], steps = [], quotes = [], studioSettings = {}, onSaveStudioSettings, onSaveColours, onSaveCuratedPalettes }) {
  const [counts, setCounts] = useState(studioSettings.balloonStock || {});
  const [foils, setFoils] = useState(studioSettings.foilStock || {});
  const [low, setLow] = useState(studioSettings.lowStockAt ?? DEFAULT_LOW_STOCK);
  const [state, setState] = useState('idle');
  const [colourState, setColourState] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', finish: 'Matte', hex: '#D8C3A5' });

  useEffect(() => {
    setCounts(studioSettings.balloonStock || {});
    setFoils(studioSettings.foilStock || {});
    setLow(studioSettings.lowStockAt ?? DEFAULT_LOW_STOCK);
  }, [studioSettings]);

  const booked = useMemo(() => committedBalloons(quotes, steps, balloonColours), [quotes, steps, balloonColours]);
  const bookedFoils = useMemo(() => committedFoils(quotes), [quotes]);
  const onHand = (id, size) => Number(counts[id]?.[size]) || 0;
  const left = (id, size) => onHand(id, size) - (booked[id]?.[size] || 0);
  const lowAt = Math.max(0, Number(low) || 0);
  const running = balloonColours.filter(c => BALLOON_SIZES.some(sz => left(c.id, sz.key) < lowAt));
  const short = balloonColours.filter(c => BALLOON_SIZES.some(sz => left(c.id, sz.key) < 0));

  const setCount = (id, size, value) => {
    setCounts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [size]: value } }));
    setState('idle');
  };

  const saveCounts = async () => {
    if (!onSaveStudioSettings) return;
    setState('saving');
    const clean = Object.fromEntries(Object.entries(counts).map(([id, sizes]) => [id, Object.fromEntries(BALLOON_SIZES.map(sz => [sz.key, Math.max(0, parseInt(sizes?.[sz.key], 10) || 0)]))]));
    const cleanFoils = Object.fromEntries(DIGITS.map(d => [d, Math.max(0, parseInt(foils[d], 10) || 0)]));
    try {
      await onSaveStudioSettings({ ...studioSettings, balloonStock: clean, foilStock: cleanFoils, lowStockAt: lowAt, stockCountedAt: new Date().toISOString() });
      setState('saved');
    } catch (_e) {
      setState('error');
    }
  };

  const setAvailable = async (c, inStock) => {
    if (!onSaveColours || c.inStock === inStock) return;
    const ok = await onSaveColours(balloonColours.map(x => (x.id === c.id ? { ...x, inStock } : x)));
    setColourState(ok === false ? 'Not saved. Check your connection and try again.' : inStock ? `${c.name} is back on the website.` : `${c.name} is hidden from customers until you switch it back.`);
  };

  const addColour = async (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const used = balloonColours.map(c => parseInt(c.code, 10)).filter(n => !Number.isNaN(n));
    const code = String((used.length ? Math.max(...used) : 0) + 1).padStart(3, '0');
    const id = `colour-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${code}`;
    const ok = await onSaveColours([...balloonColours, { id, code, name, hex: draft.hex, finish: draft.finish, inStock: true }]);
    setColourState(ok === false ? 'Not saved. Check your connection and try again.' : `${name} added.`);
    if (ok !== false) { setAdding(false); setDraft({ name: '', finish: 'Matte', hex: '#D8C3A5' }); }
  };

  const counted = studioSettings.stockCountedAt ? new Date(studioSettings.stockCountedAt) : null;

  return (
    <>
      <section className="st-palettes" aria-labelledby="st-balloons-title">
        <div className="st-cat-top">
          <h3 id="st-balloons-title" className="st-section-title">Balloons</h3>
          {onSaveColours && <button type="button" className="st-btn" onClick={() => setAdding(!adding)}>Add a colour</button>}
        </div>
        <p className="st-cat-note">
          Type what's in the cupboard. Booked jobs are taken off automatically, so Left is what you really have.
          {counted && ` Last counted ${counted.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`}
        </p>

        {short.length > 0 && <p className="st-warning">Not enough for booked jobs: {short.map(c => c.name).join(', ')}. Order more before those dates.</p>}
        {short.length === 0 && running.length > 0 && <p className="st-warning">Running low: {running.map(c => c.name).join(', ')}.</p>}

        {adding && (
          <form className="st-add-colour" onSubmit={addColour}>
            <div className="st-field"><label htmlFor="st-new-colour-name">Colour name</label><input id="st-new-colour-name" type="text" maxLength={24} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="st-field" role="group" aria-label="Finish">
              <span className="st-field-label">Finish</span>
              <div className="st-filter">{FINISHES.map(fin => <button key={fin} type="button" className="st-chip" aria-pressed={draft.finish === fin} onClick={() => setDraft({ ...draft, finish: fin })}>{fin}</button>)}</div>
            </div>
            <div className="st-field">
              <label htmlFor="st-new-colour-hex">Colour</label>
              <div className="st-colour-pick"><input id="st-new-colour-hex" type="color" value={draft.hex} onChange={e => setDraft({ ...draft, hex: e.target.value })} /><BalloonGraphic hex={draft.hex} finish={draft.finish} size={34} /></div>
            </div>
            <div className="st-business-actions">
              <button type="submit" className="st-btn st-btn-primary" disabled={!draft.name.trim()}>Add colour</button>
              <button type="button" className="st-link st-link-quiet" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        )}

        <ul className="st-stock-list">
          {balloonColours.map(c => (
            <li key={c.id} className={`st-stock-row ${c.inStock ? '' : 'is-out'}`}>
              <div className="st-stock-colour">
                <BalloonGraphic hex={c.hex} finish={c.finish} size={30} />
                <span>
                  <span className="st-product-name">{c.name}</span>
                  <span className="st-code">{c.finish}{c.code ? ` · BALL_${c.code}` : ''}</span>
                </span>
              </div>
              <div className="st-stock-sizes">
                {BALLOON_SIZES.map(sz => {
                  const l = left(c.id, sz.key);
                  return (
                    <div key={sz.key} className="st-stock-size">
                      <label htmlFor={`st-stock-${c.id}-${sz.key}`}>{sz.words}</label>
                      <input id={`st-stock-${c.id}-${sz.key}`} type="number" inputMode="numeric" min="0" value={counts[c.id]?.[sz.key] ?? ''} placeholder="0" onChange={e => setCount(c.id, sz.key, e.target.value)} />
                      <span className={`st-stock-left ${l < 0 ? 'is-short' : l < lowAt ? 'is-low' : ''}`}>
                        {booked[c.id]?.[sz.key] ? `${booked[c.id][sz.key]} booked, ` : ''}{l} left
                      </span>
                    </div>
                  );
                })}
              </div>
              {onSaveColours && (
                <div className="st-stock-pick" role="group" aria-label={`${c.name} on the website`}>
                  <button type="button" className="st-chip" aria-pressed={c.inStock} onClick={() => setAvailable(c, true)}>On the website</button>
                  <button type="button" className="st-chip" aria-pressed={!c.inStock} onClick={() => setAvailable(c, false)}>Hidden</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p role="status" className="st-save-state">{colourState}</p>

        <h4 className="st-tree-group-title">Helium foil numbers</h4>
        <ul className="st-foil-grid">
          {DIGITS.map(d => {
            const l = (Number(foils[d]) || 0) - (bookedFoils[d] || 0);
            return (
              <li key={d} className="st-foil">
                <label htmlFor={`st-foil-${d}`}><span className="st-foil-digit">{d}</span><span className="st-code">EXTRAS_Num_{d}</span></label>
                <input id={`st-foil-${d}`} type="number" inputMode="numeric" min="0" value={foils[d] ?? ''} placeholder="0" onChange={e => { setFoils({ ...foils, [d]: e.target.value }); setState('idle'); }} />
                <span className={`st-stock-left ${l < 0 ? 'is-short' : l < 1 ? 'is-low' : ''}`}>{bookedFoils[d] ? `${bookedFoils[d]} booked, ` : ''}{l} left</span>
              </li>
            );
          })}
        </ul>

        <div className="st-business-actions">
          <div className="st-field st-low-field">
            <label htmlFor="st-low-stock">Warn me below</label>
            <input id="st-low-stock" type="number" inputMode="numeric" min="0" value={low} onChange={e => { setLow(e.target.value); setState('idle'); }} />
          </div>
          <button type="button" className="st-btn st-btn-primary" onClick={saveCounts} disabled={state === 'saving' || !onSaveStudioSettings}>{state === 'saving' ? 'Saving' : 'Save counts'}</button>
          <span role="status" className="st-save-state">
            {state === 'saved' && 'Saved.'}
            {state === 'error' && 'Not saved. Check your connection and try again.'}
          </span>
        </div>
      </section>

      <PaletteEditor palettes={curatedPalettes} colours={balloonColours} onSave={onSaveCuratedPalettes} />
    </>
  );
}
