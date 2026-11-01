import React, { useState } from 'react';
import { statusInfo, parseEventDate, sameDay, startOfToday, formatLongDate } from './studioFormat';
import { AddBooking } from './AddBooking';
import { BusinessDetailsTab } from './BusinessDetailsTab';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoOf(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Laura's diary: what's booked when, the days she's blocked out, and the rules
 * and prop counts the website uses to decide what customers can book.
 */
export function CalendarTab({ quotes, onSelectOrder, steps = [], studioSettings = {}, onSaveStudioSettings, onAddBooking }) {
  const today = startOfToday();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState(isoOf(today));
  const [adding, setAdding] = useState(false);
  const [blockState, setBlockState] = useState('idle');

  const blockedDates = studioSettings.blockedDates || [];
  const live = quotes
    .map(q => ({ q, date: parseEventDate(q.client?.eventDate) }))
    .filter(x => x.date && statusInfo(x.q.status).tone !== 'cancelled');

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (month.getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const ordersOn = day => live.filter(x => sameDay(x.date, day)).map(x => x.q);
  const isBlocked = day => blockedDates.includes(isoOf(day));
  const busyDays = days.filter(d => ordersOn(d).length > 0 || isBlocked(d));

  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const title = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const pickedDate = parseEventDate(picked);
  const pickedOrders = pickedDate ? ordersOn(pickedDate) : [];
  const pickedBlocked = blockedDates.includes(picked);

  const toggleBlock = async () => {
    if (!onSaveStudioSettings || !picked) return;
    setBlockState('saving');
    const next = pickedBlocked ? blockedDates.filter(d => d !== picked) : [...blockedDates, picked].sort();
    try {
      await onSaveStudioSettings({ ...studioSettings, blockedDates: next });
      setBlockState(pickedBlocked ? 'unblocked' : 'blocked');
    } catch (_e) {
      setBlockState('error');
    }
  };

  const chip = q => (
    <button
      key={q.id}
      type="button"
      className={`st-cal-chip st-status-${statusInfo(q.status).tone}`}
      onClick={() => onSelectOrder(q.id)}
    >
      {q.client?.name || 'Name not given'}
    </button>
  );

  return (
    <div className="st-calendar">
      <div className="st-cal-head">
        <h3 className="st-cal-title">{title}</h3>
        <div className="st-cal-nav">
          <button type="button" className="st-btn" onClick={() => shift(-1)} aria-label="Previous month">Previous</button>
          <button type="button" className="st-btn" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>This month</button>
          <button type="button" className="st-btn" onClick={() => shift(1)} aria-label="Next month">Next</button>
        </div>
      </div>

      <div className="st-cal-grid" role="grid" aria-label={title}>
        {WEEKDAYS.map(d => <div key={d} className="st-cal-weekday" role="columnheader">{d}</div>)}
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} className="st-cal-cell is-blank" />)}
        {days.map(day => {
          const iso = isoOf(day);
          return (
            <div
              key={iso}
              className={`st-cal-cell ${sameDay(day, today) ? 'is-today' : ''} ${isBlocked(day) ? 'is-blocked' : ''} ${picked === iso ? 'is-picked' : ''}`}
              role="gridcell"
            >
              <button type="button" className="st-cal-date" onClick={() => { setPicked(iso); setAdding(false); setBlockState('idle'); }} aria-label={`Choose ${formatLongDate(day)}`}>
                {day.getDate()}
              </button>
              {isBlocked(day) && <span className="st-cal-blocked">Blocked</span>}
              {ordersOn(day).map(chip)}
            </div>
          );
        })}
      </div>

      {/* On phones the grid is too small to read, so the month is shown as a list */}
      <ul className="st-cal-agenda">
        {busyDays.length === 0 && <li className="st-empty">Nothing booked this month.</li>}
        {busyDays.map(day => (
          <li key={day.getDate()}>
            <span className="st-agenda-date">
              {day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
            </span>
            <span className="st-agenda-orders">
              {isBlocked(day) && <span className="st-cal-blocked">Blocked</span>}
              {ordersOn(day).map(chip)}
            </span>
          </li>
        ))}
      </ul>

      <p className="st-cal-key">
        <span className="st-cal-chip st-status-new">New enquiry</span>
        <span className="st-cal-chip st-status-quoted">Quote sent</span>
        <span className="st-cal-chip st-status-deposit">Booked</span>
        <span className="st-cal-chip st-status-confirmed">Paid in full</span>
        <span className="st-cal-chip st-status-done">Done</span>
      </p>

      {adding ? (
        <AddBooking
          steps={steps}
          quotes={quotes}
          settings={studioSettings}
          initialDate={picked}
          onAdd={onAddBooking}
          onDone={order => { setAdding(false); onSelectOrder(order.id); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <section className="st-day" aria-labelledby="st-day-title">
          <div className="st-field st-day-pick">
            <label htmlFor="st-day-date">Choose a day</label>
            <input id="st-day-date" type="date" value={picked} onChange={e => { setPicked(e.target.value); setBlockState('idle'); }} />
          </div>
          {pickedDate && (
            <>
              <h3 id="st-day-title" className="st-section-title">{formatLongDate(pickedDate)}</h3>
              <p className="st-cat-note">
                {pickedBlocked
                  ? "Blocked. Customers can't book this day."
                  : pickedOrders.length === 0
                    ? 'Nothing booked yet.'
                    : `${pickedOrders.length} booking${pickedOrders.length === 1 ? '' : 's'}.`}
              </p>
              {pickedOrders.length > 0 && <div className="st-agenda-orders">{pickedOrders.map(chip)}</div>}
              <div className="st-business-actions">
                {onAddBooking && <button type="button" className="st-btn st-btn-primary" onClick={() => setAdding(true)}>Add a booking on this day</button>}
                {onSaveStudioSettings && (
                  <button type="button" className="st-btn" disabled={blockState === 'saving'} onClick={toggleBlock}>
                    {pickedBlocked ? 'Unblock this day' : 'Block this day'}
                  </button>
                )}
                <span role="status" className="st-save-state">
                  {blockState === 'blocked' && 'Blocked. The website now shows this day as unavailable.'}
                  {blockState === 'unblocked' && 'Unblocked. Customers can book this day again.'}
                  {blockState === 'error' && 'Not saved. Check your connection and try again.'}
                </span>
              </div>
            </>
          )}
        </section>
      )}

      {onSaveStudioSettings && (
        <details className="st-more-panel">
          <summary>Your diary rules</summary>
          <BusinessDetailsTab studioSettings={studioSettings} onSave={onSaveStudioSettings} groups={['Your diary']} />
        </details>
      )}
    </div>
  );
}
