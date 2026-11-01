import React, { useState, useEffect } from 'react';
import { getDeliveryZoneForMileage, describeDelivery } from '../data/catalogData.js';
import { milesFromBase } from '../lib/places';
import { earliestBookableDate } from '../lib/availability';

export const OCCASIONS = ['Birthday', 'Wedding / Engagement', 'Anniversary', 'Prom', 'Baby Shower', 'Something else'];

// Laura's three styles, in her own words (her answers, November 2026)
export const STYLES = [
  { id: 'Classic', line: 'Soft, elegant and timeless. Mixed balloon sizes with a personal touch.' },
  { id: 'Fancy', line: 'More balloons, a little chrome shine and foil shapes or numbers.', note: 'Most chosen' },
  { id: 'Luxury', line: 'The full showstopper: bigger, fuller, with flowers and every finishing touch.' }
];

const DATE_QUESTION = {
  Birthday: 'A birthday! When’s the big day?',
  'Wedding / Engagement': 'Congratulations! When’s the big day?',
  Anniversary: 'How lovely. When are you celebrating?',
  Prom: 'Prom! When’s the big night?',
  'Baby Shower': 'How exciting! When’s the shower?',
  'Something else': 'Sounds fun! When is it?'
};

export function formatEventDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function shortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function deliveryMessage(place) {
  if (!place) return '';
  const miles = milesFromBase(place);
  if (miles == null) return "We'll confirm delivery to you when we reply.";
  return `You're about ${Math.max(1, Math.round(miles))} miles from us. ${describeDelivery(getDeliveryZoneForMileage(miles))}`;
}

function isAnswered(q, f) {
  if (q === 'occasion') return Boolean(f.occasion) && (f.occasion !== 'Something else' || Boolean((f.occasionOther || '').trim()));
  if (q === 'date') return Boolean(f.eventDate);
  if (q === 'venue') return Boolean(f.hasVenue) && Boolean(f.placeConfirmed);
  return Boolean(f.style);
}

const ORDER = ['occasion', 'date', 'venue', 'style'];

/**
 * Builder step 0, told as a conversation: one question at a time, each answer
 * tucking up into a line you can tap to change, then a check of Laura's diary.
 */
