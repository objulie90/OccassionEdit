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

// Balloon codes follow Oliver's pattern: BALL_size_colour, e.g. BALL_Sm_003 is a small Chrome Gold
const SIZES = [
  { key: 'small', code: 'Sm', words: 'small (5")' },
  { key: 'med', code: 'Md', words: 'medium (11")' },
  { key: 'large', code: 'Lg', words: 'large (18")' }
];

/**
 * The balloons to prepare for a garland, in plain words, spares included.
 * Laura can change the total; the sizes keep the garland's own mix.
 */
export function WorkshopBalloonPullList({ garland, colours }) {
  const recipe = garland?.recipe || {};
  const baseTotal = recipe.defaultTotal || 0;
  const [total, setTotal] = useState(baseTotal);

  if (!garland) return null;

  const share = (n) => (baseTotal ? Math.round((n / baseTotal) * total) : 0);
  const small = share(recipe.defaultSmall || 0);
  const med = share(recipe.defaultMed || 0);
  const pull = calculateBalloonPullList(garland, colours || [], { total, small, med, large: Math.max(0, total - small - med), bufferPercent: 8 });
  const withSpares = pull.summary.totalWithBuffer;

  return (
    <div className="st-pull">
      <p className="st-pull-summary">
        About <strong>{withSpares} balloons</strong> for the {garland.name.toLowerCase()}, including a few spares in case of pops.
      </p>
      <ul className="st-pull-list">
        {pull.colorBreakdown.map((row, i) => {
          const colour = (colours || [])[i] || {};
          const counts = { small: row.smallBuffer, med: row.medBuffer, large: row.largeBuffer };
          return (
            <li key={row.id} className="st-pull-row">
              <BalloonGraphic hex={row.hex} finish={colour.finish} size={22} />
              <span className="st-pull-colour">{row.color}</span>
              <span className="st-pull-counts">
                {SIZES.filter(sz => counts[sz.key] > 0).map(sz => (
                  <span key={sz.key}>
                    {counts[sz.key]} {sz.words}
                    {colour.code && <span className="st-code"> BALL_{sz.code}_{colour.code}</span>}
                  </span>
                ))}
              </span>
              <span className="st-pull-total">{row.totalBuffer}</span>
            </li>
          );
        })}
      </ul>
      <div className="st-field st-pull-adjust">
        <label htmlFor={`st-pull-total-${garland.id}`}>Making it fuller or smaller? Change the total (before spares)</label>
        <input id={`st-pull-total-${garland.id}`} type="number" inputMode="numeric" min="10" step="10" value={total} onChange={e => setTotal(Math.max(10, parseInt(e.target.value, 10) || 10))} />
      </div>
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
      if (id === 'cut-outs' && cfg.cutoutTheme) detail = `Theme: ${cfg.cutoutTheme}`;
      lines.push({ key: `extra-${id}`, sku: extra.sku, title: extra.name, hire: !!extra.hireOnly, image: extra.image, detail });
    });
  } else {
    (cfg.extras || []).forEach((label, i) => lines.push({ key: `extra-${i}`, title: label }));
  }

  return lines;
}
