// Which products to suggest for each occasion and style lives on the products
// themselves (suggestFor, styleFor), set by Laura in the Studio's Inventory.
// Keep suggestions few: one that doesn't fit makes customers distrust all of them.
export const OCCASION_LABELS = {
  Birthday: 'birthdays',
  'Wedding / Engagement': 'weddings',
  Anniversary: 'anniversaries',
  Prom: 'proms',
  'Baby Shower': 'baby showers'
};
export const STYLES = ['Classic', 'Fancy', 'Luxury'];

export function picksFor(occasion, items = []) {
  if (!OCCASION_LABELS[occasion]) return null;
  return { label: OCCASION_LABELS[occasion], ids: items.filter(it => (it.suggestFor || []).includes(occasion)).map(it => it.id) };
}

export function stylePicksFor(style, items = []) {
  if (!STYLES.includes(style)) return null;
  return items.filter(it => (it.styleFor || []).includes(style)).map(it => it.id);
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