export function EventStep({ form, onChange, getAvailability, onConfirmed }) {
  const [editing, setEditing] = useState(null); // a question reopened from the answers above
  const [state, setState] = useState('asking'); // asking | checking | free | full | error
  const [result, setResult] = useState(null);
  // A question only counts once its answer is confirmed, so typing never skips ahead
  const [confirmed, setConfirmed] = useState(() => ORDER.filter(q => isAnswered(q, form)));

  const occasionLabel = form.occasion === 'Something else' ? (form.occasionOther || '').trim() : form.occasion;
  const place = form.hasVenue === 'yes' ? form.postcode : form.area;
  const current = editing || ORDER.find(q => !confirmed.includes(q) || !isAnswered(q, form)) || null;

  const check = async (next) => {
    setState('checking');
    try {
      const availability = await getAvailability(next.eventDate);
      setResult(availability);
      setState(availability.dayFull ? 'full' : 'free');
    } catch (_err) {
      setState('error');
    }
  };

  // Each answer moves the conversation on; once all four are in, check the diary
  const answer = (q, patch = {}) => {
    const next = { ...form, ...patch };
    const nextConfirmed = confirmed.includes(q) ? confirmed : [...confirmed, q];
    onChange(patch);
    setConfirmed(nextConfirmed);
    setEditing(null);
    if (ORDER.every(k => nextConfirmed.includes(k) && isAnswered(k, next))) check(next);
    else setState('asking');
  };

  // Coming back to this step with everything answered: go straight to the diary
  useEffect(() => {
    if (ORDER.every(q => confirmed.includes(q) && isAnswered(q, form))) check(form);
  }, []);

  const reopen = (q) => { setEditing(q); setState('asking'); };

  const transcript = ORDER
    .filter(q => confirmed.includes(q) && isAnswered(q, form) && q !== current)
    .map(q => ({
      q,
      text: q === 'occasion' ? occasionLabel
        : q === 'date' ? shortDate(form.eventDate)
        : q === 'venue' ? (form.hasVenue === 'yes' ? form.postcode : `Near ${form.area}`)
        : `${form.style} style`
    }));

  return (
    <div className="oe-step-card-surface oe-event-step oe-convo">
      {transcript.length > 0 && (
        <ul className="oe-convo-answers" aria-label="Your answers so far">
          {transcript.map(t => (
            <li key={t.q}>
              <button type="button" className="oe-convo-answer" onClick={() => reopen(t.q)} aria-label={`${t.text}. Change this answer`}>
                {t.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="oe-convo-stage">
        {state === 'asking' && current === 'occasion' && (
          <fieldset className="oe-convo-q" key="occasion">
            <legend className="oe-convo-question">First things first, what are we celebrating?</legend>
            <div className="oe-chat-choices">
              {OCCASIONS.map(o => (
                <button
                  key={o}
                  type="button"
                  className="oe-chat-choice"
                  aria-pressed={form.occasion === o}
                  onClick={() => (o === 'Something else' ? onChange({ occasion: o }) : answer('occasion', { occasion: o }))}
                >
                  {o === 'Something else' ? 'Something else…' : o}
                </button>
              ))}
            </div>
            {form.occasion === 'Something else' && (
              <form className="oe-convo-inline" onSubmit={e => { e.preventDefault(); if ((form.occasionOther || '').trim()) answer('occasion'); }}>
                <div className="oe-convo-inline-row">
                  <input
                    type="text"
                    className="oe-form-input oe-chat-input"
                    aria-label="What are you celebrating?"
                    placeholder="Tell us what you're celebrating"
                    value={form.occasionOther || ''}
                    onChange={e => onChange({ occasionOther: e.target.value })}
                  />
                  <button type="submit" className="oe-btn-primary" disabled={!(form.occasionOther || '').trim()}>Next</button>
                </div>
              </form>
            )}
          </fieldset>
        )}

        {state === 'asking' && current === 'date' && (
          <fieldset className="oe-convo-q" key="date">
            <legend className="oe-convo-question">{DATE_QUESTION[form.occasion] || DATE_QUESTION['Something else']}</legend>
            <form className="oe-convo-inline" onSubmit={e => { e.preventDefault(); if (form.eventDate) answer('date'); }}>
              <p className="oe-chat-reply">We need at least two days' notice to make it special.</p>
              <div className="oe-convo-inline-row">
                <input
                  id="oe-event-date"
                  type="date"
                  className="oe-form-input oe-chat-input"
                  aria-label="Date of your celebration"
                  min={earliestBookableDate()}
                  value={form.eventDate}
                  onChange={e => onChange({ eventDate: e.target.value })}
                />
                <button type="submit" className="oe-btn-primary" disabled={!form.eventDate}>Next</button>
              </div>
            </form>
          </fieldset>
        )}

        {state === 'asking' && current === 'venue' && (
          <fieldset className="oe-convo-q" key="venue">
            <legend className="oe-convo-question">And where's the party?</legend>
            <div className="oe-chat-choices">
              <button type="button" className="oe-chat-choice" aria-pressed={form.hasVenue === 'yes'} onClick={() => onChange({ hasVenue: 'yes', placeConfirmed: false })}>
                We've got a venue
              </button>
              <button type="button" className="oe-chat-choice" aria-pressed={form.hasVenue === 'no'} onClick={() => onChange({ hasVenue: 'no', placeConfirmed: false })}>
                Not decided yet
              </button>
            </div>
            {form.hasVenue && (
              <form className="oe-convo-inline" onSubmit={e => { e.preventDefault(); if ((place || '').trim()) answer('venue', { placeConfirmed: true }); }}>
                <p className="oe-chat-reply">
                  {form.hasVenue === 'yes'
                    ? 'Lovely! What’s the postcode?'
                    : 'That’s fine. Roughly whereabouts are you hoping to be, so we can make sure we can deliver to you?'}
                </p>
                <div className="oe-convo-inline-row">
                  {form.hasVenue === 'yes' ? (
                    <input
                      id="oe-event-postcode"
                      type="text"
                      autoComplete="postal-code"
                      className="oe-form-input oe-chat-input"
                      aria-label="Venue postcode"
                      placeholder="e.g. NG13 0AA"
                      value={form.postcode}
                      onChange={e => onChange({ postcode: e.target.value.toUpperCase() })}
                    />
                  ) : (
                    <input
                      id="oe-event-area"
                      type="text"
                      className="oe-form-input oe-chat-input"
                      aria-label="Town, city or postcode"
                      placeholder="Town, city or postcode"
                      value={form.area || ''}
                      onChange={e => onChange({ area: e.target.value })}
                    />
                  )}
                  <button type="submit" className="oe-btn-primary" disabled={!(place || '').trim()}>Next</button>
                </div>
              </form>
            )}
          </fieldset>
        )}

        {state === 'asking' && current === 'style' && (
          <fieldset className="oe-convo-q" key="style">
            <legend className="oe-convo-question">How would you like it to feel?</legend>
            <div className="oe-style-choices">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="oe-style-choice"
                  aria-pressed={form.style === s.id}
                  onClick={() => answer('style', { style: s.id })}
                >
                  <span className="oe-style-name">{s.id}</span>
                  <span className="oe-style-line">{s.line}</span>
                  {s.note && <span className="oe-style-note">{s.note}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {state === 'checking' && (
          <div className="oe-convo-q" key="checking" role="status">
            <p className="oe-convo-question">Checking our diary…</p>
          </div>
        )}

        {state === 'free' && (
          <div className="oe-convo-q oe-convo-result" key="free" role="status">
            <p className="oe-convo-question">Good news, we're available on {formatEventDate(form.eventDate)}!</p>
            <p className="oe-chat-reply">{deliveryMessage(place)}</p>
            <button type="button" className="oe-btn-primary oe-convo-go" onClick={() => onConfirmed(result)}>
              Start designing
            </button>
          </div>
        )}

        {state === 'full' && (
          <div className="oe-convo-q oe-convo-result" key="full" role="status">
            <p className="oe-convo-question">Oh no, we're already booked on {formatEventDate(form.eventDate)}.</p>
            <p className="oe-chat-reply">Could another day work? Or message us on Facebook and we'll see what we can do.</p>
            <button type="button" className="oe-btn-primary oe-convo-go" onClick={() => reopen('date')}>Pick another date</button>
          </div>
        )}

        {state === 'error' && (
          <div className="oe-convo-q oe-convo-result" key="error" role="alert">
            <p className="oe-convo-question">We couldn't check the diary just now.</p>
            <button type="button" className="oe-btn-primary oe-convo-go" onClick={() => check(form)}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
