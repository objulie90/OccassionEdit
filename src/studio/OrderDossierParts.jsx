import React, { useState } from 'react';
import {
  calculateBalloonPullList
} from '../data/catalogData.js';
import { BalloonGraphic } from '../components/ui';

/**
 * ---------------------------------------------------------------------------
 * DOSSIER VISUAL ARTWORK (Full Staged Composition matching media_1793459929283.png)
 * ---------------------------------------------------------------------------
 */
export function DossierVisualArtwork({ activeQuote, colours = [] }) {
  if (activeQuote?.previewSnapshotDataUrl) {
    return (
      <img
        src={activeQuote.previewSnapshotDataUrl}
        alt="Customer Bespoke Build"
        className="oe-dossier-snapshot-img"
      />
    );
  }

  // Older enquiries may have no picture; show the chosen colours rather than an invented design
  return (
    <div className="oe-dossier-no-snapshot">
      <p>No preview picture was sent with this enquiry.</p>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {colours.map(col => (
          <BalloonGraphic key={col.id} hex={col.hex} finish={col.finish} size={30} />
        ))}
      </div>
    </div>
  );
}

export function WorkshopBalloonPullList({ garland, colours, isExpandedDefault = true }) {
  const recipe = garland?.recipe || {};
  const [totalBalloons, setTotalBalloons] = useState(recipe.defaultTotal || 0);
  const [smallCount, setSmallCount] = useState(recipe.defaultSmall || 0);
  const [medCount, setMedCount] = useState(recipe.defaultMed || 0);
  const [largeCount, setLargeCount] = useState(recipe.defaultLarge || 0);
  const [showBuffer, setShowBuffer] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isExpandedDefault);

  // Invariant keeper: S + M + L = Total
  const updateCounts = (newTotal, newS, newM) => {
    const t = Math.max(10, newTotal);
    const s = Math.max(0, Math.min(t, newS));
    const m = Math.max(0, Math.min(t - s, newM));
    const l = Math.max(0, t - s - m);
    setTotalBalloons(t);
    setSmallCount(s);
    setMedCount(m);
    setLargeCount(l);
  };

  if (!garland) {
    return (
      <div className="oe-pull-list-card">
        <p className="oe-dossier-empty-note">No balloon garland on this order, so there is no pull list.</p>
      </div>
    );
  }

  const paletteColorsList = colours || [];

  const pullList = calculateBalloonPullList(
    garland,
    paletteColorsList,
    { total: totalBalloons, small: smallCount, med: medCount, large: largeCount, bufferPercent: 8 }
  );

  return (
    <div className="oe-pull-list-card">
      <div className="oe-pull-list-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {garland.sku && <span className="oe-sku-badge">{garland.sku}</span>}
          <strong style={{ fontSize: '0.86rem', color: '#1C1E1B', letterSpacing: '0.02em' }}>
            Workshop Balloon Pull List
          </strong>
          <span className="oe-badge-count">{totalBalloons} Balloons</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`oe-buffer-toggle-pill ${showBuffer ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowBuffer(!showBuffer); }}
            title="Toggle 8% studio popping/loss buffer"
          >
            {showBuffer ? '✓ 8% Buffer Active' : '+8% Loss Buffer'}
          </button>
          <span style={{ fontSize: '0.85rem', color: '#78716C', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="oe-pull-list-body">
          {/* Laura's 4 Open Parameter Inputs */}
          <div className="oe-pull-list-stepper-bar">
            <div className="oe-stepper-group">
              <label>TOTAL COUNT</label>
              <div className="oe-stepper-controls">
                <button type="button" onClick={() => updateCounts(totalBalloons - 10, Math.round((totalBalloons - 10) * 0.3), Math.round((totalBalloons - 10) * 0.5))}>-</button>
                <input
                  type="number"
                  value={totalBalloons}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateCounts(val, Math.round(val * 0.3), Math.round(val * 0.5));
                  }}
                />
                <button type="button" onClick={() => updateCounts(totalBalloons + 10, Math.round((totalBalloons + 10) * 0.3), Math.round((totalBalloons + 10) * 0.5))}>+</button>
              </div>
            </div>

            <div className="oe-stepper-group">
              <label>5&quot; SMALL ({smallCount})</label>
              <div className="oe-stepper-controls">
                <button type="button" onClick={() => updateCounts(totalBalloons, smallCount - 5, medCount)}>-</button>
                <input
                  type="number"
                  value={smallCount}
                  onChange={(e) => updateCounts(totalBalloons, parseInt(e.target.value) || 0, medCount)}
                />
                <button type="button" onClick={() => updateCounts(totalBalloons, smallCount + 5, medCount)}>+</button>
              </div>
            </div>

            <div className="oe-stepper-group">
              <label>11&quot; MED ({medCount})</label>
              <div className="oe-stepper-controls">
                <button type="button" onClick={() => updateCounts(totalBalloons, smallCount, medCount - 5)}>-</button>
                <input
                  type="number"
                  value={medCount}
                  onChange={(e) => updateCounts(totalBalloons, smallCount, parseInt(e.target.value) || 0)}
                />
                <button type="button" onClick={() => updateCounts(totalBalloons, smallCount, medCount + 5)}>+</button>
              </div>
            </div>

            <div className="oe-stepper-group">
              <label>16/24&quot; LARGE</label>
              <div className="oe-stepper-controls locked">
                <input type="number" value={largeCount} readOnly />
                <span className="oe-locked-hint">auto-bal</span>
              </div>
            </div>
          </div>

          {/* Itemized Table across Palette Shades */}
          <div className="oe-pull-list-table-wrap">
            <table className="oe-pull-list-table">
              <thead>
                <tr>
                  <th>PALETTE COLOUR</th>
                  <th style={{ textAlign: 'center' }}>5&quot; SMALL</th>
                  <th style={{ textAlign: 'center' }}>11&quot; MEDIUM</th>
                  <th style={{ textAlign: 'center' }}>16/24&quot; LARGE</th>
                  <th style={{ textAlign: 'right' }}>{showBuffer ? 'PREP (+8%)' : 'EXACT TOTAL'}</th>
                  <th style={{ textAlign: 'right' }}>TRADE PACKS</th>
                </tr>
              </thead>
              <tbody>
                {pullList.colorBreakdown.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="oe-pull-swatch-dot" style={{ background: row.hex }} />
                        <strong style={{ fontSize: '0.78rem', color: '#1C1E1B' }}>{row.color}</strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                      {showBuffer ? row.smallBuffer : row.small}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                      {showBuffer ? row.medBuffer : row.med}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                      {showBuffer ? row.largeBuffer : row.large}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#4A5840' }}>
                      {showBuffer ? row.totalBuffer : row.total}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.68rem', color: '#78716C' }}>
                      {row.bagsToOrder.med}x 11&quot; · {row.bagsToOrder.small}x 5&quot;
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>TOTAL TO INFLATE</strong></td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {showBuffer ? Math.ceil(smallCount * 1.08) : smallCount}
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {showBuffer ? Math.ceil(medCount * 1.08) : medCount}
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                    {showBuffer ? Math.ceil(largeCount * 1.08) : largeCount}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#C5A059' }}>
                    {showBuffer ? pullList.summary.totalWithBuffer : totalBalloons}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#1C1E1B' }}>
                    {pullList.colorBreakdown.reduce((sum, r) => sum + r.bagsToOrder.small + r.bagsToOrder.med + r.bagsToOrder.large, 0)} Trade Bags
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * MASTER ORDERS & STOCK DASHBOARD (Full Mockup Implementation)
 * ---------------------------------------------------------------------------
 */
/**
 * Turns a stored enquiry into one line per chosen item for the staff dossier.
 * Uses the item ids saved with newer enquiries and falls back to the plain-text
 * names saved with older ones; never invents an item the customer did not pick.
 */
export function buildDossierOrderLines(cfg, steps = [], digitOptions = []) {
  const items = steps.flatMap(st => st.items || []);
  const byId = id => (id ? items.find(it => it.id === id) : null);
  const lines = [];

  const backdrop = byId(cfg.backdropId);
  const board = cfg.boardCustomization;
  const boardDetail = board && board.text
    ? `Wording: "${board.text}"${board.colorName ? ` · ${board.colorName} board` : ''}${board.vinylColor ? ` · ${board.vinylColor} vinyl` : ''}`
    : '';
  if (backdrop) {
    const size = backdrop.hasSizeTier && cfg.shimmerSize && cfg.shimmerSize !== 'N/A' ? ` (${cfg.shimmerSize})` : '';
    lines.push({ key: 'backdrop', sku: backdrop.sku, title: backdrop.name + size, hire: !!backdrop.hireOnly, image: backdrop.image, detail: boardDetail });
  } else if (cfg.backdrop && !/^skipped/i.test(cfg.backdrop) && cfg.backdrop !== 'None') {
    lines.push({ key: 'backdrop', title: cfg.backdrop, detail: boardDetail });
  }

  const garland = byId(cfg.balloonId);
  if (garland) {
    lines.push({ key: 'balloons', sku: garland.sku, title: garland.name, hire: false, image: garland.image });
  } else if (cfg.balloonLayout && !/^skipped/i.test(cfg.balloonLayout) && cfg.balloonLayout !== 'None') {
    lines.push({ key: 'balloons', title: cfg.balloonLayout });
  }

  const digit = cfg.digitId ? digitOptions.find(d => d.id === cfg.digitId) : null;
  if (digit) {
    lines.push({ key: 'digits', sku: digit.sku, title: digit.name, hire: false, image: digit.image, digits: cfg.digitText || '' });
  } else if (cfg.digitsOrLetters && cfg.digitsOrLetters !== 'None') {
    lines.push({ key: 'digits', title: cfg.digitsOrLetters });
  }

  const extraIds = cfg.extraIds || [];
  if (extraIds.length > 0) {
    extraIds.forEach(id => {
      const extra = byId(id);
      if (!extra) return;
      let detail = '';
      if (id === 'neon-sign' && cfg.neonPhrase) detail = `Wording: "${cfg.neonPhrase}"`;
      if (id === 'bubble-balloon' && cfg.bubbleText) detail = `Wording: "${cfg.bubbleText}"`;
      lines.push({ key: `extra-${id}`, sku: extra.sku, title: extra.name, hire: !!extra.hireOnly, image: extra.image, detail });
    });
  } else {
    (cfg.extras || []).forEach((label, i) => lines.push({ key: `extra-${i}`, title: label }));
  }

  return lines;
}
