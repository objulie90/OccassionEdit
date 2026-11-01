// A sale Laura sets up in the Studio: a label and a price cut on every product, or
// on the ones she ticks, between two dates. While it runs, each product in it
// wears the sale label, so every price on the site (price list, builder, bundles,
// guide price) comes down through the same discount the labels already use.

const pad = n => String(n).padStart(2, '0');
export const todayIso = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// 'off' | 'scheduled' | 'live' | 'ended'
export function saleState(sale, now = new Date()) {
  if (!sale || !sale.enabled || !(Number(sale.discountValue) > 0)) return 'off';
  const today = todayIso(now);
  if (sale.start && today < sale.start) return 'scheduled';
  if (sale.end && today > sale.end) return 'ended';
  return 'live';
}

export function saleBanner(sale) {
  const value = Number(sale.discountValue) || 0;
  return {
    enabled: true,
    text: (sale.label || 'Sale').trim(),
    style: 'coral',
    discountType: sale.discountType === 'fixed' ? 'fixed' : 'percent',
    discountValue: value
  };
}

function longDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// The words across the top of the site, unless Laura has written her own
export function saleBannerText(sale) {
  if (sale.bannerText && sale.bannerText.trim()) return sale.bannerText.trim();
  const value = Number(sale.discountValue) || 0;
  const off = sale.discountType === 'fixed' ? `£${value} off` : `${value}% off`;
  const what = sale.appliesTo === 'all' ? 'everything' : 'selected favourites';
  return `${(sale.label || 'Sale').trim()}: ${off} ${what}${sale.end ? ` until ${longDate(sale.end)}` : ''}`;
}

const inSale = (sale, key) => sale.appliesTo === 'all' || (sale.itemKeys || []).includes(key);

/**
 * The shop as customers see it right now. Returns the same data untouched when
 * no sale is running, so nothing Laura has saved is ever changed by a sale.
 */
export function applySale({ steps, digitOptions, catalog, inspirationSlides }, sale, now = new Date()) {
  if (saleState(sale, now) !== 'live') return { steps, digitOptions, catalog, inspirationSlides, live: false };
  const banner = saleBanner(sale);
  const nextSteps = steps.map(st => ({
    ...st,
    items: (st.items || []).map(it => (inSale(sale, `step:${st.id}:${it.id}`) ? { ...it, cornerBanner: banner } : it))
  }));
  const nextDigits = digitOptions.map(d => (d.id !== 'digits-none' && inSale(sale, `digit:${d.id}`) ? { ...d, cornerBanner: banner } : d));
  const nextCatalog = catalog.map(c => {
    const l = c.builderLink;
    const key = !l ? `card:${c.id}` : l.type === 'digit' ? `digit:${l.id}` : `step:${l.stepId}:${l.id}`;
    return inSale(sale, key) ? { ...c, cornerBanner: banner } : c;
  });
  const bundlesIn = key => (sale.appliesTo === 'all' ? sale.includeBundles !== false : (sale.itemKeys || []).includes(key));
  const nextSlides = inspirationSlides.map(s => (bundlesIn(`bundle:${s.id}`) ? { ...s, cornerBanner: banner } : s));
  return { steps: nextSteps, digitOptions: nextDigits, catalog: nextCatalog, inspirationSlides: nextSlides, live: true };
}
