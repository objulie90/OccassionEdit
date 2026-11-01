import React, { useState } from 'react';
import { buildProductTree, priceFields, headlinePrice, builderLineKey, refKey, pricesToConfirm } from './inventoryModel';
import { LABELS, bannerFromForm } from './CatalogueTabs';
import { BalloonStock } from './BalloonStock';
import { SaleEditor } from './SaleEditor';
import { money } from './studioFormat';
import { OCCASION_LABELS, STYLES } from '../lib/upsell';

const VIEWS = [
  { id: 'products', label: 'Products' },
  { id: 'balloons', label: 'Balloons' },
  { id: 'sale', label: 'Sale' }
];

// The label and offer currently on a product, as editor choices
function bannerChoices(b) {
  const banner = b && b.enabled ? b : null;
  const preset = banner && LABELS.some(([v]) => v === banner.text) ? banner.text : null;
  const isOfferText = banner && /off$/.test(banner.text || '');
  return {
    label: !banner ? 'none' : preset || (isOfferText ? 'none' : 'custom'),
    customLabel: banner && !preset && !isOfferText ? banner.text : '',
    discountType: banner?.discountType && banner.discountType !== 'none' ? banner.discountType : 'none',
    discountValue: banner?.discountValue || ''
  };
}

/**
 * Inventory: everything customers can choose, arranged the way they build it,
 * the balloons in the cupboard, and any sale. Every customer-facing detail of a
 * product is edited here.
 */
export function InventoryTab(props) {
  const [view, setView] = useState('products');
  return (
    <div className="st-catalogue">
      <div className="st-subnav" role="group" aria-label="Inventory">
        {VIEWS.map(v => (
          <button key={v.id} type="button" className="st-chip" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
            {v.label}
            {v.id === 'sale' && props.saleLive && <span className="st-chip-count">On now</span>}
          </button>
        ))}
      </div>
      {view === 'products' && <ProductTree {...props} />}
      {view === 'balloons' && <BalloonStock {...props} />}
      {view === 'sale' && <SaleEditor {...props} />}
    </div>
  );
}

