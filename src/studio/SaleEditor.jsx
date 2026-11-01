import React, { useState } from 'react';
import { buildProductTree } from './inventoryModel';
import { saleState, saleBannerText, todayIso } from '../lib/sale';

const EMPTY = { enabled: true, label: 'Sale', discountType: 'percent', discountValue: '', start: '', end: '', appliesTo: 'all', itemKeys: [], includeBundles: true, showBanner: true, bannerText: '' };

function longDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * One sale at a time: a label and a price cut on everything or on ticked
 * products, between two dates, with an optional banner across the top of the site.
 */
export function SaleEditor({ sale, onSaveSale, steps = [], digitOptions = [], catalog = [], inspirationSlides = [] }) {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(sale || {}), discountValue: sale?.discountValue ?? '' }));
  const [state, setState] = useState('idle');
  const set = patch => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };
  const tree = buildProductTree(steps, digitOptions, catalog);
  const status = saleState(sale);

  const toggle = key => set({ itemKeys: f.itemKeys.includes(key) ? f.itemKeys.filter(k => k !== key) : [...f.itemKeys, key] });
  const toggleMany = (keys, on) => set({ itemKeys: on ? [...new Set([...f.itemKeys, ...keys])] : f.itemKeys.filter(k => !keys.includes(k)) });

  const save = async (e, patch = {}) => {
    if (e) e.preventDefault();
    const next = { ...f, ...patch, discountValue: Math.max(0, Number(f.discountValue) || 0), label: (f.label || 'Sale').trim() };
    if (next.enabled && !(next.discountValue > 0)) { setState('missing'); return; }
    if (next.start && next.end && next.end < next.start) { setState('dates'); return; }
    setState('saving');
    const ok = await onSaveSale(next);
    if (ok === false) setState('error');
    else { setF(next); setState(patch.enabled === false ? 'ended' : 'saved'); }
  };

  const value = Number(f.discountValue) || 0;
  const off = f.discountType === 'fixed' ? `£${value} off` : `${value}% off`;
  const chosen = f.appliesTo === 'all' ? null : f.itemKeys.length;

  return (
    <form className="st-palettes st-sale" onSubmit={e => save(e, { enabled: true })} aria-labelledby="st-sale-title">
      <h3 id="st-sale-title" className="st-section-title">Sale</h3>
      <p className={`st-sale-status is-${status}`} role="status">
        {status === 'live' && `On now: ${saleBannerText(sale)}.`}
        {status === 'scheduled' && `Starts ${longDate(sale.start)}. Customers won't see it until then.`}
        {status === 'ended' && 'This sale has finished. Prices are back to normal.'}
        {status === 'off' && 'No sale running. Set one up below.'}
      </p>

      <div className="st-form-grid">
        <div className="st-field">
          <label htmlFor="st-sale-label">Label on each product</label>
          <input id="st-sale-label" type="text" maxLength={22} value={f.label} onChange={e => set({ label: e.target.value })} />
        </div>
        <div className="st-field" role="group" aria-label="Discount">
          <span className="st-field-label">Discount</span>
          <div className="st-filter">
            <button type="button" className="st-chip" aria-pressed={f.discountType === 'percent'} onClick={() => set({ discountType: 'percent' })}>% off</button>
            <button type="button" className="st-chip" aria-pressed={f.discountType === 'fixed'} onClick={() => set({ discountType: 'fixed' })}>£ off</button>
          </div>
          <input type="number" inputMode="decimal" min="0" aria-label={f.discountType === 'percent' ? 'Percent off' : 'Pounds off'} placeholder={f.discountType === 'percent' ? 'e.g. 15' : 'e.g. 20'} value={f.discountValue} onChange={e => set({ discountValue: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="st-sale-start">Starts</label>
          <input id="st-sale-start" type="date" min={todayIso()} value={f.start} onChange={e => set({ start: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="st-sale-end">Ends (last day of the sale)</label>
          <input id="st-sale-end" type="date" min={f.start || todayIso()} value={f.end} onChange={e => set({ end: e.target.value })} />
        </div>
      </div>

      <div className="st-field" role="group" aria-label="What's in the sale">
        <span className="st-field-label">What's in the sale</span>
        <div className="st-filter">
          <button type="button" className="st-chip" aria-pressed={f.appliesTo === 'all'} onClick={() => set({ appliesTo: 'all' })}>Everything</button>
          <button type="button" className="st-chip" aria-pressed={f.appliesTo === 'selected'} onClick={() => set({ appliesTo: 'selected' })}>Products I choose</button>
        </div>
        {f.appliesTo === 'all' && (
          <label className="st-check"><input type="checkbox" checked={f.includeBundles !== false} onChange={e => set({ includeBundles: e.target.checked })} /><span>Include the bundles in Get inspired</span></label>
        )}
      </div>

      {f.appliesTo === 'selected' && (
        <div className="st-sale-pick">
          {tree.map(section => {
            const keys = section.groups.flatMap(g => g.items.map(l => l.key));
            const allOn = keys.every(k => f.itemKeys.includes(k));
            return (
              <fieldset key={section.id} className="st-prop-pick">
                <legend className="st-field-label">{section.title}</legend>
                <button type="button" className="st-link st-link-quiet" onClick={() => toggleMany(keys, !allOn)}>{allOn ? 'Untick all' : 'Tick all'}</button>
                <ul>
                  {section.groups.flatMap(g => g.items).map(l => (
                    <li key={l.key}><label className="st-check"><input type="checkbox" checked={f.itemKeys.includes(l.key)} onChange={() => toggle(l.key)} /><span>{l.item.name}</span></label></li>
                  ))}
                </ul>
              </fieldset>
            );
          })}
          {inspirationSlides.length > 0 && (
            <fieldset className="st-prop-pick">
              <legend className="st-field-label">Bundles</legend>
              <ul>
                {inspirationSlides.map(sl => (
                  <li key={sl.id}><label className="st-check"><input type="checkbox" checked={f.itemKeys.includes(`bundle:${sl.id}`)} onChange={() => toggle(`bundle:${sl.id}`)} /><span>{sl.title}</span></label></li>
                ))}
              </ul>
            </fieldset>
          )}
        </div>
      )}

      <div className="st-field">
        <label className="st-check"><input type="checkbox" checked={f.showBanner} onChange={e => set({ showBanner: e.target.checked })} /><span>Show a banner across the top of the website</span></label>
        {f.showBanner && (
          <>
            <label htmlFor="st-sale-banner" className="st-visually-hidden">Banner words</label>
            <input id="st-sale-banner" type="text" maxLength={120} placeholder={saleBannerText({ ...f, discountValue: value })} value={f.bannerText} onChange={e => set({ bannerText: e.target.value })} />
            <span className="st-hint">Leave it blank to use the words shown.</span>
          </>
        )}
      </div>

      {value > 0 && (
        <p className="st-sale-preview">
          <span className="st-tag st-tag-offer">{f.label || 'Sale'}</span>{' '}
          {off} {chosen === null ? 'everything' : `${chosen} chosen item${chosen === 1 ? '' : 's'}`}
          {f.start ? `, from ${longDate(f.start)}` : ', from today'}
          {f.end ? ` until ${longDate(f.end)}` : ' until you end it'}.
        </p>
      )}

      <div className="st-business-actions">
        <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving'}>{status === 'live' || status === 'scheduled' ? 'Save changes' : 'Start the sale'}</button>
        {(status === 'live' || status === 'scheduled') && (
          <button type="button" className="st-btn" onClick={() => save(null, { enabled: false })}>End the sale now</button>
        )}
        <span role="status" className="st-save-state">
          {state === 'saved' && 'Saved. The website shows it on the dates you chose.'}
          {state === 'ended' && 'Sale ended. Prices are back to normal.'}
          {state === 'missing' && 'Add how much off.'}
          {state === 'dates' && 'The end date is before the start.'}
          {state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </form>
  );
}
