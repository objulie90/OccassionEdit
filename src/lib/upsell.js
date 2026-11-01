// What to suggest for each occasion. Kept short on purpose: one suggestion
// that doesn't fit makes customers distrust all of them.
export const OCCASION_PICKS = {
  Birthday: { label: 'birthdays', ids: ['helium-foil-numbers', 'stack-luxury', 'neon-sign', 'bubble-balloon', 'gold-shimmer'] },
  'Wedding / Engagement': { label: 'weddings', ids: ['balloon-hoop', 'add-on-flowers', 'neon-sign', 'easel-sign', 'garland-full'] },
  Anniversary: { label: 'anniversaries', ids: ['balloon-hoop', 'add-on-flowers', 'helium-foil-numbers', 'neon-sign'] },
  Prom: { label: 'proms', ids: ['black-shimmer', 'gold-shimmer', 'neon-sign', 'garland-full'] },
  'Baby Shower': { label: 'baby showers', ids: ['baby-boxes', 'wooden-board', 'add-on-flowers', 'bubble-balloon'] }
};

export function picksFor(occasion) {
  return OCCASION_PICKS[occasion] || null;
}

// What each of Laura's styles adds, from her own definitions
export const STYLE_PICKS = {
  Classic: [],
  Fancy: ['helium-foil-numbers', 'stack-themed', 'neon-sign', 'bubble-balloon'],
  Luxury: ['add-on-flowers', 'stack-luxury', 'garland-full', 'gold-shimmer', 'neon-sign']
};

export function stylePicksFor(style) {
  return STYLE_PICKS[style] || null;
}

/**
 * The line under an option, framed against what they've chosen so far.
 *  - Single-choice steps with something already chosen: the step up or down.
 *  - Nothing chosen yet: whether it fits their budget.
 *  - Add-ons: what it adds.
 * Returns null when there's nothing useful to say.
 */
export function offerLine({ name, isSelected, isAddOn, hasCurrentChoice, newTotal, currentTotal, budget }) {
  if (isSelected) return null;
  const delta = Math.round(newTotal - currentTotal);
  const overBudget = budget > 0 ? Math.round(newTotal - budget) : 0;

  if (isAddOn) {
    if (delta <= 0) return { text: 'Add to your edit', tone: 'fits' };
    if (budget > 0 && overBudget > 0) return { text: `Add for just £${delta} more`, tone: 'upgrade' };
    return { text: `Add for just £${delta}`, tone: budget > 0 ? 'fits' : 'neutral' };
  }
  if (hasCurrentChoice) {
    if (delta > 0) return { text: `Upgrade to ${name} for just £${delta} more`, tone: 'upgrade' };
    if (delta < 0) return { text: `Choose this and save £${-delta}`, tone: 'fits' };
    return { text: 'Same price', tone: 'neutral' };
  }
  if (budget > 0) {
    return overBudget > 0
      ? { text: `Just £${overBudget} above your budget`, tone: 'upgrade' }
      : { text: 'Fits your budget', tone: 'fits' };
  }
  return null;
}
