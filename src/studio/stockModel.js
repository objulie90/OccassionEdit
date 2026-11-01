// Balloon stock, the way retailers count it: what's in the cupboard (on hand),
// what upcoming bookings will use (committed), and what's left (available).
import { calculateBalloonPullList } from '../data/catalogData.js';
import { statusInfo, parseEventDate, startOfToday } from './studioFormat';

export const BALLOON_SIZES = [
  { key: 'Sm', words: 'Small (5")', pull: 'smallBuffer' },
  { key: 'Md', words: 'Medium (11")', pull: 'medBuffer' },
  { key: 'Lg', words: 'Large (18")', pull: 'largeBuffer' }
];

export const DEFAULT_LOW_STOCK = 25;

// Orders that will use stock: booked or paid, and still to come
function upcomingBooked(quotes) {
  const today = startOfToday();
  return quotes.filter(q => {
    const tone = statusInfo(q.status).tone;
    const date = parseEventDate(q.client?.eventDate);
    return (tone === 'deposit' || tone === 'confirmed') && date && date >= today;
  });
}

// Balloons each colour and size is promised to, from each booking's garland and colours
export function committedBalloons(quotes, steps, balloonColours) {
  const garlands = steps.flatMap(st => st.items || []);
  const out = {};
  upcomingBooked(quotes).forEach(q => {
    const cfg = q.configuration || {};
    const garland = garlands.find(it => it.id === cfg.balloonId && it.recipe);
    if (!garland) return;
    const colours = (cfg.palette || []).map(name => balloonColours.find(c => c.name === name)).filter(Boolean);
    if (!colours.length) return;
    const pull = calculateBalloonPullList(garland, colours, { bufferPercent: 8 });
    pull.colorBreakdown.forEach((row, i) => {
      const id = colours[i].id;
      out[id] = out[id] || { Sm: 0, Md: 0, Lg: 0 };
      BALLOON_SIZES.forEach(sz => { out[id][sz.key] += row[sz.pull] || 0; });
    });
  });
  return out;
}

// Helium foil digits promised to bookings, by digit
export function committedFoils(quotes) {
  const out = {};
  upcomingBooked(quotes).forEach(q => {
    const cfg = q.configuration || {};
    if (cfg.digitId !== 'helium-foil-numbers') return;
    String(cfg.digitText || '').replace(/[^0-9]/g, '').split('').forEach(d => { out[d] = (out[d] || 0) + 1; });
  });
  return out;
}