function ProductTree({ steps = [], digitOptions = [], catalog = [], onSaveInventoryItem, onAddInventoryItem, onRemoveInventoryItem, onRestoreInventory, onUploadPhoto }) {
  const [openKey, setOpenKey] = useState(null);
  const [adding, setAdding] = useState(null); // section id
  const [removed, setRemoved] = useState(null); // { name, snapshot }
  const [search, setSearch] = useState('');
  const tree = buildProductTree(steps, digitOptions, catalog);
  const term = search.trim().toLowerCase();
  const matches = l => !term || String(l.item.name || '').toLowerCase().includes(term) || String(l.code).toLowerCase().includes(term);

  const remove = async (leafItem) => {
    setOpenKey(null);
    const snapshot = await onRemoveInventoryItem(leafItem.ref);
    if (snapshot) setRemoved({ name: leafItem.item.name, snapshot });
  };

  return (
    <>
      <div className="st-cat-head">
        <p className="st-cat-note">Everything customers can choose, in the order they build. Tap a product to change anything they see.</p>
        <label htmlFor="st-product-search" className="st-visually-hidden">Search products</label>
        <input id="st-product-search" type="search" placeholder="Search by name or code" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {removed && (
        <div className="st-undo" role="status">
          <span>{removed.name} removed from the builder and the price list.</span>
          <button type="button" className="st-link" onClick={async () => { await onRestoreInventory(removed.snapshot); setRemoved(null); }}>Undo</button>
          <button type="button" className="st-link st-link-quiet" onClick={() => setRemoved(null)}>Dismiss</button>
        </div>
      )}

      {tree.map(section => {
        const groups = section.groups.map(g => ({ ...g, items: g.items.filter(matches) })).filter(g => g.items.length > 0);
        if (term && groups.length === 0) return null;
        return (
          <section key={section.id} className="st-tree-section" aria-labelledby={`st-sec-${section.id}`}>
            <div className="st-cat-top">
              <h3 id={`st-sec-${section.id}`} className="st-section-title">{section.title}</h3>
              {onAddInventoryItem && <button type="button" className="st-btn" onClick={() => { setAdding(section.id); setOpenKey(null); }}>Add to {section.title.toLowerCase()}</button>}
            </div>
            {section.note && !(section.id === 'backdrop' && section.groups.some(g => g.items.some(l => pricesToConfirm(l.item) > 0))) && <p className="st-cat-note">{section.note}</p>}
            {section.id === 'backdrop' && (() => {
              const missing = section.groups.flatMap(g => g.items).reduce((n, l) => n + pricesToConfirm(l.item), 0);
              return missing > 0 && (
                <p className="st-callout">
                  <strong>Laura, your price list goes here.</strong> Each base is sold as a complete display: on its own, with corner clusters, a garland or a full archway.
                  {` ${missing} price${missing === 1 ? '' : 's'} still to fill in`}, marked "To fill in" below. Until then customers see "Price to confirm".
                </p>
              );
            })()}
            {adding === section.id && (
              <AddProduct
                section={section}
                tree={tree}
                onAdd={async (item, card) => {
                  const ok = await onAddInventoryItem(section.id, item, card);
                  if (ok !== false) { setAdding(null); setOpenKey(section.id === 'digits' ? `digit:${item.id}` : section.id === 'pricelist' ? `card:${item.id}` : `step:${section.id}:${item.id}`); }
                  return ok;
                }}
                onUploadPhoto={onUploadPhoto}
                onCancel={() => setAdding(null)}
              />
            )}
            {groups.map(group => (
              <div key={group.title || 'all'} className="st-tree-group">
                {group.title && <h4 className="st-tree-group-title">{group.title}</h4>}
                <ul className="st-product-list">
                  {group.items.map(l => (
                    <li key={l.key} className={`st-product-row ${l.item.inStock === false ? 'is-out' : ''}`}>
                      <button type="button" className="st-product" aria-expanded={openKey === l.key} onClick={() => setOpenKey(openKey === l.key ? null : l.key)}>
                        <span className="st-product-thumb" aria-hidden="true">{l.item.image ? <img src={l.item.image} alt="" loading="lazy" /> : null}</span>
                        <span className="st-product-main">
                          <span className="st-product-name">
                            {l.item.name}
                            {l.item.cornerBanner?.enabled && l.item.cornerBanner.text && <span className="st-tag st-tag-offer">{l.item.cornerBanner.text}</span>}
                          </span>
                          <span className="st-code">
                            {[l.code, l.item.hireOnly && !l.item.madeToOrder ? `${l.item.ownedCount ?? 1} owned` : null].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="st-tag">{l.item.hireOnly ? 'Hire' : 'Yours to keep'}</span>
                        <span className="st-product-price">
                          {headlinePrice(l) == null ? '' : `${Array.isArray(l.item.displays) ? 'From ' : ''}${money(headlinePrice(l))}`}
                          {pricesToConfirm(l.item) > 0 && <span className="st-tbc">{pricesToConfirm(l.item)} to fill in</span>}
                        </span>
                        <span className={`st-stock ${l.item.inStock === false ? 'is-out' : 'is-in'}`}>{l.item.inStock === false ? 'Not available' : ''}</span>
                      </button>
                      {openKey === l.key && (
                        <ItemEditor
                          leafItem={l}
                          onSave={onSaveInventoryItem}
                          onRemove={onRemoveInventoryItem ? () => remove(l) : null}
                          onUploadPhoto={onUploadPhoto}
                          onClose={() => setOpenKey(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}

// Everything customers see about one product, in one place
function ItemEditor({ leafItem, onSave, onRemove, onUploadPhoto, onClose }) {
  const { ref, item, cards } = leafItem;
  const card = ref.kind === 'card' ? item : cards[0] || null;
  const fields = priceFields(leafItem);
  const lineKey = builderLineKey(ref);
  const tracksOwned = item.hireOnly && !item.madeToOrder && ref.kind === 'step';
  // Bases and balloon structures are drawn to scale beside a 5ft 7in guest
  const hasHeight = ref.kind === 'step' && (ref.stepId === 'backdrop' || ref.stepId === 'balloons');
  const heightKeys = item.hasSizeTier ? [['heightIn', 'Height of the small one'], ['heightInLarge', 'Height of the large one']] : [['heightIn', item.backdropType === 'hoop' ? 'Width across' : 'Height']];

  const [f, setF] = useState(() => ({
    name: item.name || '',
    cardName: ref.kind !== 'card' && card ? card.name || '' : '',
    line: lineKey ? item[lineKey] || '' : '',
    style: card ? card.style || '' : '',
    prices: Object.fromEntries(fields.map(p => [p.key, item[p.key] ?? p.fallback ?? ''])),
    ownedCount: item.ownedCount ?? 1,
    displays: Array.isArray(item.displays) ? item.displays.map(d => ({ ...d, price: d.price ?? '', priceLarge: d.priceLarge ?? '' })) : null,
    heights: Object.fromEntries(['heightIn', 'heightInLarge'].map(k => [k, { ft: item[k] ? Math.floor(item[k] / 12) : '', in: item[k] ? item[k] % 12 : '' }])),
    code: leafItem.code || '',
    image: item.image || card?.image || '',
    inStock: item.inStock !== false,
    hireOnly: Boolean(item.hireOnly),
    suggestFor: item.suggestFor || [],
    phrases: (item.phrases || []).join('\n'),
    styleFor: item.styleFor || [],
    ...bannerChoices(item.cornerBanner || card?.cornerBanner)
  }));
  const [state, setState] = useState('idle');
  const set = patch => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };

  const choosePhoto = async (file) => {
    if (!file || !onUploadPhoto) return;
    setState('uploading');
    try { set({ image: await onUploadPhoto(file) }); } catch (_e) { setState('error'); }
  };

  const save = async (e) => {
    e.preventDefault();
    setState('saving');
    const banner = bannerFromForm(f);
    const prices = Object.fromEntries(Object.entries(f.prices).map(([k, v]) => [k, Math.max(0, Number(v) || 0)]));
    const itemPatch = {
      name: f.name.trim() || item.name,
      image: f.image,
      inStock: f.inStock,
      hireOnly: f.hireOnly,
      cornerBanner: banner,
      code: f.code.trim(),
      ...prices
    };
    if (ref.kind !== 'card') { itemPatch.suggestFor = f.suggestFor; itemPatch.styleFor = f.styleFor; }
    if (item.extraType === 'neon') itemPatch.phrases = f.phrases.split('\n').map(x => x.trim()).filter(Boolean);
    if (lineKey) itemPatch[lineKey] = f.line.trim();
    if (hasHeight) {
      heightKeys.forEach(([k]) => {
        const h = f.heights[k];
        const total = (parseInt(h.ft, 10) || 0) * 12 + (parseInt(h.in, 10) || 0);
        itemPatch[k] = total > 0 ? total : undefined;
      });
    }
    if (f.displays) {
      const num = v => (v === '' || v == null ? null : Math.max(0, Number(v) || 0));
      itemPatch.displays = f.displays.map(d => {
        const out = { id: d.id, offered: d.offered !== false, price: num(d.price) };
        if (item.hasSizeTier) out.priceLarge = num(d.priceLarge);
        if (d.label) out.label = d.label;
        return out;
      });
    }
    if (tracksOwned) itemPatch.ownedCount = Math.max(0, parseInt(f.ownedCount, 10) || 0);
    if (ref.kind === 'card') {
      itemPatch.style = f.style.trim();
      itemPatch.pricingText = `£${prices.basePrice}`;
    }
    const cardPatch = { image: f.image, inStock: f.inStock, hireOnly: f.hireOnly, cornerBanner: banner, code: f.code.trim() };
    if (ref.kind !== 'card' && card) { cardPatch.name = f.cardName.trim() || card.name; cardPatch.style = f.style.trim(); }
    const ok = await onSave(ref, itemPatch, ref.kind === 'card' ? {} : cardPatch);
    setState(ok === false ? 'error' : 'saved');
  };

  const banner = bannerFromForm(f);
  const firstPrice = fields.length ? Number(f.prices[fields[0].key]) || 0 : Number(headlinePrice(leafItem)) || 0;
  const offerPrice = banner && banner.discountType !== 'none'
    ? (banner.discountType === 'percent' ? Math.round(firstPrice * (1 - banner.discountValue / 100)) : Math.max(0, firstPrice - banner.discountValue))
    : null;
  const id = refKey(ref).replace(/[^a-z0-9]/gi, '-');

  return (
    <form className="st-product-editor" onSubmit={save} aria-label={`Edit ${item.name}`}>
      <div className="st-editor-photo">
        {f.image ? <img src={f.image} alt="" /> : <span className="st-empty">No photo yet</span>}
        <label className="st-btn">
          {state === 'uploading' ? 'Adding photo' : f.image ? 'Change photo' : 'Add a photo'}
          <input type="file" accept="image/*" hidden onChange={e => choosePhoto(e.target.files?.[0])} />
        </label>
      </div>
      <div className="st-editor-fields">
        <div className="st-form-grid">
          <div className="st-field">
            <label htmlFor={`ie-name-${id}`}>{ref.kind === 'card' ? 'Name' : 'Name in the builder'}</label>
            <input id={`ie-name-${id}`} type="text" value={f.name} onChange={e => set({ name: e.target.value })} />
          </div>
          {ref.kind !== 'card' && card && (
            <div className="st-field">
              <label htmlFor={`ie-cardname-${id}`}>Name in the price list</label>
              <input id={`ie-cardname-${id}`} type="text" value={f.cardName} onChange={e => set({ cardName: e.target.value })} />
            </div>
          )}
        </div>
        {lineKey && (
          <div className="st-field">
            <label htmlFor={`ie-line-${id}`}>Words on the builder card</label>
            <textarea id={`ie-line-${id}`} rows={2} value={f.line} onChange={e => set({ line: e.target.value })} />
          </div>
        )}
        {card && (
          <div className="st-field">
            <label htmlFor={`ie-style-${id}`}>Words in the price list</label>
            <textarea id={`ie-style-${id}`} rows={3} value={f.style} onChange={e => set({ style: e.target.value })} />
            <span className="st-hint">Sell it: say why they'll love it, not what's in it.</span>
          </div>
        )}
        {f.displays && (
          <fieldset className="st-prop-pick st-display-prices">
            <legend className="st-field-label">Your prices for this base</legend>
            <p className="st-hint">Tick the displays you offer. Leave a price blank if you're not sure yet: customers see "Price to confirm" and you set it in the quote.</p>
            <div className="st-display-table" role="table" aria-label="Prices by display">
              <div role="row" className="st-display-row is-head">
                <span role="columnheader">Display</span>
                <span role="columnheader">{item.hasSizeTier ? 'Small (£)' : 'Price (£)'}</span>
                {item.hasSizeTier && <span role="columnheader">Large (£)</span>}
              </div>
              {f.displays.map((d, i) => {
                const name = d.label || { none: 'On its own', clusters: 'With corner clusters', garland: 'With a garland', arch: 'With a full archway' }[d.id];
                const setD = patch => set({ displays: f.displays.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <div role="row" key={d.id} className={`st-display-row ${d.offered === false ? 'is-off' : ''}`}>
                    <label role="cell" className="st-check"><input type="checkbox" checked={d.offered !== false} onChange={e => setD({ offered: e.target.checked })} /><span>{name}</span></label>
                    <span role="cell">
                      <input type="number" inputMode="decimal" min="0" aria-label={`${name}, ${item.hasSizeTier ? 'small ' : ''}price`} placeholder="To fill in" value={d.price} disabled={d.offered === false} onChange={e => setD({ price: e.target.value })} className={d.price === '' && d.offered !== false ? 'is-missing' : ''} />
                    </span>
                    {item.hasSizeTier && (
                      <span role="cell">
                        <input type="number" inputMode="decimal" min="0" aria-label={`${name}, large price`} placeholder="To fill in" value={d.priceLarge} disabled={d.offered === false} onChange={e => setD({ priceLarge: e.target.value })} className={d.priceLarge === '' && d.offered !== false ? 'is-missing' : ''} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
        <div className="st-form-grid">
          {fields.map(p => (
            <div key={p.key} className="st-field">
              <label htmlFor={`ie-${p.key}-${id}`}>{p.label}</label>
              <input id={`ie-${p.key}-${id}`} type="number" inputMode="decimal" min="0" value={f.prices[p.key]} onChange={e => set({ prices: { ...f.prices, [p.key]: e.target.value } })} />
            </div>
          ))}
        </div>
        {hasHeight && (
          <div className="st-field" role="group" aria-label="Size guide">
            <span className="st-field-label">For the size guide</span>
            <div className="st-height-row">
              {heightKeys.map(([k, label]) => (
                <div key={k} className="st-height">
                  <span className="st-hint">{label}</span>
                  <span className="st-height-inputs">
                    <input type="number" inputMode="numeric" min="0" max="30" aria-label={`${label}, feet`} value={f.heights[k].ft} onChange={e => set({ heights: { ...f.heights, [k]: { ...f.heights[k], ft: e.target.value } } })} />
                    <span>ft</span>
                    <input type="number" inputMode="numeric" min="0" max="11" aria-label={`${label}, inches`} value={f.heights[k].in} onChange={e => set({ heights: { ...f.heights, [k]: { ...f.heights[k], in: e.target.value } } })} />
                    <span>in</span>
                  </span>
                </div>
              ))}
            </div>
            <span className="st-hint">Customers see it drawn to scale beside a guest 5ft 7in tall. Leave blank if you're not sure.</span>
          </div>
        )}
        {item.extraType === 'neon' && (
          <div className="st-field">
            <label htmlFor={`ie-phrases-${id}`}>Signs you own, one per line</label>
            <textarea id={`ie-phrases-${id}`} rows={3} value={f.phrases} onChange={e => set({ phrases: e.target.value })} />
            <span className="st-hint">Customers choose from these. "Happy Birthday" uses your photo of the sign.</span>
          </div>
        )}
        <div className="st-form-grid">
          {tracksOwned && (
            <div className="st-field">
              <label htmlFor={`ie-owned-${id}`}>How many you own</label>
              <input id={`ie-owned-${id}`} type="number" inputMode="numeric" min="0" max="99" value={f.ownedCount} onChange={e => set({ ownedCount: e.target.value })} />
              <span className="st-hint">When they're all booked on a date, customers see it greyed out.</span>
            </div>
          )}
          <div className="st-field">
            <label htmlFor={`ie-code-${id}`}>Product code</label>
            <input id={`ie-code-${id}`} type="text" value={f.code} onChange={e => set({ code: e.target.value })} />
          </div>
        </div>
        <div className="st-field" role="group" aria-label="Hire or keep">
          <span className="st-field-label">Do you collect it afterwards?</span>
          <div className="st-filter">
            <button type="button" className="st-chip" aria-pressed={f.hireOnly} onClick={() => set({ hireOnly: true })}>Yes, it's hired</button>
            <button type="button" className="st-chip" aria-pressed={!f.hireOnly} onClick={() => set({ hireOnly: false })}>No, it's theirs to keep</button>
          </div>
        </div>
        <div className="st-field" role="group" aria-label="Label on the photo">
          <span className="st-field-label">Label on the photo</span>
          <div className="st-filter">
            {LABELS.map(([value, text]) => (
              <button key={value} type="button" className="st-chip" aria-pressed={f.label === value} onClick={() => set({ label: value })}>{text}</button>
            ))}
          </div>
          {f.label === 'custom' && <input type="text" aria-label="Your label" maxLength={22} placeholder="e.g. Just added" value={f.customLabel} onChange={e => set({ customLabel: e.target.value })} />}
        </div>
        {ref.kind !== 'card' && (
          <>
            <div className="st-field" role="group" aria-label="Suggest it for">
              <span className="st-field-label">Suggest it for</span>
              <div className="st-filter">
                {Object.entries(OCCASION_LABELS).map(([occasion, words]) => (
                  <button key={occasion} type="button" className="st-chip" aria-pressed={f.suggestFor.includes(occasion)} onClick={() => set({ suggestFor: f.suggestFor.includes(occasion) ? f.suggestFor.filter(o => o !== occasion) : [...f.suggestFor, occasion] })}>{occasion}</button>
                ))}
              </div>
              <span className="st-hint">Customers planning these see "Perfect for {f.suggestFor.length ? OCCASION_LABELS[f.suggestFor[0]] : 'birthdays'}" on it, and it's offered when they finish.</span>
            </div>
            <div className="st-field" role="group" aria-label="Part of these styles">
              <span className="st-field-label">Part of these styles</span>
              <div className="st-filter">
                {STYLES.map(style => (
                  <button key={style} type="button" className="st-chip" aria-pressed={f.styleFor.includes(style)} onClick={() => set({ styleFor: f.styleFor.includes(style) ? f.styleFor.filter(x => x !== style) : [...f.styleFor, style] })}>{style}</button>
                ))}
              </div>
              <span className="st-hint">Customers who chose this style see "A {f.styleFor[0] || 'Luxury'} touch" on it.</span>
            </div>
          </>
        )}
        <div className="st-field" role="group" aria-label="Offer">
          <span className="st-field-label">Offer</span>
          <div className="st-filter">
            {[['none', 'No offer'], ['percent', '% off'], ['fixed', '£ off']].map(([value, text]) => (
              <button key={value} type="button" className="st-chip" aria-pressed={f.discountType === value} onClick={() => set({ discountType: value })}>{text}</button>
            ))}
          </div>
          {f.discountType !== 'none' && (
            <input type="number" inputMode="decimal" min="0" aria-label={f.discountType === 'percent' ? 'Percent off' : 'Pounds off'} placeholder={f.discountType === 'percent' ? 'e.g. 10' : 'e.g. 20'} value={f.discountValue} onChange={e => set({ discountValue: e.target.value })} />
          )}
          {offerPrice !== null && <span className="st-hint">Customers will see {money(firstPrice)} crossed out and pay {money(offerPrice)}.</span>}
        </div>
        <div className="st-field" role="group" aria-label="Available to book">
          <span className="st-field-label">Available to book</span>
          <div className="st-filter">
            <button type="button" className="st-chip" aria-pressed={f.inStock} onClick={() => set({ inStock: true })}>Yes</button>
            <button type="button" className="st-chip" aria-pressed={!f.inStock} onClick={() => set({ inStock: false })}>Not right now</button>
          </div>
        </div>
        <div className="st-business-actions">
          <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving' || state === 'uploading'}>{state === 'saving' ? 'Saving' : 'Save and publish'}</button>
          <button type="button" className="st-link st-link-quiet" onClick={onClose}>Close</button>
          <span role="status" className="st-save-state">
            {state === 'saved' && 'Saved. Customers see it now.'}
            {state === 'error' && 'Not saved. Check your connection and try again.'}
          </span>
        </div>
        {onRemove && <button type="button" className="st-link st-link-danger st-remove-link" onClick={onRemove}>Remove this product</button>}
      </div>
    </form>
  );
}

// Codes follow Oliver's pattern, CAT_KIND_WHICH, with CAT from the section
const SECTION_CODES = { backdrop: 'BASE', balloons: 'STRUC', digits: 'EXTRAS', extras: 'FINISH', pricelist: 'ITEM' };

function AddProduct({ section, tree, onAdd, onUploadPhoto, onCancel }) {
  const [f, setF] = useState({ name: '', price: '', line: '', style: '', hireOnly: section.id === 'backdrop', onPriceList: true, image: '' });
  const [state, setState] = useState('idle');
  const set = patch => { setF(prev => ({ ...prev, ...patch })); setState('idle'); };
  const count = tree.flatMap(s => s.groups.flatMap(g => g.items)).filter(l => String(l.code).startsWith(`${SECTION_CODES[section.id]}_`)).length;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setState('missing'); return; }
    setState('saving');
    const price = Math.max(0, Number(f.price) || 0);
    const slug = f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    const id = `${slug || 'item'}-${Date.now().toString(36)}`;
    const code = `${SECTION_CODES[section.id]}_New_${count + 1}`;
    const name = f.name.trim();
    let item;
    if (section.id === 'digits') item = { id, code, name, type: 'stack', basePrice: price, description: f.line.trim(), inStock: true, image: f.image };
    else if (section.id === 'pricelist') item = { id, code, name, basePrice: price, pricingText: `£${price}`, style: f.style.trim(), hireOnly: f.hireOnly, inStock: true, image: f.image, department: 'Hire Props & Finishing Extras', section: 'Hire Props & Finishing Extras' };
    else item = { id, code, name, shortName: name, styleNote: f.line.trim(), price, hireOnly: f.hireOnly, inStock: true, image: f.image, ownedCount: f.hireOnly ? 1 : undefined };
    const card = section.id !== 'pricelist' && f.onPriceList
      ? { id: `card-${id}`, code, name, style: f.style.trim(), basePrice: price, pricingText: `£${price}`, hireOnly: f.hireOnly, inStock: true, image: f.image, department: section.id === 'digits' ? 'Numbers, Helium & Gifts' : section.id === 'extras' ? 'Hire Props & Finishing Extras' : 'Backdrops, Walls & Garlands', section: section.title }
      : null;
    const ok = await onAdd(item, card);
    if (ok === false) setState('error');
  };

  const choosePhoto = async (file) => {
    if (!file || !onUploadPhoto) return;
    try { set({ image: await onUploadPhoto(file) }); } catch (_e) { setState('error'); }
  };

  return (
    <form className="st-product-editor st-add-product" onSubmit={submit} aria-label={`New product in ${section.title}`}>
      <div className="st-editor-photo">
        {f.image ? <img src={f.image} alt="" /> : <span className="st-empty">No photo yet</span>}
        <label className="st-btn">{f.image ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/*" hidden onChange={e => choosePhoto(e.target.files?.[0])} /></label>
      </div>
      <div className="st-editor-fields">
        <div className="st-form-grid">
          <div className="st-field"><label htmlFor={`ap-name-${section.id}`}>Name</label><input id={`ap-name-${section.id}`} type="text" value={f.name} onChange={e => set({ name: e.target.value })} /></div>
          <div className="st-field"><label htmlFor={`ap-price-${section.id}`}>Price (£)</label><input id={`ap-price-${section.id}`} type="number" inputMode="decimal" min="0" value={f.price} onChange={e => set({ price: e.target.value })} /></div>
        </div>
        {section.id !== 'pricelist' && (
          <div className="st-field"><label htmlFor={`ap-line-${section.id}`}>Words on the builder card</label><textarea id={`ap-line-${section.id}`} rows={2} value={f.line} onChange={e => set({ line: e.target.value })} /></div>
        )}
        {(section.id === 'pricelist' || f.onPriceList) && (
          <div className="st-field"><label htmlFor={`ap-style-${section.id}`}>Words in the price list</label><textarea id={`ap-style-${section.id}`} rows={2} value={f.style} onChange={e => set({ style: e.target.value })} /></div>
        )}
        {section.id !== 'digits' && (
          <div className="st-field" role="group" aria-label="Hire or keep">
            <span className="st-field-label">Do you collect it afterwards?</span>
            <div className="st-filter">
              <button type="button" className="st-chip" aria-pressed={f.hireOnly} onClick={() => set({ hireOnly: true })}>Yes, it's hired</button>
              <button type="button" className="st-chip" aria-pressed={!f.hireOnly} onClick={() => set({ hireOnly: false })}>No, it's theirs to keep</button>
            </div>
          </div>
        )}
        {section.id !== 'pricelist' && (
          <label className="st-check"><input type="checkbox" checked={f.onPriceList} onChange={e => set({ onPriceList: e.target.checked })} /><span>Show it in the price list too</span></label>
        )}
        <div className="st-business-actions">
          <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Adding' : 'Add product'}</button>
          <button type="button" className="st-link st-link-quiet" onClick={onCancel}>Cancel</button>
          <span role="status" className="st-save-state">
            {state === 'missing' && 'Give it a name first.'}
            {state === 'error' && 'Not saved. Check your connection and try again.'}
          </span>
        </div>
      </div>
    </form>
  );
}
