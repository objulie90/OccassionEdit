import React, { useState } from 'react';
import { statusInfo, parseEventDate, sameDay, startOfToday } from './studioFormat';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarTab({ quotes, onSelectOrder }) {
  const today = startOfToday();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const live = quotes
    .map(q => ({ q, date: parseEventDate(q.client?.eventDate) }))
    .filter(x => x.date && statusInfo(x.q.status).tone !== 'cancelled');

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (month.getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const ordersOn = day => live.filter(x => sameDay(x.date, day)).map(x => x.q);
  const busyDays = days.filter(d => ordersOn(d).length > 0);

  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const title = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

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
          const orders = ordersOn(day);
          return (
            <div key={day.getDate()} className={`st-cal-cell ${sameDay(day, today) ? 'is-today' : ''}`} role="gridcell">
              <span className="st-cal-date">{day.getDate()}</span>
              {orders.map(q => (
                <button
                  key={q.id}
                  type="button"
                  className={`st-cal-chip st-status-${statusInfo(q.status).tone}`}
                  onClick={() => onSelectOrder(q.id)}
                >
                  {q.client?.name || 'Name not given'}
                </button>
              ))}
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
              {ordersOn(day).map(q => (
                <button
                  key={q.id}
                  type="button"
                  className={`st-cal-chip st-status-${statusInfo(q.status).tone}`}
                  onClick={() => onSelectOrder(q.id)}
                >
                  {q.client?.name || 'Name not given'}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <p className="st-cal-key">
        <span className="st-cal-chip st-status-new">New enquiry</span>
        <span className="st-cal-chip st-status-deposit">Deposit paid</span>
        <span className="st-cal-chip st-status-confirmed">Confirmed</span>
        <span className="st-cal-chip st-status-done">Completed</span>
      </p>
    </div>
  );
}
