import React, { useState, useMemo } from 'react';
import { computeAvailability, hireItemsFromSteps } from '../lib/availability';
import { BOOKING_SOURCES } from '../lib/bookings';
import { parseEventDate, formatLongDate } from './studioFormat';

/**
 * A booking agreed on Facebook, Instagram or the phone. Saving it puts it in the
 * diary, so the website greys out that date and those props for everyone else.
 */
export function AddBooking({ steps = [], quotes = [], settings = {}, initialDate = '', onAdd, onDone, onCancel }) {
  const [f, setF] = useState({
    name: '', phone: '', email: '', eventDate: initialDate, place: '', source: 'Facebook',
    propIds: [], price: '', depositPaid: 'no', depositAmount: '', notes: ''
  });
  const [state, setState] = useState('idle'); // idle | saving | error
  const [error, setError] = useState('');
  const set = patch => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };

  const hireItems = useMemo(() => hireItemsFromSteps(steps), [steps]);
  const avail = useMemo(
    () => (f.eventDate ? computeAvailability(f.eventDate, quotes, hireItems, settings) : null),
    [f.eventDate, quotes, hireItems, settings]
  );
  const blocked = (settings.blockedDates || []).includes(f.eventDate);
  const clashProps = avail ? f.propIds.filter(id => (avail.items[id]?.free ?? 1) < 1) : [];

  const toggleProp = id => set({ propIds: f.propIds.includes(id) ? f.propIds.filter(x => x !== id) : [...f.propIds, id] });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.eventDate) {
      setError('Add their name and the date.');
      setState('error');
      return;
    }
    setState('saving');
    const place = f.place.trim();
    const looksLikePostcode = /\d/.test(place) && place.length <= 8;
    try {
      const order = await onAdd({
        client: {
          name: f.name.trim(),
          phone: f.phone.trim(),
          email: f.email.trim(),
          eventDate: f.eventDate,
          postcode: looksLikePostcode ? place.toUpperCase() : '',
          area: looksLikePostcode ? '' : place,
          notes: f.notes.trim(),
          source: f.source
        },
        propIds: f.propIds,
        price: Number(f.price) || 0,
        depositPaid: f.depositPaid === 'yes' ? Number(f.depositAmount) || 0 : 0
      });
      onDone(order);
    } catch (err) {
      setError(err.message && err.message !== 'not saved' ? err.message : 'Not saved. Check your connection and try again.');
      setState('error');
    }
  };

  const dateLabel = parseEventDate(f.eventDate);

  return (
    <form className="st-add-booking" onSubmit={submit} aria-label="Add a booking">
      <h3 className="st-section-title">Add a booking</h3>
      <p className="st-cat-note">For orders agreed on Facebook, Instagram or the phone. Once saved, the website won't offer that date or those props to anyone else.</p>

      <div className="st-form-grid">
        <div className="st-field">
          <label htmlFor="ab-name">Their name</label>
          <input id="ab-name" type="text" autoComplete="off" value={f.name} onChange={e => set({ name: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="ab-date">Date of the party</label>
          <input id="ab-date" type="date" value={f.eventDate} onChange={e => set({ eventDate: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="ab-phone">Phone (optional)</label>
          <input id="ab-phone" type="tel" autoComplete="off" value={f.phone} onChange={e => set({ phone: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="ab-email">Email (optional)</label>
          <input id="ab-email" type="email" autoComplete="off" value={f.email} onChange={e => set({ email: e.target.value })} />
        </div>
        <div className="st-field">
          <label htmlFor="ab-place">Where (postcode or town)</label>
          <input id="ab-place" type="text" value={f.place} onChange={e => set({ place: e.target.value })} />
        </div>
        <div className="st-field" role="group" aria-label="Where they booked">
          <span className="st-field-label">Where they booked</span>
          <div className="st-filter">
            {BOOKING_SOURCES.map(src => (
              <button key={src} type="button" className="st-chip" aria-pressed={f.source === src} onClick={() => set({ source: src })}>{src}</button>
            ))}
          </div>
        </div>
      </div>

      {(blocked || avail?.dayFull) && dateLabel && (
        <p className="st-warning">
          {blocked
            ? `You've blocked ${formatLongDate(dateLabel)}. Saving this still adds the booking.`
            : `You already have ${avail.setupsThatDay} booking${avail.setupsThatDay === 1 ? '' : 's'} on ${formatLongDate(dateLabel)}.`}
        </p>
      )}

      {hireItems.length > 0 && (
        <fieldset className="st-prop-pick">
          <legend className="st-field-label">Hire props they're having</legend>
          <ul>
            {hireItems.map(it => {
              const free = avail?.items[it.id]?.free;
              return (
                <li key={it.id}>
                  <label className="st-check">
                    <input type="checkbox" checked={f.propIds.includes(it.id)} onChange={() => toggleProp(it.id)} />
                    <span>{it.name}</span>
                    {avail && <span className={`st-free ${free < 1 ? 'is-none' : ''}`}>{free < 1 ? 'None free' : `${free} free`}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          {clashProps.length > 0 && <p className="st-warning">Some of these are already out that day. Saving still adds the booking.</p>}
        </fieldset>
      )}

      <div className="st-form-grid">
        <div className="st-field">
          <label htmlFor="ab-price">Price agreed (£)</label>
          <input id="ab-price" type="number" inputMode="decimal" min="0" value={f.price} onChange={e => set({ price: e.target.value })} />
        </div>
        <div className="st-field" role="group" aria-label="Deposit paid">
          <span className="st-field-label">Deposit paid?</span>
          <div className="st-filter">
            <button type="button" className="st-chip" aria-pressed={f.depositPaid === 'no'} onClick={() => set({ depositPaid: 'no' })}>Not yet</button>
            <button type="button" className="st-chip" aria-pressed={f.depositPaid === 'yes'} onClick={() => set({ depositPaid: 'yes', depositAmount: f.depositAmount || String(Math.round((Number(f.price) || 0) / 2)) })}>Yes</button>
          </div>
          {f.depositPaid === 'yes' && (
            <input type="number" inputMode="decimal" min="0" aria-label="Deposit amount (£)" value={f.depositAmount} onChange={e => set({ depositAmount: e.target.value })} />
          )}
        </div>
      </div>

      <div className="st-field">
        <label htmlFor="ab-notes">What they're having, and anything else</label>
        <textarea id="ab-notes" rows={3} value={f.notes} onChange={e => set({ notes: e.target.value })} />
      </div>

      <div className="st-business-actions">
        <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Saving' : 'Save booking'}</button>
        <button type="button" className="st-link st-link-quiet" onClick={onCancel}>Cancel</button>
        <span role="status" className="st-save-state">{state === 'error' && error}</span>
      </div>
    </form>
  );
}
