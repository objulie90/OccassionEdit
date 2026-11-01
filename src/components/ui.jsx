import { balloonGradients, gradientId, finishOf, BalloonShine } from './balloonFinish';
import React, { useState, useEffect, useRef, useId } from 'react';

/**
 * 3D-shaded individual balloon SVG for palette cards
 */
export function BalloonGraphic({ hex, finish = 'Matte', size = 44 }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const colour = { id: uid, hex, finish };
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 60 76"
      aria-hidden="true"
      className="oe-balloon-svg-icon"
    >
      <defs>{balloonGradients('bg', [colour])}</defs>
      <path d="M 30 58 Q 32 67 28 75" stroke="rgba(28,30,27,0.4)" strokeWidth="1.2" fill="none" />
      <polygon points="27,56 33,56 30,60" fill={hex} />
      <ellipse cx="30" cy="28" rx="23" ry="27" fill={`url(#${gradientId('bg', colour)})`} stroke="rgba(28,30,27,0.18)" strokeWidth="1" />
      <BalloonShine cx={30} cy={28} r={23} finish={finishOf(colour)} />
    </svg>
  );
}

/**
 * Auto-growing text box (Studio Mode only): always expands to show ALL of its text.
 * Hooks live here (not in EditableText) so the customer-facing branch stays hook-free and identical.
 */
