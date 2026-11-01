// The quote and invoice messages Laura sends by WhatsApp or email. Written in her
// voice; she can change any word before it goes.
import { BOOKING_TERMS, depositFor } from '../lib/terms';
import { parseEventDate, formatLongDate, money } from './studioFormat';

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

function occasionWords(client) {
  const o = String(client.occasion || '').trim();
  if (!o || o === 'Something else') return 'celebration';
  if (/wedding/i.test(o)) return 'big day';
  return o.toLowerCase();
}

export function balanceDueDate(eventDate) {
  const d = parseEventDate(eventDate);
  return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - BOOKING_TERMS.balanceDaysBefore) : null;
}

export function hasBankDetails(settings = {}) {
  return Boolean(settings.sortCode && settings.accountNumber);
}

function bankLines(settings, reference) {
  if (!hasBankDetails(settings)) return ['Bank details to follow.'];
  return [
    'You can pay by bank transfer:',
    settings.accountName || settings.businessTradingName || '',
    `Sort code ${settings.sortCode}, account ${settings.accountNumber}`,
    `Reference: ${reference}`
  ].filter(Boolean);
}

function signOff(settings) {
  const business = settings.businessTradingName && !/^the occasion edit$/i.test(settings.businessTradingName)
    ? settings.businessTradingName
    : 'The Occasion Edit';
  return [settings.signOffName, business].filter(Boolean).join('\n');
}

export function quoteMessage({ order, lines, price, settings = {} }) {
  const c = order.client || {};
  const date = parseEventDate(c.eventDate);
  const deposit = depositFor(price);
  const due = balanceDueDate(c.eventDate);
  return [
    `Hi ${firstName(c.name)}! Thank you so much for choosing us for your ${occasionWords(c)}${date ? ` on ${formatLongDate(date)}` : ''}.`,
    '',
    "Here's what we'll create for you:",
    ...lines.map(l => `- ${l}`),
    '',
    `Total: ${money(price)}`,
    '',
    `To secure your date we just need a ${BOOKING_TERMS.depositPercent}% deposit of ${money(deposit)}.`,
    ...bankLines(settings, order.id),
    '',
    `The balance of ${money(Math.max(0, price - deposit))} is due${due ? ` by ${formatLongDate(due)}` : ' a week before'}.`,
    '',
    "Any questions at all, just ask. We can't wait to make it special!",
    signOff(settings)
  ].join('\n');
}

export function invoiceMessage({ order, total, paid, settings = {} }) {
  const c = order.client || {};
  const date = parseEventDate(c.eventDate);
  const due = balanceDueDate(c.eventDate);
  const balance = Math.max(0, total - paid);
  return [
    `Hi ${firstName(c.name)}! Not long now until your ${occasionWords(c)}${date ? ` on ${formatLongDate(date)}` : ''}.`,
    '',
    `Here's your balance invoice:`,
    `Total ${money(total)}, paid so far ${money(paid)}.`,
    `Balance to pay: ${money(balance)}${due ? `, by ${formatLongDate(due)}` : ''}.`,
    '',
    ...bankLines(settings, order.id),
    '',
    'Thank you so much. See you on the day!',
    signOff(settings)
  ].join('\n');
}

export function whatsappLink(number, text) {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : '';
}

export function emailLink(email, subject, text) {
  return email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : '';
}
