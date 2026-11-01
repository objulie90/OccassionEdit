// Bundle pricing rules (Oliver, November 2026):
//  1. A customer who builds their own edit containing every item in a bundle
//     gets that bundle's saving on those items. Anything extra is charged at
//     the normal price. Colours and the wording on numbers don't count as items.
//  2. One item short of a bundle, the builder offers it: "Add Neon Sign to save £20".
//  3. Savings never stack. Only the single biggest bundle saving applies, and it
//     is worked out from today's prices, so during a sale the customer simply
//     pays whichever is lower.
import { calculateLookRecipePrice, applyCornerBannerDiscount } from '../data/catalogData.js';

// The items that make up a bundle (or a customer's build), one per slot
function itemsOf(recipe) {
  const items = [];
  if (recipe.backdropId) items.push({ slot: 'backdrop', id: recipe.backdropId });
  if (recipe.balloonId) items.push({ slot: 'balloons', id: recipe.balloonId });
  if (recipe.digitOptionId && recipe.digitOptionId !== 'digits-none') items.push({ slot: 'digits', id: recipe.digitOptionId });
  (recipe.extraIds || []).forEach(id => items.push({ slot: 'extras', id }));
  return items;
}

const has = (build, item) => {
  if (item.slot === 'extras') return (build.extraIds || []).includes(item.id);
  const key = { backdrop: 'backdropId', balloons: 'balloonId', digits: 'digitOptionId' }[item.slot];
  return build[key] === item.id;
};

// A missing item can be offered only if adding it doesn't mean swapping something they chose
const canAdd = (build, item) => {
  if (item.slot === 'extras') return true;
  const key = { backdrop: 'backdropId', balloons: 'balloonId', digits: 'digitOptionId' }[item.slot];
  return !build[key] || build[key] === 'digits-none';
};

/**
 * @returns {{ applied: {bundle, saving} | null, nearly: {bundle, missing, saving} | null }}
 */
export function findBundleDeal(build, bundles, steps, digitOptions, balloonColours, curatedPalettes) {
  const deals = bundles.map(bundle => {
    const preset = bundle.preset || {};
    const items = itemsOf(preset);
    if (items.length < 2) return null;
    // The bundle's items at today's prices, against what the bundle costs today
    const recipe = { ...preset, paletteId: null, shimmerSize: build.shimmerSize || preset.shimmerSize };
    const itemsPrice = calculateLookRecipePrice(recipe, steps, digitOptions, balloonColours, curatedPalettes, null).finalTotal;
    // Priced the way Get inspired shows it: Laura's own price, or the items less the bundle's offer
    const bundlePrice = bundle.manualPriceOverride
      ? applyCornerBannerDiscount(bundle.guidePrice, bundle.cornerBanner)
      : calculateLookRecipePrice(recipe, steps, digitOptions, balloonColours, curatedPalettes, bundle.cornerBanner).finalTotal;
    const saving = Math.max(0, Math.round(itemsPrice - bundlePrice));
    if (!saving) return null;
    const missing = items.filter(it => !has(build, it));
    return { bundle, saving, missing };
  }).filter(Boolean);

  const complete = deals.filter(d => d.missing.length === 0).sort((a, b) => b.saving - a.saving)[0] || null;
  const nearly = complete ? null : deals
    .filter(d => d.missing.length === 1 && canAdd(build, d.missing[0]))
    .sort((a, b) => b.saving - a.saving)[0] || null;
  return {
    applied: complete ? { bundle: complete.bundle, saving: complete.saving } : null,
    nearly: nearly ? { bundle: nearly.bundle, missing: nearly.missing[0], saving: nearly.saving } : null
  };
}
