// Availability rules for hire props and Laura's diary.
// server.py has a line-for-line Python copy (compute_availability); both are
// checked against the same cases in tests/availability-cases.json.
//
// - A hire prop leaves on the event day and is collected the next day. Laura
//   can send it out again the day she collects it (`sameDayTurnaround`), so a
//   booking only keeps a prop busy on its own date. Without that, it also
//   blocks the day either side.
// - Deposit paid, confirmed and completed bookings always count.
// - A new enquiry holds its props until Laura replies (`holdUntilReply`),
//   or otherwise for `holdHours` after it was sent.
// - Cancelled bookings never count.
// - A date is full once it has `maxSetupsPerDay` counted bookings.
// - Bookings need `minNoticeDays` notice.

// Laura's answers, November 2026
export const AVAILABILITY_DEFAULTS = {
  maxSetupsPerDay: 1,
  holdUntilReply: true,
  holdHours: 48,
  sameDayTurnaround: true,
  minNoticeDays: 2
};

const DAY_MS = 86400000;

export function dayNumber(isoOrDmy) {
  if (!isoOrDmy) return null;
  const str = String(isoOrDmy).trim();
  let y;
  let m;
  let d;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) [y, m, d] = str.slice(0, 10).split('-').map(Number);
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) [d, m, y] = str.split('/').map(Number);
  else return null;
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function bookingCounts(order, nowMs, holdHours, holdUntilReply = false) {
  const s = String(order.status || '').toLowerCase();
  if (s.includes('cancel')) return false;
  if (s.includes('deposit') || s.includes('confirm') || s.includes('complete')) return true;
  if (holdUntilReply) return true;
  const created = Date.parse(order.createdAt || '');
  if (Number.isNaN(created)) return true;
  return nowMs - created < holdHours * 3600000;
}

// The hire props on an order, by builder item id. Older orders only stored
// names, so those are matched by name.
export function hirePropIds(order, hireItems) {
  const cfg = order.configuration || {};
  const ids = [];
  const byName = name => hireItems.find(it => it.name === name);
  if (cfg.backdropId) ids.push(cfg.backdropId);
  else if (cfg.backdrop && byName(cfg.backdrop)) ids.push(byName(cfg.backdrop).id);
  (cfg.extraIds || []).forEach(id => ids.push(id));
  return ids.filter(id => hireItems.some(it => it.id === id));
}

/**
 * @param {string} date        event date the customer wants, "YYYY-MM-DD"
 * @param {object[]} orders    stored orders (only status, createdAt, client.eventDate, configuration are read)
 * @param {object[]} hireItems builder items with hireOnly true: { id, name, ownedCount }
 * @param {object} settings    { maxSetupsPerDay, holdHours }
 * @param {number} nowMs       current time
 * @param {string} [ignoreOrderId] an order to leave out (when rechecking that order itself)
 */
export function computeAvailability(date, orders, hireItems, settings = {}, nowMs = Date.now(), ignoreOrderId = null) {
  const { maxSetupsPerDay, holdHours, holdUntilReply, sameDayTurnaround } = { ...AVAILABILITY_DEFAULTS, ...settings };
  const clashWindow = sameDayTurnaround ? 0 : 1;
  const target = dayNumber(date);
  const items = {};
  hireItems.forEach(it => {
    const owned = Math.max(0, Number(it.ownedCount ?? 1));
    items[it.id] = { owned, inUse: 0, free: owned };
  });
  if (target == null) return { date, valid: false, setupsThatDay: 0, maxSetupsPerDay, dayFull: false, items };

  let setupsThatDay = 0;
  orders.forEach(order => {
    if (order.id && order.id === ignoreOrderId) return;
    if (!bookingCounts(order, nowMs, holdHours, holdUntilReply)) return;
    const day = dayNumber(order.client?.eventDate);
    if (day == null) return;
    if (day === target) setupsThatDay += 1;
    if (Math.abs(day - target) <= clashWindow) {
      hirePropIds(order, hireItems).forEach(id => {
        items[id].inUse += 1;
        items[id].free = Math.max(0, items[id].owned - items[id].inUse);
      });
    }
  });

  return {
    date,
    valid: true,
    setupsThatDay,
    maxSetupsPerDay,
    dayFull: setupsThatDay >= maxSetupsPerDay,
    items
  };
}

// Earliest date a customer can book, as "YYYY-MM-DD"
export function earliestBookableDate(minNoticeDays = AVAILABILITY_DEFAULTS.minNoticeDays, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + minNoticeDays);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hireItemsFromSteps(steps) {
  // Pieces made fresh for each order (flowers, cut-outs) never run out
  return steps.flatMap(st => st.items || []).filter(it => it.hireOnly && !it.madeToOrder)
    .map(it => ({ id: it.id, name: it.name, ownedCount: it.ownedCount }));
}