export function AutoGrowTextarea({ value, onChange, className = '', placeholder = '', singleLine = false }) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const borderSpace = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + borderSpace}px`;
  };

  React.useLayoutEffect(resize, [value]);

  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value || ''}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={singleLine ? (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } } : undefined}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
      className={`${singleLine ? 'oe-inline-edit-input' : 'oe-inline-edit-textarea'} ${className}`}
      style={{
        display: 'block',
        overflow: 'hidden',
        resize: 'none',
        minHeight: singleLine ? 0 : undefined,
        lineHeight: singleLine ? 1.3 : undefined
      }}
    />
  );
}

/**
 * Reusable Inline WYSIWYG Text Editor (Renders normal tag for customers, auto-growing box in Studio Mode)
 */
export function EditableText({ isEditMode, value, onChange, tag = 'span', multiline = false, className = '', placeholder = '' }) {
  if (!isEditMode) {
    const Tag = tag;
    return <Tag className={className}>{value}</Tag>;
  }
  return (
    <AutoGrowTextarea
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      singleLine={!multiline}
    />
  );
}

/**
 * Buffered price input (Studio Mode only): can be emptied while typing without jumping to £0,
 * accepts digits and one decimal point, and is clamped to £0–£5,000.
 */
export function PriceInput({ value, onChange, prefix = '£', suffix = '' }) {
  const [raw, setRaw] = useState(String(value ?? ''));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(String(value ?? ''));
  }, [value, focused]);

  const handleChange = (e) => {
    let next = e.target.value.replace(/[^0-9.]/g, '');
    const firstDot = next.indexOf('.');
    if (firstDot !== -1) {
      next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
    }
    if (next !== '' && next !== '.' && Number(next) > 5000) next = '5000';
    setRaw(next);
    if (next !== '' && next !== '.') {
      onChange(Math.min(5000, Math.max(0, Number(next))));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const num = Number(raw);
    if (raw === '' || raw === '.' || Number.isNaN(num)) {
      setRaw(String(value ?? 0));
    } else {
      setRaw(String(Math.min(5000, Math.max(0, num))));
    }
  };

  return (
    <span className="oe-inline-price-pill" onClick={(e) => e.stopPropagation()}>
      <span>{prefix}</span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        className="oe-inline-price-field"
      />
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

/**
 * Reusable Inline WYSIWYG Price Editor
 */
export function EditablePrice({ isEditMode, value, onChange, prefix = '£', suffix = '' }) {
  if (!isEditMode) {
    return (
      <span>
        {prefix}{value}{suffix}
      </span>
    );
  }
  return <PriceInput value={value} onChange={onChange} prefix={prefix} suffix={suffix} />;
}

/**
 * CURATED VISUAL BALLOON SWATCHES (ZERO HEX CODES)
 * Industry-standard decorator balloon shades categorized by finish and palette tone.
 */
export const CURATED_BALLOON_SWATCH_TRAY = [
  // Classics
  { defaultName: 'Pure White', hex: '#FFFFFF', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Black', hex: '#1A1A1A', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Ruby Red', hex: '#9B111E', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Royal Blue', hex: '#274472', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Navy Blue', hex: '#1B263B', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Sky Blue', hex: '#87CEEB', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Baby Blue', hex: '#B0E0E6', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Forest Green', hex: '#225E3E', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Lime Green', hex: '#7CBA34', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Bright Yellow', hex: '#FCD34D', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Orange', hex: '#F97316', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Hot Pink', hex: '#EC4899', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Baby Pink', hex: '#FBCFE8', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Lavender', hex: '#C4B5FD', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Purple', hex: '#6B21A8', finish: 'Matte', category: 'Classics' },
  { defaultName: 'Chocolate Brown', hex: '#4A2E18', finish: 'Matte', category: 'Classics' },

  // Earthy & Neutrals
  { defaultName: 'Ivory / Cream', hex: '#FDFBF7', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Sand', hex: '#D4C5B9', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Tan', hex: '#C2A68C', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Mocha', hex: '#826A5C', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Eucalyptus', hex: '#8FA392', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Sage Green', hex: '#7A8C68', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Olive', hex: '#5E6B4E', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Terracotta', hex: '#C67D5A', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Peach', hex: '#FDBA74', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Blush', hex: '#E6B8AF', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Dusty Rose', hex: '#DCAE96', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Mauve', hex: '#9D7A84', finish: 'Matte', category: 'Earthy & Neutrals' },
  { defaultName: 'Slate Grey', hex: '#64748B', finish: 'Matte', category: 'Earthy & Neutrals' },

  // Chromes & Metallics
  { defaultName: 'Chrome Gold', hex: '#C5A059', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Silver', hex: '#BCC0C7', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Rose Gold', hex: '#C48B7B', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Copper', hex: '#B87333', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Blue', hex: '#3B82F6', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Purple', hex: '#8B5CF6', finish: 'Chrome', category: 'Chromes' },
  { defaultName: 'Chrome Green', hex: '#10B981', finish: 'Chrome', category: 'Chromes' },

  // Pearls & Satins
  { defaultName: 'Pearl White', hex: '#F5F5F7', finish: 'Pearl', category: 'Pearls' },
  { defaultName: 'Pearl Ivory', hex: '#F5F2EB', finish: 'Pearl', category: 'Pearls' },
  { defaultName: 'Pearl Blush', hex: '#F4DCD6', finish: 'Pearl', category: 'Pearls' },
  { defaultName: 'Champagne Satin', hex: '#E5D3B3', finish: 'Satin', category: 'Pearls' }
];

export function VisualColourPicker({ currentHex, currentName, currentFinish, onSelectColour, onClose }) {
  const [selectedHex, setSelectedHex] = useState(currentHex || '#7A8C68');
  const [customName, setCustomName] = useState(currentName || 'Custom Shade');
  const [finish, setFinish] = useState(currentFinish || 'Matte');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', 'Classics', 'Earthy & Neutrals', 'Chromes', 'Pearls'];
  const filteredSwatches = categoryFilter === 'All'
    ? CURATED_BALLOON_SWATCH_TRAY
    : CURATED_BALLOON_SWATCH_TRAY.filter(s => s.category === categoryFilter);

  const handlePickSwatch = (swatch) => {
    setSelectedHex(swatch.hex);
    setCustomName(swatch.defaultName);
    setFinish(swatch.finish);
  };

  return (
    <div className="oe-swatch-picker-modal-backdrop" onClick={onClose}>
      <div className="oe-swatch-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="oe-swatch-picker-header">
          <div>
            <span className="oe-dock-col-label">Balloon colours</span>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              Select Balloon Shade
            </h3>
          </div>
          <button type="button" onClick={onClose} className="oe-swatch-close-btn">Close</button>
        </div>

        {/* Selected Balloon Live Preview & Name Customiser */}
        <div className="oe-swatch-preview-card">
          <div
            className="oe-swatch-large-preview-ball"
            style={{
              background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${selectedHex} 50%, #1A1A1A 130%)`
            }}
          />
          <div style={{ flex: 1 }}>
            <label className="oe-dock-col-label">Colour name</label>
            <input
              type="text"
              value={customName}
              placeholder="e.g. Signature Eucalyptus"
              onChange={(e) => setCustomName(e.target.value)}
              className="oe-dock-input"
              style={{ margin: '0.2rem 0 0.5rem', fontWeight: 700, fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <span className="oe-dock-col-label" style={{ margin: 0 }}>FINISH:</span>
              {['Matte', 'Pearl', 'Chrome', 'Satin'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFinish(f)}
                  className={`oe-finish-pill-btn ${finish === f ? 'active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="oe-swatch-tabs-bar" style={{ display: 'flex', gap: '0.35rem', margin: '0.75rem 0 0.5rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`oe-swatch-tab-btn ${categoryFilter === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Categorized Balloon Swatches Tray */}
        <div className="oe-swatch-tray-grid">
          {filteredSwatches.map((sw, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePickSwatch(sw)}
              title={`${sw.defaultName} (${sw.finish})`}
              className={`oe-swatch-tray-item ${selectedHex === sw.hex ? 'selected' : ''}`}
            >
              <div
                className="oe-swatch-mini-ball"
                style={{
                  background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${sw.hex} 50%, #1A1A1A 130%)`
                }}
              />
              <span className="oe-swatch-tray-label">{sw.defaultName}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={onClose} className="oe-dock-action-btn" style={{ background: '#F1F5F9', color: '#475569', border: 'none' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectColour({ hex: selectedHex, name: customName, finish });
              onClose();
            }}
            className="oe-dock-action-btn"
            style={{ background: '#0284C7', color: '#FFFFFF' }}
          >
            Save colour
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Diagonal Luxury Corner Ribbon Component
 */
export function CornerRibbon({ banner }) {
  if (!banner || !banner.enabled || !banner.text) return null;
  const pos = banner.position === 'top-left' ? 'top-left' : 'top-right';
  const styleClass = `oe-ribbon-${banner.style || 'gold'}`;
  return (
    <div className={`oe-corner-ribbon-wrap ${pos}`} aria-label={`Promotion: ${banner.text}`}>
      <span className={`oe-corner-ribbon ${styleClass}`}>{banner.text}</span>
    </div>
  );
}

/**
 * Studio Mode Corner Banner & Automatic Discount Popover
 */
export function RibbonPickerPopover({ banner, onChange, onClose }) {
  const current = banner || {
    enabled: false,
    text: 'MOST POPULAR',
    style: 'gold',
    position: 'top-right',
    discountType: 'none',
    discountValue: 0
  };

  const presets = [
    { label: '10% OFF', text: '10% OFF', style: 'coral', discountType: 'percent', discountValue: 10 },
    { label: '15% OFF', text: '15% OFF', style: 'coral', discountType: 'percent', discountValue: 15 },
    { label: 'SAVE £20', text: 'SAVE £20', style: 'coral', discountType: 'fixed', discountValue: 20 },
    { label: 'MOST POPULAR', text: 'MOST POPULAR', style: 'gold', discountType: 'none', discountValue: 0 },
    { label: 'NEW LOOK', text: 'NEW LOOK', style: 'sage', discountType: 'none', discountValue: 0 },
    { label: 'LIMITED DATES', text: 'LIMITED DATES', style: 'espresso', discountType: 'none', discountValue: 0 }
  ];

  return (
    <div className="oe-ribbon-popover" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Label and offer</strong>
        <button type="button" onClick={onClose} className="oe-mini-admin-btn">Done</button>
      </div>

      <div className="oe-ribbon-preset-row">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="oe-ribbon-preset-chip"
            onClick={() =>
              onChange({
                ...current,
                enabled: true,
                text: p.text,
                style: p.style,
                discountType: p.discountType,
                discountValue: p.discountValue
              })
            }
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="oe-ribbon-preset-chip"
          onClick={() => onChange({ ...current, enabled: false, discountType: 'none', discountValue: 0 })}
        >
          Remove label
        </button>
      </div>

      <div className="oe-ribbon-controls-grid">
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700 }}>Ribbon Text</label>
          <input
            type="text"
            maxLength={18}
            value={current.text || ''}
            onChange={(e) => onChange({ ...current, enabled: true, text: e.target.value })}
            className="oe-inline-edit-input"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700 }}>Colour</label>
          <select
            value={current.style || 'gold'}
            onChange={(e) => onChange({ ...current, enabled: true, style: e.target.value })}
            className="oe-recipe-select"
          >
            <option value="gold">Metallic Gold</option>
            <option value="coral">Sale Coral</option>
            <option value="sage">Botanical Sage</option>
            <option value="espresso">Dark Espresso</option>
            <option value="blush">Soft Blush</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700 }}>Corner</label>
          <select
            value={current.position || 'top-right'}
            onChange={(e) => onChange({ ...current, enabled: true, position: e.target.value })}
            className="oe-recipe-select"
          >
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700 }}>Auto-Discount</label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <select
              value={current.discountType || 'none'}
              onChange={(e) => onChange({ ...current, enabled: true, discountType: e.target.value })}
              className="oe-recipe-select"
            >
              <option value="none">None</option>
              <option value="percent">% Off</option>
              <option value="fixed">£ Off</option>
            </select>
            {current.discountType && current.discountType !== 'none' && (
              <input
                type="number"
                min="0"
                max="90"
                value={current.discountValue || 0}
                onChange={(e) => onChange({ ...current, enabled: true, discountValue: Number(e.target.value) })}
                className="oe-inline-edit-input"
                style={{ width: '58px' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
