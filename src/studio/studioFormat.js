// Shared helpers for the staff studio: order statuses, dates, money and contact links.

// The path every order follows. Ids are what is stored; labels are what Laura reads.
export const ORDER_STATUSES = [
  { id: 'New Enquiry', label: 'New enquiry', tone: 'new' },
  { id: 'Quote Sent', label: 'Quote sent', tone: 'quoted' },
  { id: 'Deposit Paid', label: 'Booked', tone: 'deposit' },
  { id: 'Confirmed', label: 'Paid in full', tone: 'confirmed' },
  { id: 'Completed', label: 'Done', tone: 'done' },
  { id: 'Cancelled', label: 'Cancelled', tone: 'cancelled' }
];

export function statusInfo(status) {
  const s = (status || '').toLowerCase();
  const byTone = tone => ORDER_STATUSES.find(x => x.tone === tone);
  if (s.includes('cancel')) return byTone('cancelled');
  if (s.includes('complete')) return byTone('done');
  if (s.includes('confirm')) return byTone('confirmed');
  if (s.includes('deposit')) return byTone('deposit');
  if (s.includes('quote')) return byTone('quoted');
  return byTone('new');
}

// Event dates arrive as "2026-12-12" (date picker) or "12/12/2026" (older sheet rows)
export function parseEventDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  let y;
  let m;
  let d;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    [y, m, d] = str.slice(0, 10).split('-').map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    [d, m, y] = str.split('/').map(Number);
  } else {
    return null;
  }
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatLongDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysUntil(date) {
  return Math.round((date - startOfToday()) / 86400000);
}

export function describeDaysUntil(date) {
  const n = daysUntil(date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${-n} days ago`;
  if (n < 14) return `In ${n} days`;
  return `In ${Math.round(n / 7)} weeks`;
}

export function money(value) {
  const n = Number(value) || 0;
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

// The agreed price: what Laura quoted, otherwise the website's guide price
export function orderTotal(order) {
  const cfg = order?.configuration || {};
  if (cfg.quotedPrice != null && cfg.quotedPrice !== '') return Number(cfg.quotedPrice) || 0;
  return Number(cfg.estimatedTotal ?? cfg.subtotal ?? 0);
}

export function paidSoFar(order) {
  const cfg = order?.configuration || {};
  return (Number(cfg.depositPaid) || 0) + (Number(cfg.balancePaid) || 0);
}

// UK mobile "07700 900000" becomes "447700900000" for WhatsApp links
export function whatsappNumber(phone) {
  const digits = String(phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!digits) return '';
  if (digits.startsWith('44')) return digits;
  if (digits.startsWith('0')) return `44${digits.slice(1)}`;
  return digits;
}
