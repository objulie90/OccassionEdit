import React from 'react';
import { parseEventDate, startOfToday } from './studioFormat';

// The event date as a small ticket stub: weekday, big day number, month
export function DateTicket({ value, size = 'small', markPast = false }) {
  const date = parseEventDate(value);
  if (!date) {
    return (
      <span className={`st-ticket st-ticket-${size} is-empty`} aria-label="No event date">
        <span className="st-ticket-day">?</span>
        <span className="st-ticket-month">No date</span>
      </span>
    );
  }
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return (
    <span className={`st-ticket st-ticket-${size} ${markPast && date < startOfToday() ? 'is-past' : ''}`} aria-label={date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
      <span className="st-ticket-weekday">{weekday}</span>
      <span className="st-ticket-day">{date.getDate()}</span>
      <span className="st-ticket-month">{month}</span>
    </span>
  );
}
