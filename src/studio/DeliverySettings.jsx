import React, { useState, useEffect } from 'react';

/**
 * How far Laura travels and what she charges. Customers see these zones on the
 * delivery map and in the builder's "you're about 6 miles from us" message.
 */
export function DeliverySettings({ deliveryConfig, onSave }) {
  const [zones, setZones] = useState(deliveryConfig?.zones || []);
  const [state, setState] = useState('idle');
  useEffect(() => { setZones(deliveryConfig?.zones || []); }, [deliveryConfig]);

  const update = (i, patch) => { setZones(z => z.map((zone, j) => (j === i ? { ...zone, ...patch } : zone))); setState('idle'); };

  const save = async (e) => {
    e.preventDefault();
    setState('saving');
    const clean = zones.map(z => ({
      ...z,
      miles: Math.max(1, Math.min(100, Number(z.miles) || 1)),
      surcharge: z.perMile ? null : Math.max(0, Number(z.surcharge) || 0)
    }));
    const ok = await onSave({ ...deliveryConfig, zones: clean });
    setState(ok === false ? 'error' : 'saved');
  };

  return (
    <form className="st-business st-delivery" onSubmit={save}>
      <fieldset className="st-fieldset">
        <legend>Delivery</legend>
        {zones.map((zone, i) => (
          <div key={zone.id} className="st-delivery-zone">
            <div className="st-form-grid">
              <div className="st-field">
                <label htmlFor={`st-zone-name-${zone.id}`}>Name</label>
                <input id={`st-zone-name-${zone.id}`} type="text" value={zone.name} onChange={e => update(i, { name: e.target.value })} />
              </div>
              <div className="st-field">
                <label htmlFor={`st-zone-miles-${zone.id}`}>Up to (miles)</label>
                <input id={`st-zone-miles-${zone.id}`} type="number" inputMode="numeric" min="1" max="100" value={zone.miles} onChange={e => update(i, { miles: e.target.value })} />
              </div>
            </div>
            <div className="st-field" role="group" aria-label={`${zone.name} charge`}>
              <span className="st-field-label">Charge</span>
              <div className="st-filter">
                <button type="button" className="st-chip" aria-pressed={!zone.perMile && !Number(zone.surcharge)} onClick={() => update(i, { perMile: false, surcharge: 0 })}>Free</button>
                <button type="button" className="st-chip" aria-pressed={!zone.perMile && Number(zone.surcharge) > 0} onClick={() => update(i, { perMile: false, surcharge: Number(zone.surcharge) || 10 })}>A set fee</button>
                <button type="button" className="st-chip" aria-pressed={Boolean(zone.perMile)} onClick={() => update(i, { perMile: true, surcharge: null })}>Mileage, confirmed in the quote</button>
              </div>
              {zone.perMile && (
                <div className="st-field">
                  <label htmlFor={`st-zone-rate-${zone.id}`}>Price per mile, for the estimate (£, optional)</label>
                  <input id={`st-zone-rate-${zone.id}`} type="number" inputMode="decimal" min="0" step="0.05" value={zone.perMileRate ?? ''} onChange={e => update(i, { perMileRate: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  <span className="st-hint">Customers see "About £…" (their miles from you times this). Leave blank to say it's confirmed in the quote.</span>
                </div>
              )}
              {!zone.perMile && Number(zone.surcharge) > 0 && (
                <input type="number" inputMode="decimal" min="0" aria-label={`${zone.name} fee (£)`} value={zone.surcharge} onChange={e => update(i, { surcharge: e.target.value })} />
              )}
            </div>
            <div className="st-field">
              <label htmlFor={`st-zone-note-${zone.id}`}>What customers read</label>
              <input id={`st-zone-note-${zone.id}`} type="text" maxLength={120} value={zone.note || ''} onChange={e => update(i, { note: e.target.value })} />
            </div>
          </div>
        ))}
      </fieldset>
      <div className="st-business-actions">
        <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Saving' : 'Save and publish'}</button>
        <span role="status" className="st-save-state">
          {state === 'saved' && 'Saved. The delivery map shows it now.'}
          {state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </form>
  );
}
