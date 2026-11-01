// The Studio's product list, arranged the way customers build: bases, balloon
// structures, numbers and letters, finishing touches. Each product is a builder
// option; any price-list card linked to it is edited with it.

// Builder options grouped under the headings Laura uses. A new option with no
// entry here goes under its section's "Other".
const SUBGROUPS = {
  backdrop: [
    { title: 'Sign', ids: ['easel-sign'] },
    { title: 'Board', ids: ['wooden-board'] },
    { title: 'Shimmer wall', ids: ['gold-shimmer', 'silver-shimmer', 'black-shimmer', 'pink-shimmer'] },
    { title: 'Hoop', ids: ['balloon-hoop'] }
  ],
  balloons: [
    { title: 'Garland', ids: ['garland-7ft'] },
    { title: 'Corner clusters', ids: ['clusters-top-bottom'] },
    { title: 'Archway', ids: ['garland-full'] }
  ],
  digits: [
    { title: 'Number stacks', ids: ['stack-basic', 'stack-themed', 'stack-luxury'] },
    { title: 'Helium numbers', ids: ['helium-foil-numbers'] },
    { title: 'Letters', ids: ['custom-letter-balloons'] }
  ]
};

const SECTIONS = [
  { id: 'backdrop', title: 'Bases', note: 'What the balloons are built around. Customers can also skip this and have balloons on their own.' },
  { id: 'balloons', title: 'Balloon structures' },
  { id: 'digits', title: 'Numbers and letters' },
  { id: 'extras', title: 'Finishing touches' }
];

export function refKey(ref) {
  if (ref.kind === 'step') return `step:${ref.stepId}:${ref.id}`;
  return `${ref.kind}:${ref.id}`;
}

// Price-list cards that show this builder option
export function linkedCards(ref, catalog) {
  if (ref.kind === 'card') return catalog.filter(c => c.id === ref.id);
  return catalog.filter(c => {
    const l = c.builderLink;
    if (!l) return false;
    if (ref.kind === 'digit') return l.type === 'digit' && l.id === ref.id;
    return l.type === 'step' && l.stepId === ref.stepId && l.id === ref.id;
  });
}

function leaf(ref, item, catalog) {
  const cards = linkedCards(ref, catalog);
  return { key: refKey(ref), ref, item, cards, code: item.code || cards.find(c => c.code)?.code || '' };
}

export function buildProductTree(steps = [], digitOptions = [], catalog = []) {
  const sections = SECTIONS.map(sec => {
    const items = sec.id === 'digits'
      ? digitOptions.filter(d => d.id !== 'digits-none').map(d => leaf({ kind: 'digit', id: d.id }, d, catalog))
      : (steps.find(st => st.id === sec.id)?.items || []).map(it => leaf({ kind: 'step', stepId: sec.id, id: it.id }, it, catalog));
    const rules = SUBGROUPS[sec.id];
    if (!rules) return { ...sec, groups: [{ title: null, items }] };
    const placed = new Set();
    const groups = rules.map(r => {
      const inGroup = items.filter(l => r.ids.includes(l.ref.id) || l.item.group === r.title);
      inGroup.forEach(l => placed.add(l.key));
      return { title: r.title, items: inGroup };
    }).filter(g => g.items.length > 0);
    const rest = items.filter(l => !placed.has(l.key));
    if (rest.length) groups.push({ title: 'Other', items: rest });
    return { ...sec, groups };
  });

  // Cards that aren't a builder option at all, such as packages
  const loose = catalog.filter(c => !c.builderLink).map(c => leaf({ kind: 'card', id: c.id }, c, catalog));
  if (loose.length) sections.push({ id: 'pricelist', title: 'Only on the price list', note: 'Shown in Prices but not offered in the builder.', groups: [{ title: null, items: loose }] });
  return sections;
}

// The prices a product has, labelled the way the builder charges them
export function priceFields(leafItem) {
  const { ref, item } = leafItem;
  // Bases are priced per display in their own table
  if (Array.isArray(item.displays)) return [];
  if (ref.kind === 'digit') {
    if (item.perLetter) return [{ key: 'basePrice', label: 'Per letter (£)' }];
    return [
      { key: 'basePrice', label: item.secondDigitPrice ? 'One digit (£)' : 'Price (£)' },
      ...(item.secondDigitPrice ? [{ key: 'secondDigitPrice', label: 'Two digits (£)' }] : [])
    ];
  }
  if (ref.kind === 'card') {
    return [
      { key: 'basePrice', label: 'Price (£)' },
      ...(item.secondPrice ? [{ key: 'secondPrice', label: 'Second price (£)' }] : [])
    ];
  }
  if (item.hasSizeTier) return [{ key: 'packageBasePrice', label: 'Small, with garland (£)' }, { key: 'packageLargePrice', label: 'Large, with garland (£)' }];
  if (ref.stepId === 'backdrop' && item.packageBasePrice) return [{ key: 'packageBasePrice', label: 'With a garland (£)' }];
  if (item.id === 'garland-full') {
    return [
      { key: 'price', label: 'On its own (£)' },
      { key: 'upgradeSurcharge', label: 'Upgrade from a garland, with a board or hoop (£)', fallback: 35 },
      { key: 'shimmerUpgradeSurcharge', label: 'Upgrade from a garland, with a shimmer wall (£)', fallback: 25 }
    ];
  }
  return [{ key: 'price', label: 'Price (£)' }];
}

// The headline price shown in the list
export function headlinePrice(leafItem) {
  if (Array.isArray(leafItem.item.displays)) {
    const known = leafItem.item.displays.filter(d => d.offered !== false && d.price != null && d.price !== '').map(d => Number(d.price));
    return known.length ? Math.min(...known) : null;
  }
  const first = priceFields(leafItem)[0];
  return Number(leafItem.item[first.key] ?? 0);
}

// Prices Laura still has to fill in for a base's displays
export function pricesToConfirm(item) {
  if (!Array.isArray(item.displays)) return 0;
  return item.displays.filter(d => d.offered !== false).reduce((n, d) => n
    + (d.price == null || d.price === '' ? 1 : 0)
    + (item.hasSizeTier && (d.priceLarge == null || d.priceLarge === '') ? 1 : 0), 0);
}

// The words for the builder card
export function builderLineKey(ref) {
  if (ref.kind === 'digit') return 'description';
  if (ref.kind === 'step') return 'styleNote';
  return null;
}
