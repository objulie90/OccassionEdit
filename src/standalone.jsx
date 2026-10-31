import {
  INITIAL_BALLOON_COLOURS,
  INITIAL_CURATED_PALETTES,
  INITIAL_DIGIT_LETTER_OPTIONS,
  CONFIGURATOR_STEPS,
  INITIAL_INSPIRATION_SLIDES,
  FULL_CSV_CATALOG,
  INITIAL_OFFERS,
  INITIAL_SEO_SETTINGS,
  INITIAL_FAQS,
  INITIAL_DELIVERY_CONFIG,
  calculateDistanceToBottesford,
  getDeliveryZoneForMileage,
  getUkTaxYear,
  calculateLookRecipePrice,
  deriveUnifiedCatalog,
  applyCornerBannerDiscount,
  generateLookDescription,
  calculateBalloonPullList
} from '/src/data/catalogData.js?v=11';
import {
  LEGAL_DOCUMENTS
} from '/src/data/legalDocuments.js?v=2';

const { useState, useEffect, useRef, useMemo } = React;

/**
 * 3D-shaded individual balloon SVG for palette cards
 */
function BalloonGraphic({ hex, size = 44 }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 60 76"
      aria-hidden="true"
      className="oe-balloon-svg-icon"
    >
      <path d="M 30 58 Q 32 67 28 75" stroke="rgba(28,30,27,0.4)" strokeWidth="1.2" fill="none" />
      <polygon points="27,56 33,56 30,60" fill={hex} />
      <ellipse cx="30" cy="28" rx="23" ry="27" fill={hex} stroke="rgba(28,30,27,0.18)" strokeWidth="1" />
      <ellipse cx="21" cy="18" rx="6.5" ry="10" fill="rgba(255,255,255,0.42)" transform="rotate(-22 21 18)" />
    </svg>
  );
}

/**
 * ProductPreview Component — Left Panel Live Canvas
 */
function ProductPreview({
  selection,
  selectedColours,
  shimmerSize,
  digitSelection,
  digitText,
  boardCustomization,
  neonPhrase,
  bubbleText,
  onDropItem,
  isDragOver,
  setIsDragOver
}) {
  const backdrop = selection.backdrop;
  const balloons = selection.balloons;
  const extras = selection.extras || [];

  const paletteHexes = selectedColours.length > 0
    ? selectedColours.map(c => c.hex)
    : ['#7A8C68', '#F5F2EB', '#C5A059', '#E6B8AF', '#B8A693'];

  const getColour = (index) => paletteHexes[index % paletteHexes.length];

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (payload && payload.item && payload.stepId) {
        onDropItem(payload.stepId, payload.item);
      }
    } catch (err) {
      // ignore invalid drag
    }
  };

  const renderBalloonCluster = (cx, cy, scale = 1, seed = 0) => {
    const bubbles = [
      { dx: 0, dy: 0, r: 26, c: getColour(seed + 0) },
      { dx: -22, dy: 14, r: 20, c: getColour(seed + 1) },
      { dx: 20, dy: 12, r: 18, c: getColour(seed + 2) },
      { dx: -10, dy: -22, r: 19, c: getColour(seed + 3) },
      { dx: 16, dy: -18, r: 15, c: getColour(seed + 4) },
      { dx: -28, dy: -6, r: 13, c: getColour(seed + 2) },
      { dx: 6, dy: 24, r: 14, c: getColour(seed + 1) },
    ];
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`} key={`cluster-${cx}-${cy}`}>
        {bubbles.map((b, i) => (
          <g key={i}>
            <circle cx={b.dx} cy={b.dy} r={b.r} fill={b.c} stroke="rgba(28,30,27,0.18)" strokeWidth="0.9" />
            <ellipse
              cx={b.dx - b.r * 0.28}
              cy={b.dy - b.r * 0.28}
              rx={b.r * 0.22}
              ry={b.r * 0.14}
              fill="rgba(255,255,255,0.48)"
              transform={`rotate(-30 ${b.dx - b.r * 0.28} ${b.dy - b.r * 0.28})`}
            />
          </g>
        ))}
      </g>
    );
  };

  /**
   * Renders a delicate satin ribbon bow matching the curated studio number stack photos
   */
  const renderSatinBow = (bx, by, scale = 1, color = '#F7F3EB') => (
    <g transform={`translate(${bx}, ${by}) scale(${scale})`}>
      <path
        d="M 0 0 C -14 -12 -22 -2 -10 6 C -4 9 -2 3 0 0 Z"
        fill={color}
        stroke="rgba(140,115,75,0.35)"
        strokeWidth="0.8"
      />
      <path
        d="M 0 0 C 14 -12 22 -2 10 6 C 4 9 2 3 0 0 Z"
        fill={color}
        stroke="rgba(140,115,75,0.35)"
        strokeWidth="0.8"
      />
      <path
        d="M -2 2 Q -9 18 -14 28"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 2 2 Q 9 18 13 27"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="0" cy="0.5" rx="3.2" ry="2.6" fill="#E5D9C5" stroke="rgba(140,115,75,0.4)" strokeWidth="0.7" />
    </g>
  );

  /**
   * Renders an individual 3D inflated metallic foil balloon character (digit or letter)
   * with heat-sealed foil seam rim, metallic gradient body, crinkled crease specular shine,
   * top hanging tabs, and bottom inflation valve to match the curated AI studio photos.
   */
  const renderFoilBalloonChar = ({
    char,
    x,
    y,
    fontSize = 68,
    rotate = 0,
    variant = 'gold',
    showTopTabs = true
  }) => {
    const bodyGrad = variant === 'taupe' ? 'url(#foilTaupeBody)' : 'url(#foilGoldBody)';
    const rimGrad = variant === 'taupe' ? 'url(#foilTaupeRim)' : 'url(#foilGoldRim)';
    const tabColor = variant === 'taupe' ? '#B99E82' : '#D9B668';
    const halfW = fontSize * 0.28;
    const topY = -fontSize * 0.74;

    return (
      <g
        key={`foil-${char}-${x}-${y}`}
        transform={`translate(${x}, ${y}) rotate(${rotate})`}
        filter="url(#foilBalloon3D)"
      >
        {/* Top Heat-Sealed Foil Hanging Tabs */}
        {showTopTabs && (
          <g>
            <rect
              x={-halfW - 3}
              y={topY - 5}
              width="6"
              height="7"
              rx="1.2"
              fill={tabColor}
              stroke="#7A5B21"
              strokeWidth="0.7"
            />
            <circle cx={-halfW} cy={topY - 2.5} r="1.1" fill="#F7F4EE" />
            <rect
              x={halfW - 3}
              y={topY - 5}
              width="6"
              height="7"
              rx="1.2"
              fill={tabColor}
              stroke="#7A5B21"
              strokeWidth="0.7"
            />
            <circle cx={halfW} cy={topY - 2.5} r="1.1" fill="#F7F4EE" />
          </g>
        )}

        {/* Bottom Foil Inflation Valve Tail */}
        <polygon
          points="-4,2 4,2 6,11 -6,11"
          fill={tabColor}
          stroke="#7A5B21"
          strokeWidth="0.8"
        />
        <rect x="-2.5" y="1.5" width="5" height="3" rx="1" fill="#FFF8E1" opacity="0.75" />

        {/* Layer 1: Outer Heat-Sealed Foil Seam Edge (Thick rounded metallic rim) */}
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill={rimGrad}
          stroke={rimGrad}
          strokeWidth={fontSize * 0.22}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
        >
          {char}
        </text>

        {/* Layer 2: Plump 3D Metallic Foil Pillow Body */}
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill={bodyGrad}
          stroke={bodyGrad}
          strokeWidth={fontSize * 0.13}
          strokeLinejoin="round"
          strokeLinecap="round"
          paintOrder="stroke fill"
        >
          {char}
        </text>

        {/* Layer 3: Inner Warm Metallic Core Depth */}
        <text
          x="0"
          y="-0.5"
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill={bodyGrad}
          stroke="rgba(120, 86, 26, 0.35)"
          strokeWidth={fontSize * 0.03}
          strokeLinejoin="round"
        >
          {char}
        </text>

        {/* Layer 4: Crinkled Foil Specular Highlight (Simulates studio ring-light reflection on curved mylar) */}
        <text
          x={-fontSize * 0.028}
          y={-fontSize * 0.032}
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontWeight="900"
          fontSize={fontSize}
          fill="none"
          stroke="rgba(255, 253, 244, 0.82)"
          strokeWidth={Math.max(1.6, fontSize * 0.035)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${fontSize * 0.16} ${fontSize * 0.11} ${fontSize * 0.06} ${fontSize * 0.14}`}
        >
          {char}
        </text>
      </g>
    );
  };

  const isPaletteOnlyPreview =
    !backdrop &&
    !balloons &&
    (!digitSelection || digitSelection.type === 'none') &&
    extras.length === 0;

  const flowerCoords = balloons
    ? [
        { x: 170, y: 175 },
        { x: 145, y: 295 },
        { x: 160, y: 385 }
      ]
    : [
        { x: 220, y: 395 },
        { x: 250, y: 388 },
        { x: 280, y: 395 }
      ];

  const cleanText = (digitText || digitSelection?.defaultText || '21')
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 8);

  return (
    <div
      className={`rpc-preview-stage ${isDragOver ? 'rpc-preview-dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <svg viewBox="0 0 500 500" className="rpc-preview-svg" role="img" aria-label="Live display preview">
        <defs>
          <radialGradient id="studioWall" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#F7F4EE" />
            <stop offset="100%" stopColor="#E5DFD3" />
          </radialGradient>
          <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#1C1E1B" floodOpacity="0.18" />
          </filter>

          {/* Realistic 3D Champagne Gold Mylar Foil Gradients */}
          <linearGradient id="foilGoldBody" x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#FFFDF5" />
            <stop offset="18%" stopColor="#F6E2AE" />
            <stop offset="40%" stopColor="#D6AF60" />
            <stop offset="56%" stopColor="#FFF3D1" />
            <stop offset="76%" stopColor="#B88933" />
            <stop offset="100%" stopColor="#E8C97E" />
          </linearGradient>

          <linearGradient id="foilGoldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9C7123" />
            <stop offset="35%" stopColor="#E5C375" />
            <stop offset="70%" stopColor="#7E5815" />
            <stop offset="100%" stopColor="#C9A14B" />
          </linearGradient>

          {/* Realistic 3D Warm Taupe / Champagne Bronze Foil Gradients (Matching pl-stack-30.jpg) */}
          <linearGradient id="foilTaupeBody" x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#FAF3EB" />
            <stop offset="22%" stopColor="#DFCBB8" />
            <stop offset="48%" stopColor="#AC8E73" />
            <stop offset="65%" stopColor="#EFE3D6" />
            <stop offset="85%" stopColor="#7C5E44" />
            <stop offset="100%" stopColor="#C8B098" />
          </linearGradient>

          <linearGradient id="foilTaupeRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B5038" />
            <stop offset="45%" stopColor="#C5AC94" />
            <stop offset="80%" stopColor="#543D28" />
            <stop offset="100%" stopColor="#9E8268" />
          </linearGradient>

          <filter id="foilBalloon3D" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#1E1B16" floodOpacity="0.28" />
          </filter>
        </defs>

        <rect x="0" y="0" width="500" height="425" fill="url(#studioWall)" />
        <rect x="0" y="425" width="500" height="75" fill="#DDD5C7" />
        <line x1="0" y1="425" x2="500" y2="425" stroke="#C5BCAE" strokeWidth="1.5" />

        {isPaletteOnlyPreview && (
          <g filter="url(#softShadow)">
            {[
              { cx: 195, cy: 190, rx: 46, ry: 54, idx: 0 },
              { cx: 305, cy: 190, rx: 46, ry: 54, idx: 1 },
              { cx: 250, cy: 145, rx: 50, ry: 58, idx: 2 },
              { cx: 165, cy: 265, rx: 44, ry: 50, idx: 3 },
              { cx: 335, cy: 265, rx: 44, ry: 50, idx: 4 },
              { cx: 250, cy: 235, rx: 48, ry: 55, idx: 0 }
            ].map((b, i) => (
              <g key={i}>
                <path d={`M ${b.cx} ${b.cy + b.ry} Q 250 365 250 415`} stroke="#7A756C" strokeWidth="1.4" fill="none" />
                <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={getColour(b.idx)} stroke="rgba(28,30,27,0.2)" strokeWidth="1.2" />
                <ellipse
                  cx={b.cx - b.rx * 0.3}
                  cy={b.cy - b.ry * 0.3}
                  rx={b.rx * 0.24}
                  ry={b.ry * 0.16}
                  fill="rgba(255,255,255,0.45)"
                  transform={`rotate(-25 ${b.cx - b.rx * 0.3} ${b.cy - b.ry * 0.3})`}
                />
              </g>
            ))}
            <ellipse cx="250" cy="418" rx="28" ry="8" fill="#C5A059" />
          </g>
        )}

        {backdrop && backdrop.backdropType === 'arch-board' && (
          <g filter="url(#softShadow)">
            <path
              d="M 155 425 L 155 175 A 95 95 0 0 1 345 175 L 345 425 Z"
              fill={boardCustomization?.color || backdrop.surfaceColor || '#F5EFEB'}
              stroke="#C9B59C"
              strokeWidth="2"
            />
            <path d="M 225 425 L 225 225 A 75 75 0 0 1 375 225 L 375 425 Z" fill="#EFECE6" stroke="#D5CEC2" strokeWidth="1.5" />
            {boardCustomization?.text && (
              <text
                x="250"
                y="272"
                textAnchor="middle"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontStyle="italic"
                fontWeight="700"
                fontSize={boardCustomization.text.length > 22 ? 14 : boardCustomization.text.length > 14 ? 17 : 21}
                fill={
                  boardCustomization.vinylColor === 'white'
                    ? '#FFFFFF'
                    : boardCustomization.vinylColor === 'black'
                    ? '#1C1E1B'
                    : boardCustomization.vinylColor === 'rose-gold'
                    ? '#B76E79'
                    : '#C5A059'
                }
                style={{
                  letterSpacing: '0.04em',
                  filter: boardCustomization.vinylColor === 'white' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' : 'none'
                }}
              >
                {boardCustomization.text}
              </text>
            )}
          </g>
        )}

        {backdrop && backdrop.backdropType === 'shimmer-wall' && (
          <g filter="url(#softShadow)">
            {(() => {
              const isLarge = shimmerSize === 'large';
              const w = isLarge ? 256 : 212;
              const h = isLarge ? 305 : 280;
              const x = (500 - w) / 2;
              const y = 425 - h;
              const cols = isLarge ? 16 : 13;
              const rows = 18;
              const cellW = w / cols;
              const cellH = h / rows;
              const tiles = [];
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  const opacity = 0.75 + ((r * 7 + c * 13) % 25) / 100;
                  tiles.push(
                    <rect
                      key={`${r}-${c}`}
                      x={x + c * cellW + 0.6}
                      y={y + r * cellH + 0.6}
                      width={cellW - 1.2}
                      height={cellH - 1.2}
                      fill={backdrop.surfaceColor}
                      opacity={opacity}
                      rx="1"
                    />
                  );
                }
              }
              return (
                <g>
                  <rect x={x} y={y} width={w} height={h} fill="#2A2621" rx="3" />
                  {tiles}
                </g>
              );
            })()}
          </g>
        )}

        {backdrop && backdrop.backdropType === 'hoop' && (
          <g filter="url(#softShadow)">
            <circle cx="250" cy="260" r="135" fill="none" stroke="#C5A059" strokeWidth="6" />
            <line x1="210" y1="395" x2="195" y2="425" stroke="#C5A059" strokeWidth="4" />
            <line x1="290" y1="395" x2="305" y2="425" stroke="#C5A059" strokeWidth="4" />
            <line x1="175" y1="425" x2="325" y2="425" stroke="#C5A059" strokeWidth="5" />
          </g>
        )}

        {backdrop && backdrop.backdropType === 'easel' && (
          <g filter="url(#softShadow)">
            <line x1="250" y1="115" x2="185" y2="425" stroke="#9C7E5E" strokeWidth="6" strokeLinecap="round" />
            <line x1="250" y1="115" x2="315" y2="425" stroke="#9C7E5E" strokeWidth="6" strokeLinecap="round" />
            <line x1="250" y1="115" x2="250" y2="425" stroke="#806549" strokeWidth="5" strokeLinecap="round" />
            <rect x="180" y="150" width="140" height="195" rx="70" fill="#FAF8F5" stroke="#C9C1B4" strokeWidth="2" />
            <text x="250" y="235" textAnchor="middle" fill="#232620" fontFamily="Cormorant Garamond, serif" fontSize="22" fontStyle="italic" fontWeight="600">
              Welcome
            </text>
            <text x="250" y="258" textAnchor="middle" fill="#4A5240" fontFamily="Montserrat, sans-serif" fontSize="8" fontWeight="600" letterSpacing="2.5">
              THE OCCASION EDIT
            </text>
          </g>
        )}

        {balloons && balloons.layoutType === 'side-7ft' && (
          <g filter="url(#softShadow)">
            {renderBalloonCluster(148, 390, 1.15, 0)}
            {renderBalloonCluster(140, 325, 1.02, 1)}
            {renderBalloonCluster(146, 260, 1.08, 2)}
            {renderBalloonCluster(155, 195, 0.98, 3)}
            {renderBalloonCluster(185, 145, 1.05, 4)}
            {renderBalloonCluster(240, 128, 0.92, 1)}
          </g>
        )}

        {balloons && balloons.layoutType === 'clusters' && (
          <g filter="url(#softShadow)">
            {renderBalloonCluster(162, 152, 1.12, 0)}
            {renderBalloonCluster(212, 135, 0.88, 2)}
            {renderBalloonCluster(345, 360, 1.15, 1)}
            {renderBalloonCluster(315, 398, 0.9, 3)}
          </g>
        )}

        {balloons && balloons.layoutType === 'full-surround' && (
          <g filter="url(#softShadow)">
            {renderBalloonCluster(138, 395, 1.15, 0)}
            {renderBalloonCluster(132, 330, 1.05, 1)}
            {renderBalloonCluster(138, 260, 1.0, 2)}
            {renderBalloonCluster(148, 190, 1.08, 3)}
            {renderBalloonCluster(185, 138, 1.05, 4)}
            {renderBalloonCluster(250, 122, 1.1, 0)}
            {renderBalloonCluster(315, 138, 1.0, 2)}
            {renderBalloonCluster(355, 190, 1.05, 3)}
            {renderBalloonCluster(362, 260, 0.95, 4)}
            {renderBalloonCluster(360, 335, 1.08, 1)}
            {renderBalloonCluster(355, 398, 1.12, 2)}
          </g>
        )}

        {/* 1. HELIUM FOIL NUMBERS + 2 MATCHING BOUQUET CLUSTERS (Replicating pl-bubble-helium.jpg) */}
        {digitSelection && digitSelection.type === 'digits' && (() => {
          const chars = (cleanText.slice(0, 3) || '21').split('');
          const fontSize = chars.length > 2 ? 56 : 74;
          const spacing = chars.length > 2 ? 42 : 54;
          const centerX = 408;
          const baseY = 222;

          return (
            <g filter="url(#softShadow)">
              {/* Curling Gold Satin Ribbons down to weighted floor bases */}
              {chars.map((_, idx) => {
                const cx = centerX + (idx - (chars.length - 1) / 2) * spacing;
                return (
                  <path
                    key={`rib-${idx}`}
                    d={`M ${cx} ${baseY + 8} Q ${cx - 8} 320 ${centerX} 422`}
                    stroke="#C5A059"
                    strokeWidth="1.6"
                    fill="none"
                  />
                );
              })}

              {/* Flanking Helium Bouquet Clusters with Confetti Orb & Satin Bow */}
              {renderBalloonCluster(378, 315, 0.52, 0)}
              {renderBalloonCluster(436, 338, 0.5, 2)}
              {/* Clear Confetti Accent Balloon in Bouquet */}
              <circle cx="408" cy="288" r="16" fill="rgba(255,255,255,0.62)" stroke="#D6AF60" strokeWidth="1.2" />
              <circle cx="403" cy="285" r="2.2" fill="#D6AF60" />
              <circle cx="412" cy="292" r="2" fill="#D6AF60" />
              <circle cx="409" cy="281" r="1.8" fill={getColour(0)} />
              <circle cx="402" cy="293" r="1.8" fill={getColour(1)} />

              {/* Foil Balloon Weights on Floor */}
              <ellipse cx={centerX} cy="423" rx="18" ry="5.5" fill="url(#foilGoldBody)" stroke="#8C6722" strokeWidth="1" />

              {/* 3D Inflated Metallic Foil Number Balloons */}
              {chars.map((ch, idx) => {
                const cx = centerX + (idx - (chars.length - 1) / 2) * spacing;
                const tilt = idx % 2 === 0 ? -3 : 3;
                return (
                  <g key={`d-${idx}`}>
                    {renderFoilBalloonChar({
                      char: ch,
                      x: cx,
                      y: baseY,
                      fontSize,
                      rotate: tilt,
                      variant: 'gold',
                      showTopTabs: true
                    })}
                    {renderSatinBow(cx, baseY + 6, 0.65, '#FAF6F0')}
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* 2. FREESTANDING NUMBER STACKS ON ORGANIC LATEX BASE + SATIN BOWS (Replicating pl-stack-30.jpg) */}
        {digitSelection && digitSelection.type === 'stack' && (() => {
          const chars = (cleanText.slice(0, 2) || '30').split('');
          const stackX = 396;
          const spacing = chars.length > 1 ? 52 : 0;

          return (
            <g filter="url(#softShadow)">
              {/* Tier 1: Wide Organic Latex Base Cluster on Floor */}
              {renderBalloonCluster(stackX - 18, 398, 0.72, 0)}
              {renderBalloonCluster(stackX + 18, 398, 0.72, 1)}
              {/* Tier 2: Mid-Section Sculpted Latex Cluster */}
              {renderBalloonCluster(stackX, 356, 0.66, 2)}
              {/* Tier 3: Mini 5-inch Collar Accent Balloons right beneath Foil Numbers */}
              <circle cx={stackX - 24} cy="322" r="13" fill={getColour(0)} stroke="rgba(28,30,27,0.15)" strokeWidth="0.8" />
              <circle cx={stackX} cy="325" r="14" fill={getColour(1)} stroke="rgba(28,30,27,0.15)" strokeWidth="0.8" />
              <circle cx={stackX + 24} cy="322" r="13" fill={getColour(2)} stroke="rgba(28,30,27,0.15)" strokeWidth="0.8" />
              <circle cx={stackX - 11} cy="316" r="11" fill={getColour(3)} stroke="rgba(28,30,27,0.15)" strokeWidth="0.8" />
              <circle cx={stackX + 12} cy="316" r="11" fill={getColour(4)} stroke="rgba(28,30,27,0.15)" strokeWidth="0.8" />

              {/* Plump 34" 3D Metallic Champagne & Taupe Foil Digits Perched on Top */}
              {chars.map((ch, idx) => {
                const cx = stackX + (idx - (chars.length - 1) / 2) * spacing;
                const tilt = chars.length > 1 ? (idx === 0 ? -4 : 4) : 0;
                const variant = idx === 1 ? 'taupe' : 'gold';
                return (
                  <g key={`st-${idx}`}>
                    {renderFoilBalloonChar({
                      char: ch,
                      x: cx,
                      y: 308,
                      fontSize: 78,
                      rotate: tilt,
                      variant,
                      showTopTabs: true
                    })}
                    {/* Signature Satin Ribbon Bows on Collar & Stack Base (as in pl-stack-30.jpg) */}
                    {renderSatinBow(cx, 314, 0.78, '#FAF5EE')}
                  </g>
                );
              })}
              {renderSatinBow(stackX - 22, 368, 0.7, '#F5EFE6')}
              {renderSatinBow(stackX + 24, 374, 0.7, '#F5EFE6')}
            </g>
          );
        })()}

        {/* 3. CUSTOM 16" 3D METALLIC FOIL LETTER BALLOON BANNER (Individual hanging 3D foil letters) */}
        {digitSelection && digitSelection.type === 'letters' && (() => {
          const chars = (cleanText || 'PARTY').split('');
          const count = chars.length;
          const fontSize = count > 6 ? 38 : count > 4 ? 44 : 50;
          const stepX = Math.min(44, 290 / Math.max(1, count));
          const startX = 250 - ((count - 1) * stepX) / 2;

          return (
            <g filter="url(#softShadow)">
              {/* Satin Garland Suspension Cord */}
              <path
                d="M 88 54 Q 250 86 412 54"
                stroke="#C5A059"
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="4 2"
              />
              {/* End Satin Bows on Garland Cord */}
              {renderSatinBow(92, 55, 0.62, '#FAF6F0')}
              {renderSatinBow(408, 55, 0.62, '#FAF6F0')}

              {/* Individual 3D Inflated Foil Letter Balloons */}
              {chars.map((ch, idx) => {
                const norm = count > 1 ? idx / (count - 1) - 0.5 : 0;
                const x = startX + idx * stepX;
                /* Follow the gentle catenary curve of the hanging cord */
                const curveY = 92 - Math.pow(norm * 2, 2) * 14;
                const rotate = norm * 14;
                return renderFoilBalloonChar({
                  char: ch,
                  x,
                  y: curveY,
                  fontSize,
                  rotate,
                  variant: 'gold',
                  showTopTabs: true
                });
              })}
            </g>
          );
        })()}

        {extras.some(e => e.extraType === 'flowers') && (
          <g filter="url(#softShadow)">
            {flowerCoords.map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x - 10} cy={pt.y} r="7" fill="#5D6B53" />
                <circle cx={pt.x + 10} cy={pt.y - 6} r="7" fill="#5D6B53" />
                <circle cx={pt.x} cy={pt.y} r="9" fill="#FFFDF9" stroke="#C5BCAE" strokeWidth="1" />
                <circle cx={pt.x + 9} cy={pt.y + 6} r="7" fill="#E6B8AF" stroke="#C5BCAE" strokeWidth="0.8" />
              </g>
            ))}
          </g>
        )}

        {extras.some(e => e.extraType === 'neon') && (
          <g filter="url(#softShadow)">
            <rect x="175" y="196" width="168" height="78" rx="12" fill="rgba(28, 30, 27, 0.88)" stroke="#C5A059" strokeWidth="1.5" />
            <text
              x="259"
              y="244"
              textAnchor="middle"
              fill="#FFF9D2"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontStyle="italic"
              fontWeight="600"
              fontSize={(neonPhrase || 'Happy Birthday').length > 14 ? 20 : 25}
              style={{ filter: 'drop-shadow(0 0 6px rgba(255, 249, 210, 0.75))' }}
            >
              {neonPhrase || 'Happy Birthday'}
            </text>
          </g>
        )}

        {extras.some(e => e.extraType === 'boxes') && (
          <g filter="url(#softShadow)">
            {['B', 'A', 'B', 'Y'].map((letter, idx) => {
              const yPos = 388 - idx * 36;
              return (
                <g key={idx}>
                  <rect x="68" y={yPos} width="36" height="36" fill="#FAF8F5" stroke="#7A8C68" strokeWidth="1.8" />
                  <text x="86" y={yPos + 25} textAnchor="middle" fill="#232620" fontFamily="Cormorant Garamond, serif" fontSize="20" fontWeight="700">
                    {letter}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {extras.some(e => e.extraType === 'bubble') && (
          <g filter="url(#softShadow)">
            <line x1="92" y1="215" x2="92" y2="425" stroke="#7A756C" strokeWidth="1.2" />
            <circle cx="92" cy="180" r="34" fill="rgba(255,255,255,0.55)" stroke="#7A8C68" strokeWidth="1.8" />
            <circle cx="82" cy="186" r="10" fill={getColour(0)} />
            <circle cx="100" cy="188" r="9" fill={getColour(1)} />
            <circle cx="92" cy="172" r="10" fill={getColour(2)} />
            {bubbleText && (
              <text x="92" y="182" textAnchor="middle" fill="#1C1E1B" fontFamily="'Cormorant Garamond', Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="8">
                {bubbleText.slice(0, 16)}
              </text>
            )}
          </g>
        )}

        {extras.some(e => e.extraType === 'cutouts') && (
          <g filter="url(#softShadow)">
            <path d="M 285 425 L 285 330 C 285 298 340 298 340 330 L 340 425 Z" fill="#FAF8F5" stroke="#232620" strokeWidth="1.8" />
            <text x="312" y="372" textAnchor="middle" fill="#232620" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontWeight="700" fontSize="15">
              Theme
            </text>
            <text x="312" y="390" textAnchor="middle" fill="#232620" fontFamily="Montserrat, sans-serif" fontWeight="600" fontSize="8" letterSpacing="1.2">
              CUT-OUT
            </text>
          </g>
        )}

        {extras.some(e => e.extraType === 'centerpiece') && (
          <g filter="url(#softShadow)">
            <rect x="226" y="375" width="48" height="50" rx="4" fill="#FAF8F5" stroke="#C5A059" strokeWidth="1.5" />
            {renderBalloonCluster(250, 355, 0.45, 2)}
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Layer-1 Client-Side Photo Compressor & EXIF Stripper (Canvas Re-encode to JPEG <=1200px)
 * Pair with Layer-2 POST /api/upload-image binary JPEG validator & APP1/GPS stripper.
 */
function compressAndStripExifJpeg(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(16, width);
        canvas.height = Math.max(16, height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FAF6F0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Captures the live 3D Builder SVG Canvas as a 360x360 JPEG thumbnail data URL
 * so Laura sees the exact visual snapshot of what each client designed.
 */
function captureSvgSnapshotDataUrl(svgElement, size = 360) {
  return new Promise((resolve) => {
    try {
      if (!svgElement) {
        resolve('');
        return;
      }
      const xml = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#F2EDE4';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
      img.src = url;
    } catch (_e) {
      resolve('');
    }
  });
}

/**
 * OWASP Formula-Safe CSV Cell Escaper
 */
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Auto-growing text box (Studio Mode only): always expands to show ALL of its text.
 * Hooks live here (not in EditableText) so the customer-facing branch stays hook-free and identical.
 */
function AutoGrowTextarea({ value, onChange, className = '', placeholder = '', singleLine = false }) {
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
function EditableText({ isEditMode, value, onChange, tag = 'span', multiline = false, className = '', placeholder = '' }) {
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
function PriceInput({ value, onChange, prefix = '£', suffix = '' }) {
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
function EditablePrice({ isEditMode, value, onChange, prefix = '£', suffix = '' }) {
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
const CURATED_BALLOON_SWATCH_TRAY = [
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

function VisualColourPicker({ currentHex, currentName, currentFinish, onSelectColour, onClose }) {
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
            <span className="oe-dock-col-label">STUDIO COLOUR PALETTE</span>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              Select Balloon Shade
            </h3>
          </div>
          <button type="button" onClick={onClose} className="oe-swatch-close-btn">✕</button>
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
            <label className="oe-dock-col-label">COLOUR NAME</label>
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
            ✓ Save Colour
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Diagonal Luxury Corner Ribbon Component
 */
function CornerRibbon({ banner }) {
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
function RibbonPickerPopover({ banner, onChange, onClose }) {
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
        <strong>🎀 Corner Ribbon &amp; Offer</strong>
        <button type="button" onClick={onClose} className="oe-mini-admin-btn">Done ✓</button>
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
          ✕ Remove Ribbon
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

/**
 * ProductBuilder Component — Simple, clean two-panel builder using "Our" wording
 * Now powered by the unified calculateLookRecipePrice engine & Carbon-Copy Studio Edit Mode.
 */
function ProductBuilder({
  steps,
  balloonColours,
  curatedPalettes,
  digitOptions,
  offers,
  externalPreset,
  onClearExternalPreset,
  onSubmitQuote,
  isEditMode,
  onUpdateBuilderItem,
  onToggleBuilderItemStock,
  onUpdateDigitOption,
  onToggleColourStock,
  onUpdateColour,
  onAddNewColour,
  onUploadPhotoForTarget,
  onSaveCurrentSetupAsLook
}) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [paletteMode, setPaletteMode] = useState('curated');
  const [activePaletteId, setActivePaletteId] = useState(curatedPalettes[0].id);
  const [shimmerSize, setShimmerSize] = useState('small');
  const [isDragOver, setIsDragOver] = useState(false);
  const [openRibbonItemId, setOpenRibbonItemId] = useState(null);
  const [editingColourTarget, setEditingColourTarget] = useState(null); // { id, name, hex, finish, isNew }

  const canvasWrapRef = useRef(null);
  const formStartTimeRef = useRef(Date.now());

  const [selectedColours, setSelectedColours] = useState(() =>
    curatedPalettes[0].colourIds
      .map(id => balloonColours.find(c => c.id === id))
      .filter(Boolean)
  );

  const [selection, setSelection] = useState({
    backdrop: steps[1].items[0],
    balloons: steps[2].items[0],
    extras: []
  });

  const [digitSelection, setDigitSelection] = useState(digitOptions[0]);
  const [digitText, setDigitText] = useState('21');

  const [boardCustomization, setBoardCustomization] = useState({
    color: '#F5EFEB',
    colorName: 'Warm Ivory',
    text: "Sophie's 30th",
    vinylColor: 'gold'
  });
  const [neonPhrase, setNeonPhrase] = useState('Happy Birthday');
  const [bubbleText, setBubbleText] = useState('Happy 30th Sophie');

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    accessTime: '10:00',
    venueName: '',
    postcode: '',
    setting: 'indoor',
    notes: ''
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Keep selected items synchronized when prices/stock/banners are edited live in Studio Mode
  useEffect(() => {
    setSelection(prev => {
      const updatedBackdrop = prev.backdrop
        ? steps[1].items.find(i => i.id === prev.backdrop.id) || prev.backdrop
        : null;
      const updatedBalloons = prev.balloons
        ? steps[2].items.find(i => i.id === prev.balloons.id) || prev.balloons
        : null;
      const updatedExtras = (prev.extras || [])
        .map(ex => steps[4].items.find(i => i.id === ex.id) || ex)
        .filter(Boolean);
      return {
        backdrop: updatedBackdrop,
        balloons: updatedBalloons,
        extras: updatedExtras
      };
    });
    setDigitSelection(prev => digitOptions.find(d => d.id === prev?.id) || prev);
  }, [steps, digitOptions]);

  useEffect(() => {
    if (!externalPreset) return;
    if (externalPreset.paletteId) {
      const pal = curatedPalettes.find(p => p.id === externalPreset.paletteId);
      if (pal) {
        setActivePaletteId(pal.id);
        setPaletteMode('curated');
        setSelectedColours(
          pal.colourIds.map(id => balloonColours.find(c => c.id === id)).filter(Boolean)
        );
      }
    }
    if (externalPreset.shimmerSize) {
      setShimmerSize(externalPreset.shimmerSize);
    }
    const backdropItem = externalPreset.backdropId === null
      ? null
      : (steps[1].items.find(i => i.id === externalPreset.backdropId) || null);
    const balloonItem = externalPreset.balloonId === null
      ? null
      : (steps[2].items.find(i => i.id === externalPreset.balloonId) || null);
    const extraItems = (externalPreset.extraIds || [])
      .map(id => steps[4].items.find(i => i.id === id))
      .filter(Boolean);
    setSelection({
      backdrop: backdropItem,
      balloons: balloonItem,
      extras: extraItems
    });
    if (externalPreset.digitOptionId) {
      const dOpt = digitOptions.find(d => d.id === externalPreset.digitOptionId);
      if (dOpt) setDigitSelection(dOpt);
    }
    if (typeof externalPreset.digitText === 'string') {
      setDigitText(externalPreset.digitText);
    }
    onClearExternalPreset();
  }, [externalPreset]);

  const currentStep = steps[activeStepIndex];

  // Unified Recipe Pricing Engine (Matches Lookbook & Corner Banners 100%)
  const currentRecipe = {
    paletteId: activePaletteId,
    backdropId: selection.backdrop?.id || null,
    shimmerSize,
    balloonId: selection.balloons?.id || null,
    digitOptionId: digitSelection?.id || 'digits-none',
    digitText,
    extraIds: (selection.extras || []).map(e => e.id)
  };

  const recipeCalc = calculateLookRecipePrice(
    currentRecipe,
    steps,
    digitOptions,
    balloonColours,
    curatedPalettes
  );
  const lineItems = recipeCalc.lines;
  const subtotal = recipeCalc.finalTotal;

  const calculateFinalTotal = () => {
    if (!appliedOffer) return subtotal;
    if (appliedOffer.discountPercent) {
      return Math.round(subtotal * (1 - appliedOffer.discountPercent / 100));
    }
    if (appliedOffer.discountFixed && (!appliedOffer.minSpend || subtotal >= appliedOffer.minSpend)) {
      return Math.max(0, subtotal - appliedOffer.discountFixed);
    }
    return subtotal;
  };

  const finalTotal = calculateFinalTotal();

  const handleSelectCuratedPalette = (palette) => {
    if (!palette.inStock && !isEditMode) return;
    setActivePaletteId(palette.id);
    const resolved = palette.colourIds
      .map(id => balloonColours.find(c => c.id === id))
      .filter(Boolean);
    setSelectedColours(resolved);
  };

  const handleToggleCustomColour = (colour) => {
    if (!colour.inStock && !isEditMode) return;
    setActivePaletteId('custom');
    setSelectedColours(prev => {
      const exists = prev.some(c => c.id === colour.id);
      if (exists) {
        return prev.length > 1 ? prev.filter(c => c.id !== colour.id) : prev;
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), colour];
      }
      return [...prev, colour];
    });
  };

  const handleSelectOrDropItem = (stepId, item) => {
    if (!item.inStock && !isEditMode) return;

    if (stepId === 'backdrop') {
      setSelection(prev => ({
        ...prev,
        backdrop: prev.backdrop?.id === item.id ? null : item
      }));
    } else if (stepId === 'balloons') {
      setSelection(prev => ({
        ...prev,
        balloons: prev.balloons?.id === item.id ? null : item
      }));
    } else if (stepId === 'extras') {
      setSelection(prev => {
        const exists = prev.extras.some(e => e.id === item.id);
        return {
          ...prev,
          extras: exists
            ? prev.extras.filter(e => e.id !== item.id)
            : [...prev.extras, item]
        };
      });
    }
  };

  const handleSkipCurrentStep = () => {
    if (currentStep.id === 'backdrop') {
      setSelection(prev => ({ ...prev, backdrop: null }));
    } else if (currentStep.id === 'balloons') {
      setSelection(prev => ({ ...prev, balloons: null }));
    } else if (currentStep.id === 'digits') {
      setDigitSelection(digitOptions[0]);
    } else if (currentStep.id === 'extras') {
      setSelection(prev => ({ ...prev, extras: [] }));
    }

    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      formStartTimeRef.current = Date.now();
      setShowQuoteModal(true);
    }
  };

  const handleNextStep = () => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      formStartTimeRef.current = Date.now();
      setShowQuoteModal(true);
    }
  };

  const handlePrevStep = () => {
    if (showQuoteModal) {
      setShowQuoteModal(false);
      return;
    }
    if (activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const found = offers.find(
      o => o.active && o.code.toLowerCase() === promoCode.trim().toLowerCase()
    );
    setAppliedOffer(found || null);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingQuote) return;
    setIsSubmittingQuote(true);

    const svgEl = canvasWrapRef.current ? canvasWrapRef.current.querySelector('svg') : null;
    const snapshotDataUrl = await captureSvgSnapshotDataUrl(svgEl, 360);
    const fillMs = Math.max(2000, Date.now() - (formStartTimeRef.current || Date.now() - 5000));

    // Derive stock IDs for workshop fulfillment & date conflict prevention
    const stockIds = [];
    if (selection.backdrop?.id) stockIds.push(`id_backdrop_${selection.backdrop.id}`);
    if (selection.balloons?.id) stockIds.push(`id_garland_${selection.balloons.id}`);
    if (digitSelection?.id && digitSelection.type !== 'none') stockIds.push(`id_digit_${digitSelection.id}`);
    (selection.extras || []).forEach(ex => stockIds.push(`id_prop_${ex.id}`));

    // Generate workshop balloon pull list based on selected palette
    const pullItems = selectedColours.map((c, i) => {
      const code = c.code || (101 + i);
      return `25 × ${code}_M (${c.name})`;
    });
    const pullListStr = pullItems.length > 0 ? pullItems.join(', ') : 'Standard Mix';

    const bundleDiscount = recipeCalc.hasDiscount ? Math.max(0, recipeCalc.originalTotal - recipeCalc.finalTotal) : 0;

    const quotePayload = {
      id: `OE-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'New Enquiry',
      _company_website: honeypotWebsite,
      _formFillMs: fillMs,
      previewSnapshotDataUrl: snapshotDataUrl,
      client: clientForm,
      configuration: {
        palette: selectedColours.map(c => c.name),
        backdrop: selection.backdrop ? selection.backdrop.name : 'Skipped (Freestanding)',
        boardCustomization: selection.backdrop?.id === 'wooden-board' ? boardCustomization : null,
        shimmerSize: selection.backdrop?.hasSizeTier ? shimmerSize : 'N/A',
        balloonLayout: selection.balloons ? selection.balloons.name : 'Skipped',
        digitsOrLetters: digitSelection?.type !== 'none' ? `${digitSelection.name} ("${digitText}")` : 'None',
        extras: selection.extras.map(ex => `${ex.shortName} (£${applyCornerBannerDiscount(ex.price, ex.cornerBanner)})`),
        neonPhrase: selection.extras.some(e => e.id === 'neon-sign') ? neonPhrase : null,
        bubbleText: selection.extras.some(e => e.id === 'bubble-balloon') ? bubbleText : null,
        promoCode: appliedOffer ? appliedOffer.code : null,
        subtotal: recipeCalc.originalTotal || finalTotal,
        bundleDiscount,
        estimatedTotal: finalTotal,
        depositPaid: 0,
        balanceDue: finalTotal,
        stockIds,
        balloonPullList: pullListStr
      }
    };

    await onSubmitQuote(quotePayload);
    setIsSubmittingQuote(false);
    setSubmittedSuccess(true);
  };

  return (
    <section id="build-your-edit" className="oe-builder-section" aria-label="Build Your Party Display Configurator">
      <div className="oe-builder-two-panel">
        {/* LEFT PANEL: Clean Square Canvas + Simple Total */}
        <div className="oe-left-canvas-panel">
          <div className="oe-canvas-frame" ref={canvasWrapRef}>
            <ProductPreview
              selection={selection}
              selectedColours={selectedColours}
              shimmerSize={shimmerSize}
              digitSelection={digitSelection}
              digitText={digitText}
              boardCustomization={boardCustomization}
              neonPhrase={neonPhrase}
              bubbleText={bubbleText}
              onDropItem={handleSelectOrDropItem}
              isDragOver={isDragOver}
              setIsDragOver={setIsDragOver}
            />
          </div>

          {/* Simple, Uncluttered Price & Palette Bar beneath Canvas */}
          <div className="oe-simple-summary-bar" aria-live="polite">
            <div className="oe-simple-summary-top">
              <div className="oe-simple-palette-dots">
                {selectedColours.map(col => (
                  <span
                    key={col.id}
                    className="oe-simple-dot"
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  />
                ))}
              </div>

              <div className="oe-simple-total">
                <span>Estimated Total:</span>
                {recipeCalc.hasDiscount && (
                  <span className="oe-price-old">£{recipeCalc.originalTotal}</span>
                )}
                <strong>£{finalTotal}</strong>
              </div>
            </div>

            {selection.backdrop?.hasSizeTier && (
              <div className="oe-wall-size-pill-group" role="group" aria-label="Shimmer Wall Size">
                <button
                  type="button"
                  onClick={() => setShimmerSize('small')}
                  className={`oe-size-btn ${shimmerSize === 'small' ? 'active' : ''}`}
                >
                  Small Wall (£{selection.backdrop.packageBasePrice || 150})
                </button>
                <button
                  type="button"
                  onClick={() => setShimmerSize('large')}
                  className={`oe-size-btn ${shimmerSize === 'large' ? 'active' : ''}`}
                >
                  Large Wall (£{selection.backdrop.packageLargePrice || 180})
                </button>
              </div>
            )}

            {lineItems.length > 0 && (
              <p className="oe-simple-items-line">
                {lineItems.map(l => `${l.label} (£${l.amount})`).join('  ·  ')}
              </p>
            )}

            {isEditMode && (
              <button
                type="button"
                onClick={() => onSaveCurrentSetupAsLook(currentRecipe, finalTotal)}
                className="oe-save-builder-as-look-btn"
              >
                ✨ Save Current 3D Builder Setup as a Lookbook Card (£{finalTotal})
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Guided 5-Step Configurator Controls */}
        <div className="oe-right-controls-panel">
          <div className="oe-right-top-bar">
            <h2 className="oe-builder-title">BUILD YOUR EDIT</h2>
            <span className="oe-step-badge">{currentStep.stepNumber}</span>
          </div>

          <nav className="oe-step-progress-nav" aria-label="Configurator Steps">
            {steps.map((step, idx) => {
              const isCompleted = idx < activeStepIndex;
              const isCurrent = !showQuoteModal && idx === activeStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setShowQuoteModal(false);
                    setActiveStepIndex(idx);
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`oe-step-pill-btn ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  {isCompleted ? '✓ ' : ''}{step.shortTab}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                formStartTimeRef.current = Date.now();
                setShowQuoteModal(true);
              }}
              className={`oe-step-pill-btn ${showQuoteModal ? 'current' : ''}`}
            >
              6. Send Edit (£{finalTotal})
            </button>
          </nav>

          {!showQuoteModal ? (
            <div className="oe-step-card-surface">
              <div className="oe-step-card-header">
                <div>
                  <h3 className="oe-active-step-heading">{currentStep.title}</h3>
                  <p className="oe-active-step-desc">{currentStep.subtitle}</p>
                </div>
                {currentStep.allowSkip && (
                  <button
                    type="button"
                    onClick={handleSkipCurrentStep}
                    className="oe-prominent-skip-btn"
                  >
                    Skip →
                  </button>
                )}
              </div>

              <div className="oe-step-scrollable-body">
              {/* STEP 1: COLOUR PALETTES */}
              {currentStep.id === 'colours' && (
                <div className="oe-palette-step-wrap">
                  <div className="oe-palette-mode-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paletteMode === 'curated'}
                      onClick={() => setPaletteMode('curated')}
                      className={`oe-mode-tab-btn ${paletteMode === 'curated' ? 'active' : ''}`}
                    >
                      Our 5 Signature Palettes
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paletteMode === 'custom'}
                      onClick={() => setPaletteMode('custom')}
                      className={`oe-mode-tab-btn ${paletteMode === 'custom' ? 'active' : ''}`}
                    >
                      Build Your Own (Up to 5 Colours)
                    </button>
                  </div>

                  {paletteMode === 'curated' ? (
                    <div className="oe-curated-palettes-list">
                      {curatedPalettes.map(pal => {
                        const isSelected = activePaletteId === pal.id;
                        const palColours = pal.colourIds
                          .map(id => balloonColours.find(c => c.id === id))
                          .filter(Boolean);

                        return (
                          <button
                            key={pal.id}
                            type="button"
                            disabled={!pal.inStock && !isEditMode}
                            onClick={() => handleSelectCuratedPalette(pal)}
                            className={`oe-curated-palette-card ${isSelected ? 'selected' : ''} ${!pal.inStock ? 'out-of-stock' : ''}`}
                          >
                            <div className="oe-curated-info">
                              <div className="oe-curated-title-row">
                                <span className="oe-curated-name">{pal.name}</span>
                                {isSelected && <span className="oe-selected-pill">Selected ✓</span>}
                              </div>
                              <p className="oe-curated-desc">{pal.description}</p>
                            </div>

                            <div className="oe-curated-balloon-bunch" aria-label={`Balloons in ${pal.name}`}>
                              {palColours.map(c => (
                                <div key={c.id} className="oe-bunch-balloon-item" title={c.name}>
                                  <BalloonGraphic hex={c.hex} size={40} />
                                  <span className="oe-bunch-balloon-label">{c.name}</span>
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="oe-custom-palette-builder">
                      <p className="oe-custom-instruction">
                        Select up to 5 balloons to create your palette ({selectedColours.length}/5 selected):
                      </p>
                      <div className="oe-balloon-swatch-grid">
                        {balloonColours.map((colour, idx) => {
                          const isSelected = selectedColours.some(c => c.id === colour.id);
                          return (
                            <div
                              key={colour.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleCustomColour(colour)}
                              className={`oe-balloon-card-btn ${isSelected ? 'selected' : ''} ${!colour.inStock ? 'out-of-stock' : ''}`}
                            >
                              <span className="oe-swatch-code-badge">#{colour.code || (101 + idx)}</span>
                              <BalloonGraphic hex={colour.hex} size={48} />
                              <span className="oe-balloon-card-name">{colour.name}</span>
                              <span className="oe-balloon-card-finish">
                                {!colour.inStock ? 'Out of Stock' : colour.finish}
                              </span>
                              {isSelected && <span className="oe-balloon-check-badge">✓</span>}
                              {isEditMode && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', width: '100%' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleColourStock(colour.id);
                                    }}
                                    className={`oe-mini-admin-btn ${colour.inStock ? 'in-stock' : 'out-stock'}`}
                                  >
                                    {colour.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingColourTarget({ ...colour, isNew: false });
                                    }}
                                    className="oe-mini-admin-btn"
                                    style={{ background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }}
                                  >
                                    🎨 Change Shade
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isEditMode && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditingColourTarget({ isNew: true, name: '', hex: '#7A8C68', finish: 'Matte' })}
                            className="oe-balloon-card-btn"
                            style={{ border: '2px dashed #0284C7', background: '#F0F9FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '1.5rem', color: '#0284C7' }}>+</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>Add New Shade</span>
                            <span style={{ fontSize: '0.62rem', color: '#64748B', textAlign: 'center', marginTop: '0.2rem' }}>Pick from visual tray</span>
                          </div>
                        )}
                      </div>

                      {/* Visual Colour Swatch Picker Modal */}
                      {editingColourTarget && (
                        <VisualColourPicker
                          currentHex={editingColourTarget.hex}
                          currentName={editingColourTarget.name}
                          currentFinish={editingColourTarget.finish}
                          onClose={() => setEditingColourTarget(null)}
                          onSelectColour={(chosen) => {
                            if (editingColourTarget.isNew) {
                              onAddNewColour(chosen);
                            } else {
                              onUpdateColour(editingColourTarget.id, chosen);
                            }
                            setEditingColourTarget(null);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEPS 2, 3, 5: BACKDROPS, GARLANDS & EXTRAS */}
              {(currentStep.id === 'backdrop' || currentStep.id === 'balloons' || currentStep.id === 'extras') && (
                <div className="oe-accessible-options-grid">
                  {currentStep.items.map(item => {
                    const isSelected =
                      (currentStep.id === 'backdrop' && selection.backdrop?.id === item.id) ||
                      (currentStep.id === 'balloons' && selection.balloons?.id === item.id) ||
                      (currentStep.id === 'extras' && selection.extras.some(e => e.id === item.id));

                    const rawBase = item.packageBasePrice || item.price;
                    const discountedBase = applyCornerBannerDiscount(rawBase, item.cornerBanner);
                    const hasDiscount = discountedBase < rawBase;
                    const displayPrefix = item.packageBasePrice ? 'From ' : '+';

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={item.inStock || isEditMode ? 0 : -1}
                        aria-pressed={isSelected}
                        aria-disabled={!item.inStock && !isEditMode}
                        draggable={item.inStock}
                        onDragStart={(e) => {
                          if (!item.inStock) return;
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ stepId: currentStep.id, item })
                          );
                        }}
                        onClick={() => handleSelectOrDropItem(currentStep.id, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectOrDropItem(currentStep.id, item);
                          }
                        }}
                        className={`oe-option-card ${isSelected ? 'selected' : ''} ${!item.inStock ? 'out-of-stock' : ''} ${item.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                      >
                        <CornerRibbon banner={item.cornerBanner} />

                        <div className="oe-option-card-top-with-thumb">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="oe-option-card-thumb" loading="lazy" />
                          )}
                          <div className="oe-option-card-header-text">
                            <div className="oe-option-card-top">
                              <EditableText
                                isEditMode={isEditMode}
                                value={item.name}
                                onChange={(val) => onUpdateBuilderItem(currentStep.id, item.id, { name: val })}
                                tag="span"
                                className="oe-option-card-title"
                              />
                              <span className="oe-option-card-price">
                                {!item.inStock && !isEditMode ? (
                                  'OUT OF STOCK'
                                ) : isEditMode ? (
                                  <EditablePrice
                                    isEditMode={true}
                                    value={rawBase}
                                    prefix={item.packageBasePrice ? 'From £' : '+£'}
                                    onChange={(num) =>
                                      onUpdateBuilderItem(currentStep.id, item.id, {
                                        price: num,
                                        packageBasePrice: item.packageBasePrice ? num : undefined
                                      })
                                    }
                                  />
                                ) : hasDiscount ? (
                                  <>
                                    <span className="oe-price-old">£{rawBase}</span>
                                    <span className="oe-price-new">{displayPrefix}£{discountedBase}</span>
                                  </>
                                ) : (
                                  `${displayPrefix}£${rawBase}`
                                )}
                              </span>
                            </div>
                            <EditableText
                              isEditMode={isEditMode}
                              value={item.styleNote}
                              onChange={(val) => onUpdateBuilderItem(currentStep.id, item.id, { styleNote: val })}
                              tag="p"
                              className="oe-option-card-desc"
                            />
                          </div>
                        </div>
                        <div className="oe-option-card-footer">
                          <span className="oe-option-badge">
                            {item.hireOnly ? 'Hire Prop' : 'Yours to Keep'}
                          </span>
                          <span className="oe-option-action-text">
                            {!item.inStock
                              ? 'Unavailable'
                              : isSelected
                              ? '✓ Selected'
                              : 'Select or Drag +'}
                          </span>
                        </div>

                        {isEditMode && (
                          <div className="oe-card-edit-overlay-bar" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onToggleBuilderItemStock(currentStep.id, item.id)}
                              className={`oe-mini-admin-btn ${item.inStock ? 'in-stock' : 'out-stock'}`}
                            >
                              {item.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                            </button>
                            <label className="oe-mini-admin-btn">
                              📷 Photo
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    onUploadPhotoForTarget(e.target.files[0], (url) =>
                                      onUpdateBuilderItem(currentStep.id, item.id, { image: url })
                                    );
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setOpenRibbonItemId(openRibbonItemId === item.id ? null : item.id)}
                              className="oe-mini-admin-btn"
                            >
                              🎀 Corner Banner
                            </button>
                          </div>
                        )}

                        {isEditMode && openRibbonItemId === item.id && (
                          <RibbonPickerPopover
                            banner={item.cornerBanner}
                            onChange={(newBanner) =>
                              onUpdateBuilderItem(currentStep.id, item.id, { cornerBanner: newBanner })
                            }
                            onClose={() => setOpenRibbonItemId(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentStep.id === 'backdrop' && selection.backdrop?.id === 'wooden-board' && (
                  <div className="oe-board-personalisation-deck">
                    <div className="oe-deck-header">
                      <span className="oe-deck-eyebrow">BESPOKE PERSONALISATION</span>
                      <h4 className="oe-deck-title">Personalise Your Wooden Arch Board</h4>
                      <p className="oe-deck-subtitle">Select your painted finish &amp; custom vinyl lettering (rendered live in the preview!):</p>
                    </div>

                    <div className="oe-deck-grid">
                      <div>
                        <label className="oe-field-label">1. Board Paint Finish</label>
                        <div className="oe-paint-swatches">
                          {[
                            { name: 'Warm Ivory', hex: '#F5EFEB' },
                            { name: 'Organic Sage', hex: '#8A9A7B' },
                            { name: 'Soft Blush', hex: '#E8D3CE' },
                            { name: 'Warm Taupe', hex: '#C8B098' },
                            { name: 'Matte White', hex: '#FDFDFD' },
                            { name: 'Obsidian Black', hex: '#242623' }
                          ].map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => setBoardCustomization(prev => ({ ...prev, color: p.hex, colorName: p.name }))}
                              className={`oe-paint-swatch-btn ${boardCustomization.colorName === p.name ? 'active' : ''}`}
                              title={p.name}
                            >
                              <span className="oe-swatch-circle" style={{ backgroundColor: p.hex }} />
                              <span className="oe-swatch-text">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="oe-field-label">2. Vinyl Lettering Colour</label>
                        <div className="oe-vinyl-options">
                          {[
                            { id: 'gold', name: '✦ Metallic Gold' },
                            { id: 'white', name: '⚪ Matte White' },
                            { id: 'black', name: '⚫ Gloss Black' },
                            { id: 'rose-gold', name: '✨ Rose Gold' }
                          ].map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setBoardCustomization(prev => ({ ...prev, vinylColor: v.id }))}
                              className={`oe-vinyl-btn ${boardCustomization.vinylColor === v.id ? 'active' : ''}`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="oe-field-label">3. Custom Vinyl Lettering / Message</label>
                        <input
                          type="text"
                          maxLength={40}
                          placeholder="e.g. Welcome to Sophie's 30th / Oh Baby / Happy Birthday"
                          value={boardCustomization.text}
                          onChange={(e) => setBoardCustomization(prev => ({ ...prev, text: e.target.value }))}
                          className="oe-form-input"
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep.id === 'extras' && selection.extras.some(e => e.id === 'neon-sign') && (
                  <div className="oe-extra-bespoke-card">
                    <label className="oe-field-label">Neon Sign Phrase (Warm White Glow)</label>
                    <div className="oe-neon-phrase-chips">
                      {['Happy Birthday', "Let's Party", 'Oh Baby', 'Better Together', 'Twenty One'].map(phrase => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setNeonPhrase(phrase)}
                          className={`oe-recipe-chip ${neonPhrase === phrase ? 'selected' : ''}`}
                        >
                          {neonPhrase === phrase ? '✓ ' : ''}{phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.id === 'extras' && selection.extras.some(e => e.id === 'bubble-balloon') && (
                  <div className="oe-extra-bespoke-card">
                    <label className="oe-field-label">Personalised Bubble Balloon Lettering</label>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. Happy 30th Sophie"
                      value={bubbleText}
                      onChange={(e) => setBubbleText(e.target.value)}
                      className="oe-form-input"
                      style={{ marginTop: '0.4rem' }}
                    />
                  </div>
                )}
              </div>
            )}

              {/* STEP 4: DIGITS, NUMBER STACKS & LETTER BALLOONS */}
              {currentStep.id === 'digits' && (
                <div className="oe-digits-step-wrap">
                  <div className="oe-accessible-options-grid">
                    {digitOptions.map(opt => {
                      const isSelected = digitSelection?.id === opt.id;
                      const rawBase = opt.basePrice;
                      const discBase = applyCornerBannerDiscount(rawBase, opt.cornerBanner);
                      return (
                        <div
                          key={opt.id}
                          role="button"
                          tabIndex={opt.inStock || isEditMode ? 0 : -1}
                          onClick={() => {
                            if (!opt.inStock && !isEditMode) return;
                            setDigitSelection(opt);
                            if (opt.defaultText) setDigitText(opt.defaultText);
                          }}
                          className={`oe-option-card ${isSelected ? 'selected' : ''} ${!opt.inStock ? 'out-of-stock' : ''} ${opt.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                        >
                          <CornerRibbon banner={opt.cornerBanner} />
                          <div className="oe-option-card-top-with-thumb">
                            {opt.image && (
                              <img src={opt.image} alt={opt.name} className="oe-option-card-thumb" loading="lazy" />
                            )}
                            <div className="oe-option-card-header-text">
                              <div className="oe-option-card-top">
                                <EditableText
                                  isEditMode={isEditMode}
                                  value={opt.name}
                                  onChange={(val) => onUpdateDigitOption(opt.id, { name: val })}
                                  tag="span"
                                  className="oe-option-card-title"
                                />
                                <span className="oe-option-card-price">
                                  {opt.basePrice === 0 ? (
                                    '£0'
                                  ) : isEditMode ? (
                                    <EditablePrice
                                      isEditMode={true}
                                      value={opt.basePrice}
                                      prefix="From £"
                                      onChange={(num) => onUpdateDigitOption(opt.id, { basePrice: num })}
                                    />
                                  ) : discBase < rawBase ? (
                                    <>
                                      <span className="oe-price-old">£{rawBase}</span>
                                      <span className="oe-price-new">From £{discBase}</span>
                                    </>
                                  ) : opt.perLetter ? (
                                    `£${opt.basePrice}/letter`
                                  ) : (
                                    `From £${opt.basePrice}`
                                  )}
                                </span>
                              </div>
                              <EditableText
                                isEditMode={isEditMode}
                                value={opt.description}
                                onChange={(val) => onUpdateDigitOption(opt.id, { description: val })}
                                tag="p"
                                className="oe-option-card-desc"
                              />
                            </div>
                          </div>
                          <div className="oe-option-card-footer">
                            <span className="oe-option-action-text">
                              {isSelected ? '✓ Selected' : 'Select Option'}
                            </span>
                          </div>

                          {isEditMode && opt.type !== 'none' && (
                            <div className="oe-card-edit-overlay-bar" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => onUpdateDigitOption(opt.id, { inStock: !opt.inStock })}
                                className={`oe-mini-admin-btn ${opt.inStock ? 'in-stock' : 'out-stock'}`}
                              >
                                {opt.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenRibbonItemId(openRibbonItemId === opt.id ? null : opt.id)}
                                className="oe-mini-admin-btn"
                              >
                                🎀 Corner Banner
                              </button>
                            </div>
                          )}

                          {isEditMode && openRibbonItemId === opt.id && (
                            <RibbonPickerPopover
                              banner={opt.cornerBanner}
                              onChange={(newBanner) => onUpdateDigitOption(opt.id, { cornerBanner: newBanner })}
                              onClose={() => setOpenRibbonItemId(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {digitSelection && digitSelection.type !== 'none' && (
                    <div className="oe-digit-input-panel">
                      <label htmlFor="custom-digits-input" className="oe-digit-input-label">
                        {digitSelection.type === 'letters'
                          ? 'Enter the word or name for your Letter Balloons (up to 8 letters):'
                          : 'Enter the age or number(s) you need (e.g. 1, 18, 21, 30):'}
                      </label>
                      <div className="oe-digit-input-row">
                        <input
                          id="custom-digits-input"
                          type="text"
                          maxLength={digitSelection.maxChars || 6}
                          value={digitText}
                          onChange={(e) => setDigitText(e.target.value)}
                          className="oe-digit-text-input"
                          placeholder={digitSelection.defaultText || '21'}
                        />
                        <span className="oe-digit-live-calc">
                          Characters: <strong>{Math.max(1, digitText.replace(/\s+/g, '').length)}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>

              <div className="oe-step-action-bar">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={activeStepIndex === 0}
                  className="oe-btn-secondary"
                >
                  ← Back
                </button>

                <div className="oe-step-action-right">
                  {currentStep.allowSkip && (
                    <button
                      type="button"
                      onClick={handleSkipCurrentStep}
                      className="oe-btn-skip"
                    >
                      {currentStep.skipLabel || 'Skip Step'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="oe-btn-primary"
                  >
                    {activeStepIndex === steps.length - 1
                      ? `Review & Send Edit (£${finalTotal}) →`
                      : `Next: ${steps[activeStepIndex + 1].shortTab} →`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 6: SEND EDIT FORM */
            <div className="oe-step-card-surface">
              {submittedSuccess ? (
                <div className="oe-quote-confirmation">
                  <h3 className="oe-active-step-heading">Your Edit Has Been Sent!</h3>
                  <p className="oe-active-step-desc">
                    Thank you, <strong>{clientForm.name}</strong>. We have received your custom 3D display snapshot and estimated quote (<strong>£{finalTotal}</strong>) and will be in touch shortly to confirm availability for your date.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedSuccess(false);
                      setShowQuoteModal(false);
                      setActiveStepIndex(0);
                    }}
                    className="oe-btn-primary"
                  >
                    ← Back to Builder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleQuoteSubmit} className="oe-quote-form">
                  <h3 className="oe-active-step-heading">Send Your Custom Edit</h3>
                  <p className="oe-active-step-desc">
                    We will receive your exact visual template, colour palette, and selected options so we can confirm availability and provide a final quote for your venue.
                  </p>

                  {/* Anti-Bot Honeypot Field (Invisible to real users) */}
                  <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <label>
                      Company Website
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypotWebsite}
                        onChange={(e) => setHoneypotWebsite(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="oe-promo-row">
                    <input
                      type="text"
                      placeholder="Discount code (e.g. OCCASION10)"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      className="oe-form-input"
                    />
                    <button type="button" onClick={handleApplyPromo} className="oe-btn-secondary">
                      Apply
                    </button>
                  </div>
                  {appliedOffer && (
                    <p className="oe-offer-applied-banner">✓ Applied: {appliedOffer.title}</p>
                  )}

                  <div className="oe-form-grid">
                    <div>
                      <label className="oe-field-label">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={clientForm.name}
                        onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="sarah@example.com"
                        value={clientForm.email}
                        onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="07700 900000"
                        value={clientForm.phone}
                        onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Event Date *</label>
                      <input
                        type="date"
                        required
                        value={clientForm.eventDate}
                        onChange={e => setClientForm({ ...clientForm, eventDate: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Venue Postcode *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. NG13, NG31, LE13"
                        value={clientForm.postcode}
                        onChange={e => setClientForm({ ...clientForm, postcode: e.target.value.toUpperCase() })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Venue / Room Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Vale of Belvoir Country Hotel / Home"
                        value={clientForm.venueName || ''}
                        onChange={e => setClientForm({ ...clientForm, venueName: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Access / Setup Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:30 AM arrival"
                        value={clientForm.accessTime || ''}
                        onChange={e => setClientForm({ ...clientForm, accessTime: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                    <div>
                      <label className="oe-field-label">Setting Environment</label>
                      <div className="oe-setting-toggle-pills">
                        <button
                          type="button"
                          onClick={() => setClientForm({ ...clientForm, setting: 'indoor' })}
                          className={`oe-setting-pill-btn ${(clientForm.setting || 'indoor') === 'indoor' ? 'active' : ''}`}
                        >
                          🏢 Indoor Display
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientForm({ ...clientForm, setting: 'outdoor' })}
                          className={`oe-setting-pill-btn ${clientForm.setting === 'outdoor' ? 'active' : ''}`}
                        >
                          🌳 Outdoor Setup
                        </button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="oe-field-label">Personalisation / Theme Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Preferred delivery window, theme colours, or access instructions"
                        value={clientForm.notes}
                        onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}
                        className="oe-form-input"
                      />
                    </div>
                  </div>

                  <div className="oe-step-action-bar">
                    <button type="button" onClick={handlePrevStep} className="oe-btn-secondary">
                      ← Back
                    </button>
                    <button type="submit" disabled={isSubmittingQuote} className="oe-btn-primary">
                      {isSubmittingQuote ? 'Sending Your Edit...' : `Send My Edit (£${finalTotal}) →`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * ---------------------------------------------------------------------------
 * BOTTESFORD DELIVERY RADIUS MAP COMPONENT (Leaflet.js)
 * ---------------------------------------------------------------------------
 */
function DeliveryRadiusMap({ deliveryConfig, onUpdateDeliveryConfig, isEditMode }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const circlesRef = useRef([]);

  const [testPostcode, setTestPostcode] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  const zones = deliveryConfig?.zones || INITIAL_DELIVERY_CONFIG.zones;
  const centerCoords = deliveryConfig?.centerCoords || INITIAL_DELIVERY_CONFIG.centerCoords; // [52.9436, -0.8006]

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (_e) {}
    }

    const map = window.L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView(centerCoords, 9);

    window.L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 18,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    // Bottesford Studio Base Marker
    const studioIcon = window.L.divIcon({
      className: 'oe-map-studio-pin',
      html: '<div style="background:#1C1E1B;color:#FAF6F0;padding:5px 10px;border-radius:12px;font-size:11px;font-weight:800;border:2px solid #C5A059;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.35);">✦ Bottesford Studio</div>',
      iconSize: [120, 32],
      iconAnchor: [60, 16]
    });
    window.L.marker(centerCoords, { icon: studioIcon }).addTo(map)
      .bindPopup('<b>THE Occasion Edit — Studio Base</b><br>Bottesford, Leicestershire');

    // Concentric Radius Circles (Draw outer first so inner sit on top)
    const milesToMeters = (m) => m * 1609.344;
    const sortedZones = [...zones].sort((a, b) => b.miles - a.miles);
    const newCircles = [];

    sortedZones.forEach(z => {
      const circ = window.L.circle(centerCoords, {
        radius: milesToMeters(z.miles),
        color: z.color || '#C5A059',
        fillColor: z.color || '#C5A059',
        fillOpacity: z.id === 'zone-1' ? 0.22 : z.id === 'zone-2' ? 0.16 : 0.10,
        weight: 2
      }).addTo(map).bindPopup(`<b>${z.name}</b><br>${z.miles} Mile Radius · Fee: £${z.surcharge}<br><i>${z.note || ''}</i>`);
      newCircles.push({ id: z.id, circle: circ });
    });

    circlesRef.current = newCircles;
    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (_e) {}
        leafletMapRef.current = null;
      }
    };
  }, [centerCoords]);

  // Dynamically update circle radii when zones change (e.g. Laura clicks steppers)
  useEffect(() => {
    if (!leafletMapRef.current || circlesRef.current.length === 0) return;
    const milesToMeters = (m) => m * 1609.344;
    zones.forEach(z => {
      const entry = circlesRef.current.find(c => c.id === z.id);
      if (entry && entry.circle) {
        entry.circle.setRadius(milesToMeters(z.miles));
      }
    });
  }, [zones]);

  const handleCheckPostcode = (e) => {
    e.preventDefault();
    if (!testPostcode.trim()) return;
    const miles = calculateDistanceToBottesford(testPostcode);
    if (miles === null) {
      setCalcResult({ error: 'Please enter a valid UK postcode (e.g. NG13, NG31, LE13).' });
      return;
    }
    const zoneInfo = getDeliveryZoneForMileage(miles, zones);
    setCalcResult({
      miles,
      zone: zoneInfo.zone,
      surcharge: zoneInfo.surcharge,
      label: zoneInfo.label
    });
  };

  const handleAdjustMiles = (zoneId, delta) => {
    if (!onUpdateDeliveryConfig) return;
    const nextZones = zones.map(z => {
      if (z.id !== zoneId) return z;
      const nextMiles = Math.max(1, Math.min(60, z.miles + delta));
      return { ...z, miles: nextMiles };
    });
    onUpdateDeliveryConfig({ ...deliveryConfig, zones: nextZones });
  };

  const handleUpdateSurcharge = (zoneId, val) => {
    if (!onUpdateDeliveryConfig) return;
    const num = Math.max(0, parseInt(val, 10) || 0);
    const nextZones = zones.map(z => (z.id === zoneId ? { ...z, surcharge: num } : z));
    onUpdateDeliveryConfig({ ...deliveryConfig, zones: nextZones });
  };

  return (
    <div className="oe-delivery-rates-section" id="delivery-rates">
      <div className="oe-section-header-center">
        <span className="oe-eyebrow">SERVICE AREA &amp; DELIVERY</span>
        <h2 className="oe-section-title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
          Delivery Radius &amp; Rates
        </h2>
        <p className="oe-section-subtitle" style={{ maxWidth: '680px', margin: '0 auto' }}>
          Based in <strong>Bottesford, Leicestershire</strong>, delivering bespoke styling &amp; prop hire across the Vale of Belvoir, Grantham, Bingham, Melton Mowbray, Newark, and Nottingham borders.
        </p>
      </div>

      <div className="oe-delivery-dual-grid">
        {/* Left Column: Postcode Calculator & Structured Zone Cards */}
        <div className="oe-delivery-info-col">
          {/* Postcode Distance Calculator Card */}
          <div className="oe-postcode-card">
            <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1C1E1B', fontWeight: 800 }}>
              Check Delivery To Your Venue
            </h4>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#5C5852', lineHeight: 1.4 }}>
              Enter your event postcode to calculate straight-line mileage from our Bottesford studio and check your delivery rate:
            </p>
            <form onSubmit={handleCheckPostcode} className="oe-postcode-form">
              <input
                type="text"
                placeholder="e.g. NG13, NG31, LE13..."
                value={testPostcode}
                onChange={(e) => setTestPostcode(e.target.value.toUpperCase())}
                className="oe-postcode-input"
              />
              <button type="submit" className="oe-btn-primary" style={{ padding: '0.65rem 1.15rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                Check Rate →
              </button>
            </form>

            {calcResult && (
              <div style={{ marginTop: '0.85rem' }}>
                {calcResult.error ? (
                  <p style={{ color: '#A33E31', fontSize: '0.82rem', margin: 0, fontWeight: 700 }}>{calcResult.error}</p>
                ) : (
                  <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', padding: '0.75rem 0.95rem', borderRadius: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0369A1' }}>
                      📍 {calcResult.miles} miles from Bottesford Studio
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#0C4A6E' }}>
                      <strong>{calcResult.label}</strong> · Delivery &amp; Setup: {calcResult.surcharge === 0 ? 'FREE on orders £150+' : `£${calcResult.surcharge}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3 Luxury Zone Cards Stack */}
          <div className="oe-zone-cards-list">
            {zones.map((z) => (
              <div
                key={z.id}
                className={`oe-zone-card ${z.id === 'zone-1' ? 'zone-1' : z.id === 'zone-2' ? 'zone-2' : 'zone-3'}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1C1E1B' }}>
                    {z.name}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: z.surcharge === 0 ? '#15803D' : '#1C1E1B' }}>
                    {z.surcharge === 0 ? 'FREE on £150+' : `£${z.surcharge}`}
                  </span>
                </div>

                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#5C5852', lineHeight: 1.35 }}>
                  {z.note || `Up to ${z.miles} miles from Bottesford studio.`}
                </p>

                {/* Point and Click Stepper in Studio Mode */}
                {isEditMode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', background: '#F0F9FF', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369A1' }}>RADIUS:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustMiles(z.id, -1)}
                        className="oe-stepper-btn"
                        title="Decrease radius by 1 mile"
                      >
                        -
                      </button>
                      <strong style={{ fontSize: '0.85rem', minWidth: '48px', textAlign: 'center', color: '#0C4A6E' }}>{z.miles} mi</strong>
                      <button
                        type="button"
                        onClick={() => handleAdjustMiles(z.id, 1)}
                        className="oe-stepper-btn"
                        title="Increase radius by 1 mile"
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0369A1' }}>FEE: £</span>
                      <input
                        type="number"
                        min="0"
                        value={z.surcharge}
                        onChange={(e) => handleUpdateSurcharge(z.id, e.target.value)}
                        style={{ width: '52px', textAlign: 'center', fontWeight: 800, padding: '3px 6px', fontSize: '0.85rem', border: '1.5px solid #7DD3FC', borderRadius: '6px', background: '#FFFFFF' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Real Leaflet Map */}
        <div className="oe-real-leaflet-map-wrap">
          <div ref={mapContainerRef} className="oe-real-leaflet-map" />
          <div className="oe-map-legend-bar">
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#1C1E1B' }}>✦ Bottesford (NG13)</span>
              <span style={{ color: '#7A8C68', fontWeight: 700 }}>● Zone 1 ({zones[0]?.miles || 10} mi)</span>
              <span style={{ color: '#C5A059', fontWeight: 700 }}>● Zone 2 ({zones[1]?.miles || 20} mi)</span>
              <span style={{ color: '#991B1B', fontWeight: 700 }}>● Zone 3 ({zones[2]?.miles || 30} mi)</span>
            </div>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <a
                href="https://maps.google.com/?q=Bottesford,+Nottinghamshire+NG13"
                target="_blank"
                rel="noopener noreferrer"
                className="oe-mini-admin-btn"
                style={{ textDecoration: 'none', background: '#FFFFFF', color: '#1E293B', padding: '0.3rem 0.6rem', fontSize: '0.74rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
              >
                🗺️ Directions ↗
              </a>
              <a
                href="/public/assets/Bottesford_Delivery_Radius_Map.kml"
                download
                className="oe-mini-admin-btn"
                style={{ textDecoration: 'none', background: '#FEF3C7', color: '#92400E', padding: '0.3rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, border: '1px solid #FCD34D', borderRadius: '6px' }}
                title="Download .KML file for Google My Maps"
              >
                ⬇ .KML
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DOSSIER LOCATION & DELIVERY CARD (Interactive Route Vector & Maps Link)
 * ---------------------------------------------------------------------------
 */
/**
 * ---------------------------------------------------------------------------
 * DOSSIER RADIUS MAP (Home Base to Venue Relation matching media_1793459929283.png)
 * ---------------------------------------------------------------------------
 */
function DossierRadiusMap({ client, deliveryConfig }) {
  const mapContainerRef = useRef(null);
  const distanceMiles = calculateDistanceToBottesford(client?.postcode) || 14.6;
  const venueAddress = client?.venue || client?.postcode || 'Vale of Belvoir, Leicestershire';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=Bottesford+Studio,+NG13&destination=${encodeURIComponent(client?.postcode || venueAddress)}`;

  // Calculate delivery zone status
  const zoneTag = distanceMiles <= 10
    ? 'Zone 1 · Free Delivery (£150+)'
    : distanceMiles <= 20
    ? 'Zone 2 · £20 Surcharge'
    : 'Zone 3 · £35 Surcharge';

  useEffect(() => {
    let mapInstance = null;
    if (window.L && mapContainerRef.current) {
      try {
        const center = [52.9436, -0.8006]; // Bottesford Studio HQ

        // Resolve venue coordinates from postcode outcode
        const rawPostcode = (client?.postcode || '').trim().toUpperCase();
        const outcode = rawPostcode.split(' ')[0] || 'NG1';
        let venueCoords = UK_OUTCODE_CENTROIDS[outcode];
        if (!venueCoords) {
          // Accurate bearing projection from Bottesford based on distance
          const bearing = 240; // Southwest towards Leicester/Nottingham
          const latOffset = (distanceMiles / 69.0) * Math.cos(bearing * Math.PI / 180);
          const lngOffset = (distanceMiles / (69.0 * Math.cos(52.9436 * Math.PI / 180))) * Math.sin(bearing * Math.PI / 180);
          venueCoords = [center[0] + latOffset, center[1] + lngOffset];
        }

        mapInstance = window.L.map(mapContainerRef.current, {
          center: center,
          zoom: 10,
          zoomControl: false,
          attributionControl: false
        });

        // Crisp Google Maps Standard Road Tiles (zero watermarks, zero API key blocks)
        window.L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          subdomains: ['0', '1', '2', '3'],
          maxZoom: 18
        }).addTo(mapInstance);

        // Concentric delivery radius rings (10mi, 20mi, 30mi)
        const milesToMeters = 1609.34;
        window.L.circle(center, { radius: 10 * milesToMeters, color: '#7A8C68', weight: 1.5, fillOpacity: 0.05 }).addTo(mapInstance);
        window.L.circle(center, { radius: 20 * milesToMeters, color: '#C5A059', weight: 1.5, fillOpacity: 0.04 }).addTo(mapInstance);
        window.L.circle(center, { radius: 30 * milesToMeters, color: '#DC2626', weight: 1.5, fillOpacity: 0.03 }).addTo(mapInstance);

        // Connecting transit route dashed line between Base and Venue
        window.L.polyline([center, venueCoords], {
          color: '#B45309',
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.9
        }).addTo(mapInstance);

        // 1. Home Base Marker (Charcoal + Gold)
        const baseMarker = window.L.circleMarker(center, {
          radius: 7,
          fillColor: '#1C1E1B',
          color: '#C5A059',
          weight: 2.5,
          fillOpacity: 1
        }).addTo(mapInstance);
        baseMarker.bindTooltip('✦ Base Studio (Bottesford)', { permanent: true, direction: 'top', className: 'oe-map-tooltip' });

        // 2. Venue Marker (Crimson + White)
        const venueMarker = window.L.circleMarker(venueCoords, {
          radius: 7,
          fillColor: '#DC2626',
          color: '#FFFFFF',
          weight: 2.5,
          fillOpacity: 1
        }).addTo(mapInstance);
        const venueShortName = client?.venue ? client.venue.split('(')[0].trim() : (client?.name ? `${client.name}'s Venue` : 'Event Venue');
        venueMarker.bindTooltip(`📍 ${venueShortName}`, { permanent: true, direction: 'bottom', className: 'oe-map-tooltip' });

        // Auto-fit bounds to show both Home Base AND Venue with breathing room
        const bounds = window.L.latLngBounds([center, venueCoords]);
        mapInstance.fitBounds(bounds.pad(0.4));
      } catch (err) {
        // Fallback gracefully
      }
    }

    return () => {
      if (mapInstance) {
        try { mapInstance.remove(); } catch (e) {}
      }
    };
  }, [client?.postcode, client?.venue]);

  return (
    <div className="oe-dossier-map-card">
      <div
        ref={mapContainerRef}
        id="dossier-leaflet-map"
        style={{ width: '100%', height: '185px', borderRadius: '10px', background: '#E2E8F0', overflow: 'hidden' }}
      />
      <div className="oe-map-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.65rem' }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.62rem', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            LOCATION ADDRESS
          </span>
          <strong style={{ fontSize: '0.82rem', color: '#1C1E1B', display: 'block', maxWidth: '280px', lineHeight: 1.25 }}>
            {venueAddress}
          </strong>
          <span style={{ fontSize: '0.68rem', color: '#5F6A49', fontWeight: 700 }}>
            {zoneTag}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: '0.62rem', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            DISTANCE FROM BASE
          </span>
          <strong style={{ fontSize: '0.88rem', color: '#1C1E1B', display: 'block' }}>
            ~{distanceMiles} miles
          </strong>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', color: '#0369A1', fontWeight: 800, textDecoration: 'none', display: 'inline-block', marginTop: '2px' }}
          >
            Google Maps Route ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * DOSSIER VISUAL ARTWORK (Full Staged Composition matching media_1793459929283.png)
 * ---------------------------------------------------------------------------
 */
function DossierVisualArtwork({ activeQuote, palette, balloonColours }) {
  if (activeQuote?.previewSnapshotDataUrl) {
    return (
      <img
        src={activeQuote.previewSnapshotDataUrl}
        alt="Customer Bespoke Build"
        className="oe-dossier-snapshot-img"
      />
    );
  }

  const cfg = activeQuote?.configuration || {};
  const colours = (palette?.colourIds || ['soft-blush', 'pearl-white', 'champagne-gold', 'nude-stone', 'blush-pink']).map(id => {
    const col = (balloonColours || []).find(b => b.id === id);
    return col ? col.hex : '#D8A49B';
  });

  const rawDigits = String(cfg.digitsOrLetters || cfg.digitText || '30').replace(/[^a-zA-Z0-9]/g, '');

  return (
    <svg viewBox="0 0 400 250" className="oe-dossier-snapshot-svg" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
      <defs>
        <radialGradient id="dossierHoopGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#EFEAE1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dossierGoldShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="45%" stopColor="#D9B668" />
          <stop offset="70%" stopColor="#F9E89B" />
          <stop offset="100%" stopColor="#9C762B" />
        </linearGradient>
      </defs>

      {/* Stage Shadow & Radial Glow */}
      <ellipse cx="190" cy="235" rx="140" ry="10" fill="rgba(0,0,0,0.06)" />
      <circle cx="190" cy="120" r="100" fill="url(#dossierHoopGlow)" />

      {/* Circular Gold Hoop Frame & Stand */}
      <circle cx="190" cy="115" r="78" fill="none" stroke="url(#dossierGoldShine)" strokeWidth="5.5" />
      <path d="M 150 193 L 230 193 M 165 193 L 165 182 M 215 193 L 215 182" stroke="url(#dossierGoldShine)" strokeWidth="3" strokeLinecap="round" />

      {/* Full Surround Balloon Arch Orbiting the Hoop */}
      <g>
        {/* Top & Left clusters */}
        <circle cx="120" cy="80" r="19" fill={colours[0] || '#D8A49B'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="112" cy="115" r="22" fill={colours[1] || '#FAF6F0'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="120" cy="150" r="20" fill={colours[2] || '#C5A059'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="140" cy="178" r="23" fill={colours[3] || '#C4B5A5'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="175" cy="190" r="21" fill={colours[4] || '#C4B5D6'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />

        {/* Top arch clusters */}
        <circle cx="145" cy="52" r="21" fill={colours[2] || '#C5A059'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="185" cy="40" r="23" fill={colours[0] || '#D8A49B'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="225" cy="48" r="20" fill={colours[1] || '#FAF6F0'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />

        {/* Right side clusters */}
        <circle cx="255" cy="75" r="22" fill={colours[3] || '#C4B5A5'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="265" cy="115" r="20" fill={colours[0] || '#D8A49B'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="255" cy="152" r="22" fill={colours[2] || '#C5A059'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
        <circle cx="235" cy="180" r="19" fill={colours[1] || '#FAF6F0'} stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
      </g>

      {/* Center Black Disc / Sign: "Happy Birthday" */}
      <rect x="142" y="90" width="96" height="52" rx="10" fill="#1C1E1B" stroke="#D9B668" strokeWidth="1.2" />
      <text x="190" y="112" textAnchor="middle" fill="#FFFFFF" fontFamily="'Playfair Display', Georgia, serif" fontSize="13" fontWeight="700">
        Happy
      </text>
      <text x="190" y="129" textAnchor="middle" fill="#FFFFFF" fontFamily="'Playfair Display', Georgia, serif" fontSize="13" fontWeight="700">
        Birthday
      </text>

      {/* Right: 3D Metallic Foil Numbers (30) with Ribbons on Weight */}
      {rawDigits && (
        <g transform="translate(305, 110)">
          {/* Balloon strings to weight */}
          <line x1="-10" y1="20" x2="-2" y2="105" stroke="#C5A059" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="12" y1="20" x2="2" y2="105" stroke="#C5A059" strokeWidth="1" strokeDasharray="2,2" />
          {/* Mini weight cluster */}
          <ellipse cx="0" cy="115" rx="16" ry="6" fill="url(#dossierGoldShine)" />
          <circle cx="-6" cy="110" r="7" fill={colours[0] || '#D8A49B'} />
          <circle cx="6" cy="110" r="7" fill={colours[1] || '#FAF6F0'} />
          <circle cx="0" cy="105" r="6" fill={colours[2] || '#C5A059'} />

          {/* 3D Foil Number Graphics */}
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontFamily="'Montserrat', sans-serif"
            fontSize="46"
            fontWeight="900"
            fill="url(#dossierGoldShine)"
            stroke="#8A6B29"
            strokeWidth="1.2"
            letterSpacing="1"
            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
          >
            {rawDigits}
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * ---------------------------------------------------------------------------
 * MINI EVENT CALENDAR COMPONENT (High-contrast monthly grid matching mockup)
 * ---------------------------------------------------------------------------
 */
function MiniEventCalendar({ eventDateStr, client }) {
  let targetDate = null;
  if (eventDateStr) {
    if (eventDateStr.includes('-')) {
      const parts = eventDateStr.split('-');
      targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else if (eventDateStr.includes('/')) {
      const parts = eventDateStr.split('/');
      targetDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  if (!targetDate || isNaN(targetDate.getTime())) {
    targetDate = new Date(2026, 10, 14); // Default to Nov 14, 2026
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthName = monthNames[month];

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  return (
    <div className="oe-dossier-calendar-card">
      <div className="oe-cal-widget-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
          <strong style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.15rem', color: '#1C1E1B', letterSpacing: '0.04em' }}>
            {year}
          </strong>
          <strong style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', color: '#1C1E1B', letterSpacing: '0.06em' }}>
            {monthName}
          </strong>
        </div>

        {/* Weekday Row with Coral Red SUN Pill */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#78716C', marginBottom: '0.4rem' }}>
          <div><span className="oe-cal-sun-pill">SUN</span></div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center' }}>
          {daysGrid.map((dVal, i) => {
            if (!dVal) return <span key={i} style={{ height: '24px' }} />;
            const isTargetDay = dVal === day;
            const isEve = dVal === day - 1;
            return (
              <div key={i} style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isTargetDay ? (
                  <span className="oe-cal-event-pill-gold">{dVal}</span>
                ) : isEve ? (
                  <span className="oe-cal-event-pill-soft">{dVal}</span>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: '#44403C', fontWeight: 600 }}>{dVal}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date & Time Footer Meta Labels */}
      <div className="oe-cal-meta-footer-labels">
        <div>
          <span style={{ display: 'block', fontSize: '0.62rem', color: '#78716C' }}>DATE</span>
          <strong style={{ fontSize: '0.8rem', color: '#1C1E1B' }}>
            {String(day).padStart(2, '0')}/{String(month + 1).padStart(2, '0')}/{year}
          </strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: '0.62rem', color: '#78716C' }}>TIME</span>
          <strong style={{ fontSize: '0.8rem', color: '#1C1E1B' }}>
            {client?.eventTime || '11:00 AM'}
          </strong>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Monthly Booking Calendar Landing View (media_1793456612681.png)
 */
function MasterCalendarLandingView({ orders = [], onSelectOrder }) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 0-indexed, 10 = November 2026 (matching scheduled orders)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startingCol = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const ordersByDay = {};
  orders.forEach(ord => {
    const dStr = ord.client?.eventDate || '';
    let ordDay = null;
    let ordMonth = null;
    let ordYear = null;
    if (dStr.includes('/')) {
      const parts = dStr.split('/');
      ordDay = parseInt(parts[0], 10);
      ordMonth = parseInt(parts[1], 10) - 1;
      ordYear = parseInt(parts[2], 10);
    } else if (dStr.includes('-')) {
      const parts = dStr.split('-');
      ordYear = parseInt(parts[0], 10);
      ordMonth = parseInt(parts[1], 10) - 1;
      ordDay = parseInt(parts[2], 10);
    }
    if (ordYear === currentYear && ordMonth === currentMonth && ordDay) {
      if (!ordersByDay[ordDay]) ordersByDay[ordDay] = [];
      ordersByDay[ordDay].push(ord);
    }
  });

  // Strict Operational Segregation:
  // "Upcoming Bookings" MUST be real bookings (Confirmed or Deposit Paid).
  // "New Enquiries" are unconfirmed requests needing review/quote.
  const upcomingBookings = orders.filter(o => {
    const st = (o.status || '').toLowerCase();
    return st.includes('confirm') || st.includes('deposit') || st.includes('booked');
  });

  const newEnquiries = orders.filter(o => {
    const st = (o.status || '').toLowerCase();
    return st.includes('enquiry') || st.includes('new');
  });

  const upcomingList = upcomingBookings.slice(0, 3);
  const newEnquiriesCount = newEnquiries.length;

  const totalCells = startingCol + daysInMonth;
  const totalRows = Math.ceil(totalCells / 7);
  const cells = [];
  for (let i = 0; i < totalRows * 7; i++) {
    const dayNum = i - startingCol + 1;
    if (i < startingCol || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(dayNum);
    }
  }

  return (
    <div className="oe-master-calendar-landing-pane">
      <div className="oe-cal-landing-header">
        <h3 className="oe-cal-main-title">ORDERS</h3>
      </div>

      {/* Warm Beige Summary Box (media_1793456612681.png) */}
      <div className="oe-cal-summary-banner">
        <div className="oe-cal-upcoming-col">
          <span className="oe-cal-banner-label">UPCOMING</span>
          <div className="oe-cal-upcoming-list">
            {upcomingList.length > 0 ? (
              upcomingList.slice(0, 2).map((item, idx) => (
                <div key={idx} className="oe-cal-upcoming-item" onClick={() => onSelectOrder(item.id)}>
                  <strong>{item.client?.eventDate || '14/11/2026'}, {item.client?.eventTime || '11:00'}</strong>
                  <span> · {item.client?.name} ({item.client?.venue || item.client?.postcode || 'Bottesford'})</span>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4A4843' }}>No upcoming events scheduled</p>
            )}
          </div>
        </div>

        <div className="oe-cal-enquiries-col">
          <span className="oe-cal-banner-label">NEW ENQUIRIES</span>
          <div className="oe-cal-enquiry-badge-wrap">
            <span className="oe-cal-enquiry-yellow-pill">{newEnquiriesCount}</span>
          </div>
        </div>
      </div>

      {/* Main Monthly Calendar Grid Card */}
      <div className="oe-calendar-full-card">
        <div className="oe-cal-month-nav">
          <h4 className="oe-cal-month-name">{monthNames[currentMonth]} {currentYear}</h4>
          <div className="oe-cal-nav-btns">
            <button type="button" onClick={handlePrevMonth} className="oe-cal-nav-arrow" title="Previous Month">‹</button>
            <button type="button" onClick={handleToday} className="oe-cal-today-btn">Today</button>
            <button type="button" onClick={handleNextMonth} className="oe-cal-nav-arrow" title="Next Month">›</button>
          </div>
        </div>

        <div className="oe-cal-weekdays-row">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>

        <div className="oe-cal-days-grid">
          {cells.map((dayNum, cellIdx) => {
            if (!dayNum) {
              return <div key={`empty-${cellIdx}`} className="oe-cal-day-box empty" />;
            }
            const todayObj = new Date();
            const isToday = currentYear === todayObj.getFullYear() && currentMonth === todayObj.getMonth() && dayNum === todayObj.getDate();
            const dayOrders = ordersByDay[dayNum] || [];

            return (
              <div key={`day-${dayNum}`} className={`oe-cal-day-box ${isToday ? 'is-today' : ''}`}>
                <div className="oe-cal-day-num-bar">
                  <span className={`oe-cal-day-number ${isToday ? 'today-pill' : ''}`}>{dayNum}</span>
                </div>

                <div className="oe-cal-day-events">
                  {dayOrders.map((ord, oIdx) => {
                    const status = (ord.status || '').toLowerCase();
                    const isConf = status.includes('confirm');
                    const isDep = status.includes('deposit');
                    const chipClass = isConf ? 'chip-green' : isDep ? 'chip-blue' : 'chip-amber';

                    return (
                      <button
                        key={ord.id || oIdx}
                        type="button"
                        onClick={() => onSelectOrder(ord.id)}
                        className={`oe-cal-event-chip ${chipClass}`}
                        title={`Click to view dossier for ${ord.client?.name || ord.id}`}
                      >
                        <span className="chip-dot" />
                        <span className="chip-title">{ord.client?.name || ord.id}</span>
                        <span className="chip-time">{ord.client?.eventTime || '11:00'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * WORKSHOP BALLOON PULL LIST & RECIPE ENGINE
 * Implements the Largest Remainder Method formula to distribute S, M, L balloons
 * across the client's chosen palette colours, giving Laura an exact packing list.
 * ---------------------------------------------------------------------------
 */
function WorkshopBalloonPullList({ garlandId, palette, balloonColours, isExpandedDefault = true }) {
  const [totalBalloons, setTotalBalloons] = useState(120);
  const [smallCount, setSmallCount] = useState(35);
  const [medCount, setMedCount] = useState(65);
  const [largeCount, setLargeCount] = useState(20);
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

  const paletteColorsList = (palette?.colourIds || ['soft-blush', 'pearl-white', 'champagne-gold', 'nude-stone', 'soft-lilac']).map(id => {
    const found = (balloonColours || []).find(b => b.id === id);
    return found || { id, name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), hex: '#D8A49B' };
  });

  const pullList = calculateBalloonPullList(
    { sku: 'GARL-ARCH-FULL', name: 'Full Surround Statement Arch' },
    paletteColorsList,
    { total: totalBalloons, small: smallCount, med: medCount, large: largeCount, bufferPercent: 8 }
  );

  return (
    <div className="oe-pull-list-card">
      <div className="oe-pull-list-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="oe-sku-badge">GARL-ARCH-FULL</span>
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
function MasterOrdersDashboard({
  isOpen,
  onClose,
  quotes = [],
  onUpdateQuoteStatus,
  onDeleteQuote,
  catalog = [],
  steps = [],
  digitOptions = [],
  balloonColours = [],
  curatedPalettes = [],
  deliveryConfig = INITIAL_DELIVERY_CONFIG,
  studioSettings = {},
  onUpdateStudioSettings,
  sheetConfig = {},
  onSyncFromSheet,
  flashToast
}) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'inventory' | 'colours' | 'settings'
  const [selectedOrderId, setSelectedOrderId] = useState(null); // Defaults to Calendar Landing Mode
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderSortBy, setOrderSortBy] = useState('date-desc');
  const [inventoryDeptFilter, setInventoryDeptFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');

  // Starter bookings matching user mockup (media_1793456612681.png)
  const DEMO_ORDERS = [
    {
      id: 'Order_2025/26_101',
      status: 'New Enquiry',
      client: {
        name: 'Sophie Turner',
        phone: '07891 234567',
        email: 'sophie.turner@gmail.com',
        eventDate: '14/11/2026',
        postcode: 'NG1 2GJ',
        eventTime: '11:00',
        venue: 'Vale of Belvoir Country Hotel'
      },
      configuration: {
        paletteId: 'soft-blush',
        backdropId: 'balloon-hoop',
        balloonId: 'garland-full',
        digitOptionId: 'helium-foil-numbers',
        digitsOrLetters: '30',
        extraIds: ['neon-sign'],
        subtotal: 282,
        discount: 35,
        deliverySurcharge: 20,
        estimatedTotal: 267,
        depositPaid: 0,
        balanceDue: 267
      }
    },
    {
      id: 'Order_2025/26_102',
      status: 'Deposit Paid',
      client: {
        name: 'Charlotte Davies',
        phone: '07730 900123',
        email: 'c.davies@outlook.com',
        eventDate: '21/11/2026',
        postcode: 'NG13 8EB',
        eventTime: '13:30',
        venue: 'Bottesford Community Pavilion'
      },
      configuration: {
        paletteId: 'soft-blush',
        backdropId: 'circular-hoop-gold',
        balloonId: 'full-arch',
        digitOptionId: 'stacks-foil',
        digitsOrLetters: '21',
        subtotal: 220,
        discount: 5,
        estimatedTotal: 215,
        depositPaid: 50,
        balanceDue: 165
      }
    },
    {
      id: 'Order_2025/26_103',
      status: 'Confirmed',
      client: {
        name: 'Emma Watson',
        phone: '07912 345678',
        email: 'emma.watson@icloud.com',
        eventDate: '27/11/2026',
        postcode: 'NG32 6YY',
        eventTime: '15:00',
        venue: 'Grantham Heritage Hall'
      },
      configuration: {
        paletteId: 'after-dark',
        backdropId: 'arch-board-wood',
        balloonId: 'garland-side',
        digitOptionId: 'stacks-basic',
        digitsOrLetters: '18',
        subtotal: 180,
        discount: 0,
        estimatedTotal: 180,
        depositPaid: 100,
        balanceDue: 80
      }
    }
  ];

  const effectiveQuotes = quotes && quotes.length > 0 ? quotes : DEMO_ORDERS;

  const filteredAndSortedQuotes = useMemo(() => {
    let list = [...effectiveQuotes];
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const c = item.client || {};
        return (
          (item.id && item.id.toLowerCase().includes(q)) ||
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.postcode && c.postcode.toLowerCase().includes(q)) ||
          (c.venue && c.venue.toLowerCase().includes(q)) ||
          (item.status && item.status.toLowerCase().includes(q))
        );
      });
    }
    list.sort((a, b) => {
      const cA = a.client || {};
      const cB = b.client || {};
      const totalA = a.configuration?.estimatedTotal || a.configuration?.subtotal || 0;
      const totalB = b.configuration?.estimatedTotal || b.configuration?.subtotal || 0;
      if (orderSortBy === 'date-asc') {
        return (cA.eventDate || '').localeCompare(cB.eventDate || '');
      } else if (orderSortBy === 'date-desc') {
        return (cB.eventDate || '').localeCompare(cA.eventDate || '');
      } else if (orderSortBy === 'total-desc') {
        return totalB - totalA;
      } else if (orderSortBy === 'total-asc') {
        return totalA - totalB;
      } else if (orderSortBy === 'name-asc') {
        return (cA.name || '').localeCompare(cB.name || '');
      } else if (orderSortBy === 'id-desc') {
        return (b.id || '').localeCompare(a.id || '');
      }
      return 0;
    });
    return list;
  }, [effectiveQuotes, orderSearchQuery, orderSortBy]);

  if (!isOpen) return null;

  const activeQuote = effectiveQuotes.find(q => q.id === selectedOrderId) || null;
  const client = activeQuote?.client || {};
  const cfg = activeQuote?.configuration || {};
  const palette = curatedPalettes.find(p => p.id === cfg.paletteId) || curatedPalettes[1] || curatedPalettes[0];
  const total = cfg.estimatedTotal || cfg.subtotal || 297;

  // Extract digits or letters into box pills (e.g. "30" -> [3] [0])
  const digitText = String(cfg.digitsOrLetters || cfg.digitText || '30').replace(/[^a-zA-Z0-9]/g, '');
  const digitPills = digitText.split('');

  const taxYear = getUkTaxYear().slash;

  return (
    <div className="oe-master-dashboard-backdrop" onClick={onClose}>
      <div className="oe-master-dashboard-modal" onClick={e => e.stopPropagation()}>
        {/* Soft, Luxury Top Bar */}
        <div className="oe-master-dashboard-topbar">
          <div className="oe-master-brand-block">
            <span className="oe-master-title">THE Occasion Edit — Master Sheet</span>
            <span className="oe-master-tax-tag">Tax Year {taxYear}</span>
            {sheetConfig.webAppUrl && (
              <span className="oe-master-sync-badge" title="Connected to Google Sheets">✓ Google Sheet Linked</span>
            )}
          </div>

          {/* Luxury File Tabs */}
          <div className="oe-master-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`oe-master-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            >
              Tab 1: Orders ({effectiveQuotes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`oe-master-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            >
              Tab 2: Inventory ({catalog.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'colours'}
              onClick={() => setActiveTab('colours')}
              className={`oe-master-tab-btn ${activeTab === 'colours' ? 'active' : ''}`}
            >
              Tab 3: Balloon Colours ({balloonColours.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              className={`oe-master-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            >
              Tab 4: Settings &amp; Banking
            </button>
          </div>

          <button type="button" onClick={onClose} className="oe-master-close-pill">
            ✕ Close
          </button>
        </div>

        {/* TAB 1: ORDERS & PRODUCTION DOSSIER (Dual Pane Split) */}
        {activeTab === 'orders' && (
          <div className="oe-master-orders-split">
            {/* Left Pane: Master Sheet Table */}
            <div className="oe-master-table-pane">
              <div className="oe-table-pane-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5C5852' }}>
                    Client Bookings &amp; Enquiries ({filteredAndSortedQuotes.length})
                  </span>
                  {onSyncFromSheet && (
                    <button type="button" onClick={onSyncFromSheet} className="oe-mini-admin-btn">
                      ↻ Pull from Sheet
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search client, phone, ID, date..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.74rem',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <select
                    value={orderSortBy}
                    onChange={(e) => setOrderSortBy(e.target.value)}
                    style={{
                      padding: '0.35rem 0.55rem',
                      fontSize: '0.74rem',
                      borderRadius: '6px',
                      border: '1px solid #D6D3D1',
                      background: '#FFFFFF',
                      outline: 'none',
                      fontFamily: 'inherit',
                      color: '#44403C'
                    }}
                  >
                    <option value="date-desc">Date (Newest)</option>
                    <option value="date-asc">Date (Earliest)</option>
                    <option value="total-desc">Total (£ High-Low)</option>
                    <option value="total-asc">Total (£ Low-High)</option>
                    <option value="id-desc">Order ID</option>
                    <option value="name-asc">Client Name</option>
                  </select>
                </div>
              </div>

              <div className="oe-master-table-scroll">
                <table className="oe-sheet-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Order ID</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Event Date</th>
                      <th>Postcode</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedQuotes.map(q => {
                      const isSelected = q.id === selectedOrderId;
                      const status = q.status || 'New Enquiry';
                      const isConfirmed = status.toLowerCase().includes('confirm');
                      const isDeposit = status.toLowerCase().includes('deposit');
                      const c = q.client || {};
                      const qTotal = q.configuration?.estimatedTotal || q.configuration?.subtotal || 0;

                      return (
                        <tr
                          key={q.id}
                          onClick={() => setSelectedOrderId(q.id)}
                          className={`oe-sheet-row ${isSelected ? 'is-selected' : ''}`}
                        >
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{q.id}</td>
                          <td>
                            <span className={`oe-sheet-status-pill ${isConfirmed ? 'confirmed' : isDeposit ? 'deposit' : 'new'}`}>
                              {isConfirmed ? 'Confirmed' : isDeposit ? 'Deposit Paid' : 'Enquiry'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.name || 'Anonymous Client'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{c.phone || '-'}</td>
                          <td>{c.eventDate || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{c.postcode || '-'}</td>
                          <td style={{ fontWeight: 800 }}>£{qTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Pane: Complete Order Dossier (User Mockup) */}
            {activeQuote ? (
              <div className="oe-order-dossier-pane">
                {/* Return to Calendar Breadcrumb */}
                {/* Return to Calendar Breadcrumb */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(null)}
                    className="oe-mini-admin-btn"
                    style={{ background: '#E2DDD5', color: '#1C1E1B', fontWeight: 700, border: '1px solid #D6CFBE' }}
                  >
                    ← Back to Calendar
                  </button>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#C5A059' }}>
                    {activeQuote.id}
                  </span>
                </div>

                {/* 1. Header Banner Card (media_1793459929283.png) */}
                <div className="oe-dossier-header-card">
                  <div>
                    <span className="oe-dossier-order-id-label">ORDER ID: {activeQuote.id}</span>
                    <div className="oe-dossier-customer-meta">
                      <span className="oe-dossier-section-title">CUSTOMER DETAILS</span>
                      <h3 className="oe-dossier-client-name">{client.name || 'Sophie Turner'}</h3>
                      <p className="oe-dossier-client-contacts">
                        📞 {client.phone || '07891 234567'} · ✉️ {client.email || 'sophie.turner@gmail.com'} · 📍 {client.postcode || 'NG1 2GJ'}
                      </p>
                    </div>
                  </div>

                  <div className="oe-dossier-price-callout">
                    <span className="oe-dossier-section-title">GUIDE PRICE</span>
                    <div className="guide-badge-yellow">£{total}</div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#5C5852', letterSpacing: '0.04em' }}>
                      PRODUCTS &amp; SURCHARGES
                    </span>
                    <div className="oe-dossier-deposit-strip">
                      <span>Deposit: £</span>
                      <input
                        type="number"
                        min="0"
                        max={total}
                        defaultValue={cfg.depositPaid || 0}
                        id="dossier-deposit-input"
                        className="oe-dossier-deposit-input"
                        placeholder="50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const inp = document.getElementById('dossier-deposit-input');
                          const val = inp ? parseFloat(inp.value) || 0 : 0;
                          const nextStatus = val > 0 ? 'Deposit Paid' : 'New Enquiry';
                          onUpdateQuoteStatus(activeQuote.id, nextStatus, val);
                          if (flashToast) flashToast(`✓ Deposit of £${val} recorded for ${activeQuote.id}`);
                        }}
                        className="oe-dossier-deposit-btn"
                        title="Record deposit amount and sync to Google Sheet"
                      >
                        ✓ Record
                      </button>
                    </div>
                  </div>

                  <div className="oe-dossier-status-block">
                    <span className="oe-dossier-section-title">STATUS</span>
                    <span className={`oe-status-pill-yellow ${(activeQuote.status || '').toLowerCase().includes('confirm') ? 'confirmed' : ''}`}>
                      {(activeQuote.status || 'ENQUIRY').toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (activeQuote.status || '').toLowerCase();
                        let next = 'Confirmed';
                        if (cur.includes('confirm')) {
                          next = (cfg.depositPaid || 0) > 0 ? 'Deposit Paid' : 'New Enquiry';
                        }
                        onUpdateQuoteStatus(activeQuote.id, next, cfg.depositPaid || 0);
                        if (flashToast) flashToast(`✓ Order ${activeQuote.id} marked as ${next}`);
                      }}
                      className="oe-btn-confirm-toggle"
                    >
                      {(activeQuote.status || '').toLowerCase().includes('confirm') ? 'Revert to Enquiry' : 'CLICK TO CONFIRM'}
                    </button>
                  </div>
                </div>

                {/* 2. Middle Content Grid (3D Stage + 3 Breakdown Ingredient Cards) */}
                <div className="oe-dossier-middle-grid">
                  {/* Left: 3D Visual Stage Box Framed in Deep Botanical Olive (#4A5840) */}
                  <div className="oe-dossier-visual-box">
                    <div className="oe-visual-canvas-stage">
                      <DossierVisualArtwork
                        activeQuote={activeQuote}
                        palette={palette}
                        balloonColours={balloonColours}
                      />
                    </div>

                    {/* Canvas Footer Bar */}
                    <div className="oe-visual-footer-bar">
                      <div className="oe-visual-swatch-row">
                        {(palette?.colourIds || ['soft-blush', 'pearl-white', 'champagne-gold', 'nude-stone', 'blush-pink']).map((cId, i) => {
                          const col = balloonColours.find(b => b.id === cId) || { hex: '#D8A49B' };
                          return (
                            <span
                              key={i}
                              className="oe-footer-swatch-dot"
                              style={{ background: col.hex }}
                              title={col.name || cId}
                            />
                          );
                        })}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#FAF6F0', fontWeight: 600 }}>
                        Circular Hoop + Full Surround Garland (£180) · Numbers/Letters (&quot;30&quot;) (£52) · Neon Sign (£35)
                      </div>

                      <div style={{ fontWeight: 800, color: '#C5A059' }}>
                        Estimated Total: £{total}
                      </div>
                    </div>
                  </div>

                  {/* Right: Specification Tray Housed in Warm Sand (#E2DDD5) */}
                  <div className="oe-dossier-spec-tray">
                    {/* Palette Card */}
                    <div className="oe-dossier-palette-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#1C1E1B' }}>
                          {palette?.name ? (palette.name.startsWith('02.') ? palette.name : '02. ' + palette.name.replace(/^\d+[\.\s]+/, '')) : '02. Soft Blush & Pearl Romance'}
                        </strong>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#5F6A49', background: '#F1EFEA', padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
                          Selected
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.74rem', color: '#5C5852' }}>
                        {palette.description || 'Soft blush pinks, warm taupe and luminous pearl ivory.'}
                      </p>
                      <div className="oe-dossier-swatches-strip">
                        {(palette.colourIds || ['soft-blush', 'pearl-white', 'champagne-gold', 'nude-stone', 'blush-pink']).map((cId) => {
                          const col = balloonColours.find(b => b.id === cId) || { name: cId, hex: '#D8A49B' };
                          return (
                            <div key={cId} className="oe-dossier-swatch-chip">
                              <BalloonGraphic hex={col.hex} size={26} />
                              <span style={{ fontSize: '0.62rem', color: '#4A4843', marginTop: '2px' }}>{col.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Workshop Balloon Pull List & Recipe Engine */}
                    <WorkshopBalloonPullList
                      garlandId={cfg.balloonId || 'garland-full'}
                      palette={palette}
                      balloonColours={balloonColours}
                      isExpandedDefault={true}
                    />

                    {/* 4 Structured Ingredient Breakdown Cards with Exact Workshop SKUs & Billed Prices */}
                    <div className="oe-dossier-ingredients-row">
                      {/* Card 1: Backdrop / Hoop */}
                      <div className="oe-ingredient-card">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span className="oe-sku-badge-sm">PROP-HOOP-GLD</span>
                            <span className="oe-ingredient-tag">Hire Prop</span>
                          </div>
                          <img
                            src="/public/assets/uploads/studio-b4bebf696048.jpg"
                            alt="Circular Gold Balloon Hoop Frame"
                            className="oe-ingredient-thumb"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="oe-ingredient-title">Circular Gold Balloon Hoop Frame</div>
                          <div className="oe-ingredient-price">£140.00</div>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#78716C', lineHeight: 1.2 }}>
                            Circular gold statement frame package rate (£140.00 with garland)
                          </p>
                        </div>
                        <div className="oe-ingredient-footer">
                          <span className="oe-ingredient-selected">✓ Selected</span>
                        </div>
                      </div>

                      {/* Card 2: Balloon Garland */}
                      <div className="oe-ingredient-card">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span className="oe-sku-badge-sm">GARL-ARCH-FULL</span>
                            <span className="oe-ingredient-tag keep">Yours to Keep</span>
                          </div>
                          <img
                            src="/public/assets/uploads/studio-51d07c00e163.jpg"
                            alt="Full Surround Statement Balloon Arch"
                            className="oe-ingredient-thumb"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="oe-ingredient-title">Full Surround Statement Balloon Arch</div>
                          <div className="oe-ingredient-price">£90.00</div>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#78716C', lineHeight: 1.2 }}>
                            Package upgrade rate (120 organic balloons across 5 shades)
                          </p>
                        </div>
                        <div className="oe-ingredient-footer">
                          <span className="oe-ingredient-selected">✓ Selected</span>
                        </div>
                      </div>

                      {/* Card 3: Helium Numbers with Cyan Box Pills */}
                      <div className="oe-ingredient-card">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span className="oe-sku-badge-sm">HEL-NUM-2DIG</span>
                            <span className="oe-ingredient-tag keep">Yours to Keep</span>
                          </div>
                          <img
                            src="/public/assets/uploads/studio-f3089456573c.jpg"
                            alt="Helium Foil Numbers Double"
                            className="oe-ingredient-thumb"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="oe-ingredient-title">Helium Foil Numbers Double + 2 Clusters</div>
                          <div className="oe-ingredient-price">£52.00</div>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#78716C', lineHeight: 1.2 }}>
                            Giant 34&quot; foil numbers on weights with 2 weighted latex clusters
                          </p>
                        </div>
                        <div className="oe-ingredient-footer">
                          <div className="oe-digit-pills-row">
                            {digitPills.map((char, i) => (
                              <span key={i} className="oe-digit-blue-box">{char}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Neon Sign Extra */}
                      <div className="oe-ingredient-card">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span className="oe-sku-badge-sm">PROP-NEON-HBD</span>
                            <span className="oe-ingredient-tag">Hire Prop</span>
                          </div>
                          <img
                            src="/public/assets/inspire-birthday.jpg"
                            alt="LED Neon Script Sign"
                            className="oe-ingredient-thumb"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="oe-ingredient-title">LED Neon Script Sign (&quot;Happy Birthday&quot;)</div>
                          <div className="oe-ingredient-price">£35.00</div>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: '#78716C', lineHeight: 1.2 }}>
                            Warm white script LED neon mounted on gold hoop frame
                          </p>
                        </div>
                        <div className="oe-ingredient-footer">
                          <span className="oe-ingredient-selected">✓ Selected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Grid: Logistics (Map + Event Calendar) */}
                <div className="oe-dossier-bottom-grid">
                  {/* Left: Concentric Delivery Radius Map Card */}
                  <DossierRadiusMap client={client} deliveryConfig={deliveryConfig} />

                  {/* Right: Warm Event Calendar Card */}
                  <MiniEventCalendar eventDateStr={client.eventDate} client={client} />
                </div>
              </div>
            ) : (
              <MasterCalendarLandingView
                orders={effectiveQuotes}
                onSelectOrder={(id) => setSelectedOrderId(id)}
              />
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY TABLE */}
        {activeTab === 'inventory' && (
          <div className="oe-master-inventory-pane" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#1C1E1B', letterSpacing: '0.02em' }}>
                  Workshop Inventory &amp; Props Catalog
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#78716C' }}>
                  All items standardized by workshop SKU, department, and package formulas.
                </span>
              </div>
              
              {/* Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search SKU or item name..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    outline: 'none',
                    minWidth: '220px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div className="oe-inventory-dept-pills" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Departments', count: catalog.length },
                { id: 'Backdrops & Frames', label: 'Backdrops & Frames', count: catalog.filter(i => (i.department || i.section) === 'Backdrops & Frames').length },
                { id: 'Garlands & Arches', label: 'Garlands & Arches', count: catalog.filter(i => (i.department || i.section) === 'Garlands & Arches').length },
                { id: 'Numbers, Helium & Stacks', label: 'Numbers & Helium', count: catalog.filter(i => (i.department || i.section) === 'Numbers, Helium & Stacks').length },
                { id: 'Finishing Props & Extras', label: 'Finishing Props', count: catalog.filter(i => (i.department || i.section) === 'Finishing Props & Extras').length }
              ].map(dept => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setInventoryDeptFilter(dept.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: inventoryDeptFilter === dept.id ? '#4A5840' : '#E7E5E4',
                    background: inventoryDeptFilter === dept.id ? '#4A5840' : '#FFFFFF',
                    color: inventoryDeptFilter === dept.id ? '#FAF6F0' : '#44403C',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dept.label} ({dept.count})
                </button>
              ))}
            </div>

            <table className="oe-sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>SKU</th>
                  <th>DEPARTMENT</th>
                  <th>ITEM NAME &amp; SPECIFICATION</th>
                  <th style={{ textAlign: 'center' }}>TYPE</th>
                  <th style={{ textAlign: 'center' }}>TIER</th>
                  <th style={{ textAlign: 'right' }}>BASE RATE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {catalog
                  .filter(item => {
                    const matchesDept = inventoryDeptFilter === 'all' || (item.department || item.section) === inventoryDeptFilter;
                    const matchesSearch = !inventorySearch || 
                      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || 
                      (item.sku || item.id).toLowerCase().includes(inventorySearch.toLowerCase());
                    return matchesDept && matchesSearch;
                  })
                  .map(item => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#C5A059' }}>
                        {item.sku || item.id}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#78716C' }}>
                        {item.department || item.section}
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.82rem', color: '#1C1E1B', display: 'block' }}>{item.name}</strong>
                        <span style={{ fontSize: '0.68rem', color: '#57534E' }}>{item.style}</span>
                        {item.sku === 'GARL-ARCH-FULL' && (
                          <span style={{ display: 'inline-block', marginLeft: '0.4rem', padding: '1px 6px', background: '#F1EFEA', border: '1px solid #D6D3D1', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, color: '#4A5840' }}>
                            🧩 120-Balloon Formula Active
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: item.hireOnly ? '#FEF3C7' : '#DCFCE7',
                          color: item.hireOnly ? '#92400E' : '#166534'
                        }}>
                          {item.hireOnly ? 'Hire Prop' : 'Yours to Keep'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`oe-tier-pill ${item.tier || 'classic'}`}>
                          {(item.tier || 'classic').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#1C1E1B' }}>
                        £{item.basePrice}
                        {item.secondPrice ? <span style={{ fontSize: '0.68rem', color: '#78716C', display: 'block', fontWeight: 400 }}>/ £{item.secondPrice} (2-dig)</span> : null}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`oe-sheet-status-pill ${item.inStock ? 'confirmed' : 'new'}`}>
                          {item.inStock ? '✓ In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: BALLOON COLOURS */}
        {activeTab === 'colours' && (
          <div className="oe-master-colours-pane" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1C1E1B' }}>Balloon Colours &amp; Finishes</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
              {balloonColours.map((c, i) => (
                <div key={c.id} style={{ background: '#FAF6F0', border: '1px solid #D6D0C5', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <BalloonGraphic hex={c.hex} size={42} />
                  <p style={{ margin: '0.4rem 0 0', fontWeight: 700, fontSize: '0.8rem' }}>{c.name}</p>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>#{101 + i} · {c.finish}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & BANKING (Google Drive Folders & Bank Details) */}
        {activeTab === 'settings' && (
          <div className="oe-master-settings-pane" style={{ padding: '1.5rem', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#1C1E1B' }}>Studio Business Profile &amp; Document Automation</h4>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#5C5852' }}>
              These settings auto-populate into your generated Quotes and Invoices, and route PDF files directly into your Google Drive:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Studio Banking Box */}
              <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1.5px solid #D6D0C5' }}>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#1C1E1B', textTransform: 'uppercase' }}>Bank Transfer Template</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5C5852' }}>BANK NAME</label>
                    <input
                      type="text"
                      value={studioSettings.bankName || 'Barclays Business'}
                      onChange={(e) => onUpdateStudioSettings && onUpdateStudioSettings({ ...studioSettings, bankName: e.target.value })}
                      className="oe-form-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5C5852' }}>ACCOUNT NAME</label>
                    <input
                      type="text"
                      value={studioSettings.accountName || 'THE Occasion Edit'}
                      onChange={(e) => onUpdateStudioSettings && onUpdateStudioSettings({ ...studioSettings, accountName: e.target.value })}
                      className="oe-form-input"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5C5852' }}>SORT CODE</label>
                      <input
                        type="text"
                        value={studioSettings.sortCode || '20-00-00'}
                        onChange={(e) => onUpdateStudioSettings && onUpdateStudioSettings({ ...studioSettings, sortCode: e.target.value })}
                        className="oe-form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#5C5852' }}>ACCOUNT NUMBER</label>
                      <input
                        type="text"
                        value={studioSettings.accountNumber || '12345678'}
                        onChange={(e) => onUpdateStudioSettings && onUpdateStudioSettings({ ...studioSettings, accountNumber: e.target.value })}
                        className="oe-form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Drive Asset & Document Shortcuts */}
              <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1.5px solid #D6D0C5' }}>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#1C1E1B', textTransform: 'uppercase' }}>Google Drive Document Folders</h5>
                <p style={{ fontSize: '0.78rem', color: '#5C5852', margin: '0 0 0.75rem' }}>
                  Quotes, invoices, and photo assets are filed deterministically by Tax Year:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a
                    href="https://drive.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-doc-action-btn drive-link"
                    style={{ textAlign: 'center' }}
                  >
                    📂 Open Quotes Drive (Tax Year {taxYear}) ↗
                  </a>
                  <a
                    href="https://drive.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-doc-action-btn drive-link"
                    style={{ textAlign: 'center' }}
                  >
                    📂 Open Invoices Drive (Tax Year {taxYear}) ↗
                  </a>
                  <a
                    href="https://drive.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-doc-action-btn drive-link"
                    style={{ textAlign: 'center' }}
                  >
                    📂 Open Curated Looks Assets Drive ↗
                  </a>
                  <a
                    href="https://drive.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-doc-action-btn drive-link"
                    style={{ textAlign: 'center' }}
                  >
                    📂 Open Stock Products Assets Drive ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Clean Multi-Document Legal Modal with Dynamic Studio Hydration
 */
function LegalDocumentsModal({ isOpen, onClose, initialDocId = 'terms-and-conditions', studioSettings = {} }) {
  const [activeDocId, setActiveDocId] = useState(initialDocId);

  useEffect(() => {
    if (initialDocId) setActiveDocId(initialDocId);
  }, [initialDocId]);

  if (!isOpen) return null;

  const currentDoc = LEGAL_DOCUMENTS.find(d => d.id === activeDocId) || LEGAL_DOCUMENTS[0];

  // Dynamic Studio Hydration (replaces placeholders with Laura's live studio settings)
  const hydrateText = (text) => {
    if (!text) return '';
    return text
      .replace(/\[INSERT ADDRESS\]/g, studioSettings.studioAddress || 'Bottesford, Leicestershire, NG13')
      .replace(/\[INSERT EMAIL\]/g, studioSettings.studioEmail || 'hello@theoccasionedit.co.uk')
      .replace(/\[INSERT PRIVACY EMAIL\]/g, studioSettings.studioEmail || 'hello@theoccasionedit.co.uk')
      .replace(/\[INSERT PHONE\]/g, studioSettings.studioPhone || '07498 223594')
      .replace(/\[INSERT LEGAL NAME\]/g, studioSettings.businessTradingName || 'THE Occasion Edit')
      .replace(/\[INSERT WEBSITE ADDRESS\]/g, 'theoccasionedit.co.uk')
      .replace(/\[INSERT DATE\]/g, '1 November 2026');
  };

  return (
    <div className="oe-legal-modal-backdrop" onClick={onClose}>
      <div className="oe-legal-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="oe-legal-modal-header">
          <div>
            <span className="oe-dock-col-label">LEGAL &amp; COMPLIANCE</span>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.25rem', fontFamily: 'Cormorant Garamond, serif', color: '#1C1E1B' }}>
              THE Occasion Edit — Client Agreements &amp; Policies
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="oe-mini-admin-btn"
              title="Print document"
            >
              🖨️ Print
            </button>
            <button type="button" onClick={onClose} className="oe-master-close-pill">
              ✕ Close
            </button>
          </div>
        </div>

        {/* Legal Document Navigation Tabs */}
        <div className="oe-legal-tabs-bar" role="tablist">
          {LEGAL_DOCUMENTS.map(doc => (
            <button
              key={doc.id}
              type="button"
              role="tab"
              aria-selected={activeDocId === doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`oe-legal-tab-btn ${activeDocId === doc.id ? 'active' : ''}`}
            >
              {doc.title}
            </button>
          ))}
        </div>

        {/* Document Content Body */}
        <div className="oe-legal-document-body">
          <div className="oe-legal-doc-banner">
            <div>
              <h2 className="oe-legal-doc-title">{currentDoc.title}</h2>
              <p className="oe-legal-doc-sub">{currentDoc.subtitle}</p>
            </div>
            <span className="oe-legal-doc-badge">{currentDoc.badge} · v{currentDoc.version}</span>
          </div>

          <div className="oe-legal-paragraphs-container">
            {currentDoc.paragraphs.map((para, pIdx) => {
              const hydrated = hydrateText(para);
              const isNumberedHeading = /^\d+\.\s+[A-Z]/.test(hydrated) || /^[A-Z]\.\s+[A-Z]/.test(hydrated);
              const isMainTitle = pIdx === 0 || pIdx === 1;

              if (isMainTitle) {
                return (
                  <h4 key={pIdx} className="oe-legal-heading-main">
                    {hydrated}
                  </h4>
                );
              }
              if (isNumberedHeading) {
                return (
                  <h3 key={pIdx} className="oe-legal-heading-section">
                    {hydrated}
                  </h3>
                );
              }
              return (
                <p key={pIdx} className="oe-legal-paragraph">
                  {hydrated}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main App Component — Carbon-Copy WYSIWYG Studio Edition
 */
function App() {
  const [steps, setSteps] = useState(CONFIGURATOR_STEPS);
  const [balloonColours, setBalloonColours] = useState(INITIAL_BALLOON_COLOURS);
  const [curatedPalettes, setCuratedPalettes] = useState(INITIAL_CURATED_PALETTES);
  const [digitOptions, setDigitOptions] = useState(INITIAL_DIGIT_LETTER_OPTIONS);
  const [inspirationSlides, setInspirationSlides] = useState(INITIAL_INSPIRATION_SLIDES);
  const [catalog, setCatalog] = useState(FULL_CSV_CATALOG);
  const [offers, setOffers] = useState(INITIAL_OFFERS);
  const [seoSettings, setSeoSettings] = useState(INITIAL_SEO_SETTINGS);
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [deliveryConfig, setDeliveryConfig] = useState(INITIAL_DELIVERY_CONFIG);
  const [studioSettings, setStudioSettings] = useState({});
  const [showMasterDashboard, setShowMasterDashboard] = useState(false);
  const [sheetConfig, setSheetConfig] = useState({
    webAppUrl: '',
    sheetUrl: '',
    adminSecret: ''
  });
  const [loadedSheetRevisionMs, setLoadedSheetRevisionMs] = useState(0);

  // Studio Admin Authentication, WYSIWYG Mode & Calm Notification State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [csrfToken, setCsrfToken] = useState(null);
  const [unreadEnquiriesCount, setUnreadEnquiriesCount] = useState(0);
  const [quotes, setQuotes] = useState([]);

  // Modals & Slide-Over Drawers
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showBookingsDrawer, setShowBookingsDrawer] = useState(false);
  const [showSheetSyncDrawer, setShowSheetSyncDrawer] = useState(false);
  const [showLookRecipeEditor, setShowLookRecipeEditor] = useState(false);
  const [openLookRibbonId, setOpenLookRibbonId] = useState(null);
  const [openCatalogRibbonId, setOpenCatalogRibbonId] = useState(null);
  const [saveToast, setSaveToast] = useState('');
  const [isSavingSite, setIsSavingSite] = useState(false);

  // Unsaved-changes safety net: last published version + one-time draft restore check
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [baselineRequested, setBaselineRequested] = useState(false);
  const draftCheckedRef = useRef(false);

  const [inspireCategory, setInspireCategory] = useState('All');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [externalPreset, setExternalPreset] = useState(null);

  const [priceSectionFilter, setPriceSectionFilter] = useState('All');
  const [maxBudget, setMaxBudget] = useState(220);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [activeLegalDocId, setActiveLegalDocId] = useState('terms-and-conditions');

  const openLegalModal = (docId = 'terms-and-conditions') => {
    setActiveLegalDocId(docId);
    setShowLegalModal(true);
  };

  // Hydrate live site data from backend (/api/site-data) or localStorage fallback on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/site-data', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data || !data.ok) return;
        const sd = data.siteData || {};
        if (Array.isArray(sd.steps) && sd.steps.length > 0) setSteps(sd.steps);
        if (Array.isArray(sd.balloonColours) && sd.balloonColours.length > 0) setBalloonColours(sd.balloonColours);
        if (Array.isArray(sd.curatedPalettes) && sd.curatedPalettes.length > 0) setCuratedPalettes(sd.curatedPalettes);
        if (Array.isArray(sd.digitOptions) && sd.digitOptions.length > 0) setDigitOptions(sd.digitOptions);
        if (Array.isArray(sd.inspirationSlides) && sd.inspirationSlides.length > 0) setInspirationSlides(sd.inspirationSlides);
        if (Array.isArray(sd.catalog) && sd.catalog.length > 0) setCatalog(sd.catalog);
        if (Array.isArray(sd.offers) && sd.offers.length > 0) setOffers(sd.offers);
        if (sd.seo) setSeoSettings(prev => ({ ...prev, ...sd.seo }));
        if (Array.isArray(sd.faqs) && sd.faqs.length > 0) setFaqs(sd.faqs);
        if (sd.sheetConfig) setSheetConfig(prev => ({ ...prev, ...sd.sheetConfig }));
        if (data.isAdminAuthenticated) {
          setIsAdminUnlocked(true);
          setCsrfToken(data.csrfToken);
          setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('oe_studio_site_data_v7');
          if (cached) {
            const sd = JSON.parse(cached);
            if (Array.isArray(sd.steps)) setSteps(sd.steps);
            if (Array.isArray(sd.balloonColours)) setBalloonColours(sd.balloonColours);
            if (Array.isArray(sd.digitOptions)) setDigitOptions(sd.digitOptions);
            if (Array.isArray(sd.inspirationSlides)) setInspirationSlides(sd.inspirationSlides);
            if (Array.isArray(sd.catalog)) setCatalog(sd.catalog);
            if (Array.isArray(sd.faqs)) setFaqs(sd.faqs);
          }
        } catch (_e) {}
      })
      .finally(() => {
        if (isMounted) setBaselineRequested(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const flashToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(''), 4200);
  };

  // Derive Unified Catalog so Price Guide Cards stay 100% in sync with Builder prices & stock
  const unifiedCatalog = deriveUnifiedCatalog(catalog, steps, digitOptions);

  const buildSiteDataPayload = () => ({
    steps,
    balloonColours,
    curatedPalettes,
    digitOptions,
    inspirationSlides,
    catalog: unifiedCatalog,
    offers,
    seo: seoSettings,
    faqs,
    sheetConfig
  });

  // ---------------------------------------------------------------------------
  // Unsaved-changes safety net (Studio Mode only)
  // ---------------------------------------------------------------------------
  const DRAFT_KEY = 'oe_studio_unsaved_draft_v1';
  const currentSnapshot = JSON.stringify(buildSiteDataPayload());

  // Record the loaded site data as the "last published" version once
  useEffect(() => {
    if (baselineRequested && savedSnapshot === null) setSavedSnapshot(currentSnapshot);
  }, [baselineRequested, savedSnapshot, currentSnapshot]);

  const isDirty = isAdminUnlocked && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  const applySiteSnapshot = (snapshotStr) => {
    try {
      const sd = JSON.parse(snapshotStr);
      if (Array.isArray(sd.steps)) setSteps(sd.steps);
      if (Array.isArray(sd.balloonColours)) setBalloonColours(sd.balloonColours);
      if (Array.isArray(sd.curatedPalettes)) setCuratedPalettes(sd.curatedPalettes);
      if (Array.isArray(sd.digitOptions)) setDigitOptions(sd.digitOptions);
      if (Array.isArray(sd.inspirationSlides)) setInspirationSlides(sd.inspirationSlides);
      if (Array.isArray(sd.catalog)) setCatalog(sd.catalog);
      if (Array.isArray(sd.offers)) setOffers(sd.offers);
      if (sd.seo) setSeoSettings(sd.seo);
      if (Array.isArray(sd.faqs)) setFaqs(sd.faqs);
      if (sd.sheetConfig) setSheetConfig(sd.sheetConfig);
    } catch (_e) {}
  };

  // Warn before closing or refreshing the tab with unsaved edits
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Offer to restore an unsaved draft once, after Studio Mode is unlocked
  useEffect(() => {
    if (!isAdminUnlocked || savedSnapshot === null || draftCheckedRef.current) return;
    draftCheckedRef.current = true;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && draft !== savedSnapshot) {
        if (window.confirm('You have unsaved changes from last time.\n\nOK = restore my changes\nCancel = start from the published website')) {
          applySiteSnapshot(draft);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } else if (draft) {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (_e) {}
  }, [isAdminUnlocked, savedSnapshot]);

  // Keep a draft of unsaved edits (website content only — never customer enquiries)
  useEffect(() => {
    if (!draftCheckedRef.current) return;
    try {
      if (isDirty) localStorage.setItem(DRAFT_KEY, currentSnapshot);
      else localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
  }, [isDirty, currentSnapshot]);

  const handleDiscardChanges = () => {
    if (savedSnapshot === null) return;
    if (!window.confirm('Discard all unsaved changes and go back to the published website?')) return;
    applySiteSnapshot(savedSnapshot);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
    flashToast('↺ Changes discarded.');
  };

  const handleLockStudio = async () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Lock Studio Mode and discard them?')) return;
      applySiteSnapshot(savedSnapshot);
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_e) {}
    draftCheckedRef.current = false;
    setIsEditMode(false);
    setIsAdminUnlocked(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_e) {}
  };

  // Save & Publish All Edits to Backend + LocalStorage + Optional Google Sheet
  const handleSaveAndPublish = async (forceOverwrite = false) => {
    setIsSavingSite(true);
    const payload = buildSiteDataPayload();
    try {
      localStorage.setItem('oe_studio_site_data_v7', JSON.stringify(payload));
    } catch (_e) {}

    try {
      const res = await fetch('/api/site-data', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({
          siteData: payload,
          loadedSheetRevisionMs,
          forceOverwrite
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.sheetSync?.status === 'conflict') {
          if (window.confirm(`${data.sheetSync.message}\n\nClick OK to overwrite the Google Sheet with your website edits, or Cancel to pull from the Sheet first.`)) {
            await handleSaveAndPublish(true);
            return;
          }
        } else if (data.sheetSync?.sheetRevisionMs) {
          setLoadedSheetRevisionMs(data.sheetSync.sheetRevisionMs);
        }
        setSavedSnapshot(currentSnapshot);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (_e) {}
        flashToast('✓ Published live! Prices, stock, SEO & schema updated.');
      } else {
        setSavedSnapshot(currentSnapshot);
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (_e) {}
        flashToast(`Saved locally (${data.error || 'backend offline'})`);
      }
    } catch (_err) {
      setSavedSnapshot(currentSnapshot);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (_e) {}
      flashToast('✓ Saved to browser storage.');
    } finally {
      setIsSavingSite(false);
    }
  };

  // Verify Studio PIN (Default: 2026)
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAdminUnlocked(true);
        setIsEditMode(true);
        setCsrfToken(data.csrfToken);
        setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
        setShowPinModal(false);
        setPinInput('');
        flashToast('✦ Studio Mode Unlocked · Click any text, price, or photo to edit directly.');
        fetchAdminQuotes();
      } else {
        setPinError(data.error || 'Incorrect Studio PIN.');
      }
    } catch (_err) {
      if (pinInput.trim() === '2026') {
        setIsAdminUnlocked(true);
        setIsEditMode(true);
        setShowPinModal(false);
        setPinInput('');
        flashToast('✦ Studio Mode Unlocked (Local Preview)');
      } else {
        setPinError('Incorrect Studio PIN.');
      }
    }
  };

  const fetchAdminQuotes = async () => {
    try {
      const res = await fetch('/api/quotes', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.ok && Array.isArray(data.quotes)) {
        setQuotes(data.quotes);
        setUnreadEnquiriesCount(data.unreadEnquiriesCount || 0);
      }
    } catch (_e) {}
  };

  const handleOpenBookingsDrawer = async () => {
    setShowBookingsDrawer(true);
    await fetchAdminQuotes();
    if (unreadEnquiriesCount > 0) {
      try {
        await fetch('/api/quotes/mark-seen', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-CSRF-Token': csrfToken || '' }
        });
        setUnreadEnquiriesCount(0);
      } catch (_e) {}
    }
  };

  const handleUpdateQuoteStatus = async (quoteId, newStatus, depositVal = null) => {
    setQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const nextQ = { ...q, status: newStatus };
        if (depositVal !== null && depositVal !== undefined) {
          const cfg = nextQ.configuration || {};
          const dep = parseFloat(depositVal) || 0;
          const tot = parseFloat(cfg.estimatedTotal || cfg.subtotal || 0);
          nextQ.configuration = {
            ...cfg,
            depositPaid: dep,
            balanceDue: Math.max(0, Math.round((tot - dep) * 100) / 100)
          };
        }
        return nextQ;
      }
      return q;
    }));
    try {
      const payload = { status: newStatus };
      if (depositVal !== null && depositVal !== undefined) {
        payload.depositPaid = parseFloat(depositVal) || 0;
      }
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok && typeof data.unreadEnquiriesCount === 'number') {
        setUnreadEnquiriesCount(data.unreadEnquiriesCount);
      }
    } catch (_e) {}
  };

  const handleDeleteQuoteGdpr = async (quoteId, clientName) => {
    if (!window.confirm(`Permanently erase enquiry ${quoteId} (${clientName}) from the website and Google Sheets for UK GDPR compliance?`)) {
      return;
    }
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    try {
      await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken || '' }
      });
      flashToast(`🗑 Erased enquiry ${quoteId} (GDPR).`);
    } catch (_e) {}
  };

  const handleExportSafeCsv = () => {
    const headers = ['Enquiry ID', 'Received At', 'Status', 'Client Name', 'Phone', 'Email', 'Event Date', 'Postcode', 'Palette', 'Backdrop', 'Garland', 'Digits/Letters', 'Extras', 'Estimated Total (GBP)', 'Notes'];
    const rows = quotes.map(q => [
      sanitizeCsvCell(q.id),
      sanitizeCsvCell(q.createdAt),
      sanitizeCsvCell(q.status || 'New Enquiry'),
      sanitizeCsvCell(q.client?.name),
      sanitizeCsvCell(q.client?.phone),
      sanitizeCsvCell(q.client?.email),
      sanitizeCsvCell(q.client?.eventDate),
      sanitizeCsvCell(q.client?.postcode),
      sanitizeCsvCell((q.configuration?.palette || []).join(', ')),
      sanitizeCsvCell(q.configuration?.backdrop),
      sanitizeCsvCell(q.configuration?.balloonLayout),
      sanitizeCsvCell(q.configuration?.digitsOrLetters),
      sanitizeCsvCell((q.configuration?.extras || []).join(', ')),
      sanitizeCsvCell(q.configuration?.estimatedTotal),
      sanitizeCsvCell(q.client?.notes)
    ]);
    const csvContent = [headers.map(sanitizeCsvCell).join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-occasion-edit-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Layer-1 + Layer-2 Photo Upload Pipeline
  const handleUploadPhotoForTarget = async (file, applyUrlCallback) => {
    try {
      flashToast('⏳ Compressing & stripping EXIF GPS metadata...');
      const compressedDataUrl = await compressAndStripExifJpeg(file, 1200, 0.82);
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
          },
          body: JSON.stringify({ imageDataUrl: compressedDataUrl })
        });
        const data = await res.json();
        if (res.ok && data.ok && data.url) {
          applyUrlCallback(data.url);
          flashToast('📷 Photo uploaded & EXIF GPS stripped! Click "Save & Publish" to make permanent.');
          return;
        }
      } catch (_e) {}
      applyUrlCallback(compressedDataUrl);
      flashToast('📷 Photo updated! Click "Save & Publish" to save.');
    } catch (err) {
      flashToast(`⚠️ Photo error: ${err.message}`);
    }
  };

  // Pull Latest Prices & Stock from Google Sheet (Two-Way Sync)
  const handlePullFromGoogleSheet = async () => {
    if (!sheetConfig.webAppUrl) {
      flashToast('⚠️ Paste your Google Apps Script Web App URL first.');
      return;
    }
    flashToast('⏳ Pulling latest prices & stock from Google Sheets...');
    try {
      const res = await fetch('/api/sync-from-sheet', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ webAppUrl: sheetConfig.webAppUrl })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.sheetRevisionMs) setLoadedSheetRevisionMs(data.sheetRevisionMs);
        if (Array.isArray(data.balloonColours) && data.balloonColours.length > 0) setBalloonColours(data.balloonColours);
        if (Array.isArray(data.inspirationSlides) && data.inspirationSlides.length > 0) setInspirationSlides(data.inspirationSlides);
        if (Array.isArray(data.offers) && data.offers.length > 0) setOffers(data.offers);
        if (Array.isArray(data.builderItems) && data.builderItems.length > 0) {
          setSteps(prevSteps =>
            prevSteps.map(st => ({
              ...st,
              items: st.items.map(it => {
                const match = data.builderItems.find(b => b.id === it.id);
                return match
                  ? {
                      ...it,
                      name: match.name || it.name,
                      price: Number(match.price ?? it.price),
                      packageBasePrice: match.packageBasePrice ? Number(match.packageBasePrice) : it.packageBasePrice,
                      packageLargePrice: match.packageLargePrice ? Number(match.packageLargePrice) : it.packageLargePrice,
                      inStock: Boolean(match.inStock),
                      image: match.image || it.image
                    }
                  : it;
              })
            }))
          );
        }
        flashToast('✓ Synced latest prices & stock from Google Sheet!');
      } else {
        flashToast(`⚠️ Sheet sync failed: ${data.error || 'Check Web App URL'}`);
      }
    } catch (_e) {
      flashToast('⚠️ Could not reach Google Sheet Web App.');
    }
  };

  // Mutators for Builder Items, Digit Options, Colours, Lookbook Slides & Catalog
  const updateBuilderItem = (stepId, itemId, patch) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          items: step.items.map(it => (it.id === itemId ? { ...it, ...patch } : it))
        };
      })
    );
  };

  const toggleBuilderItemStock = (stepId, itemId) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          items: step.items.map(it => (it.id === itemId ? { ...it, inStock: !it.inStock } : it))
        };
      })
    );
  };

  const updateDigitOption = (optId, patch) => {
    setDigitOptions(prev => prev.map(o => (o.id === optId ? { ...o, ...patch } : o)));
  };

  const toggleColourStock = (colourId) => {
    setBalloonColours(prev =>
      prev.map(c => (c.id === colourId ? { ...c, inStock: !c.inStock } : c))
    );
  };

  const updateColour = (colourId, patch) => {
    setBalloonColours(prev =>
      prev.map(c => (c.id === colourId ? { ...c, ...patch } : c))
    );
    flashToast(`✓ Updated colour shade to "${patch.name || 'Custom'}"`);
  };

  const addNewColour = (colourData) => {
    const nextCode = 101 + balloonColours.length;
    const newId = `colour-${Date.now()}`;
    const newColour = {
      id: newId,
      code: nextCode,
      name: colourData.name || `Shade #${nextCode}`,
      hex: colourData.hex || '#7A8C68',
      finish: colourData.finish || 'Matte',
      inStock: true
    };
    setBalloonColours(prev => [...prev, newColour]);
    flashToast(`✨ Added new shade #${nextCode}: ${newColour.name}!`);
  };

  const updateSlide = (slideId, patch) => {
    setInspirationSlides(prev =>
      prev.map(s => (s.id === slideId ? { ...s, ...patch } : s))
    );
  };

  const updateSlidePreset = (slideId, presetPatch) => {
    setInspirationSlides(prev =>
      prev.map(s => {
        if (s.id !== slideId) return s;
        const nextPreset = { ...(s.preset || {}), ...presetPatch };
        const calc = calculateLookRecipePrice(nextPreset, steps, digitOptions, balloonColours, curatedPalettes, s.cornerBanner);
        const autoDesc = generateLookDescription(nextPreset, steps, digitOptions, curatedPalettes);
        return {
          ...s,
          preset: nextPreset,
          description: autoDesc || s.description,
          guidePrice: calc.finalTotal || s.guidePrice
        };
      })
    );
  };

  const handleAddNewBlankLook = () => {
    const newLook = {
      id: `insp-${Date.now()}`,
      category: inspireCategory === 'All' ? 'Parties' : inspireCategory,
      title: 'New Bespoke Signature Look',
      description: 'Click to describe the backdrop, balloon palette, and finishing touches included in this setup.',
      guidePrice: 185,
      image: '/public/assets/inspire-birthday.jpg',
      isExampleWatermark: true,
      cornerBanner: { enabled: true, text: 'NEW LOOK', style: 'sage', position: 'top-right', discountType: 'none', discountValue: 0 },
      preset: {
        paletteId: curatedPalettes[0].id,
        backdropId: 'wooden-board',
        shimmerSize: 'small',
        balloonId: 'garland-7ft',
        digitOptionId: 'digits-none',
        digitText: '',
        extraIds: ['add-on-flowers']
      }
    };
    setInspirationSlides(prev => [newLook, ...prev]);
    setCarouselIndex(0);
    setShowLookRecipeEditor(true);
    flashToast('✦ Added new Lookbook card! Use "Compile Look from Stock" below to pick its items.');
  };

  const handleSaveBuilderSetupAsLook = (recipe, total) => {
    const newLook = {
      id: `insp-${Date.now()}`,
      category: 'Parties',
      title: 'New Custom 3D Builder Edit',
      description: 'Created directly from the 3D Studio Configurator. Click to customise the title or upload a venue photo.',
      guidePrice: total,
      image: '/public/assets/inspire-birthday.jpg',
      isExampleWatermark: true,
      cornerBanner: { enabled: true, text: 'NEW LOOK', style: 'gold', position: 'top-right', discountType: 'none', discountValue: 0 },
      preset: recipe
    };
    setInspirationSlides(prev => [newLook, ...prev]);
    setInspireCategory('All');
    setCarouselIndex(0);
    const el = document.getElementById('be-inspired');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    flashToast('✨ Saved your 3D Builder setup as a new Lookbook Card!');
  };

  const handleDeleteLookSlide = (slideId) => {
    if (inspirationSlides.length <= 1) return;
    if (!window.confirm('Remove this Look from the Lookbook carousel?')) return;
    setInspirationSlides(prev => prev.filter(s => s.id !== slideId));
    setCarouselIndex(0);
  };

  const updateCatalogCard = (cardId, patch) => {
    setCatalog(prev =>
      prev.map(card => {
        if (card.id !== cardId) return card;
        // Also propagate price/stock edits to linked Builder item if linked
        if (card.builderLink) {
          if (card.builderLink.type === 'digit' && typeof patch.basePrice === 'number') {
            updateDigitOption(card.builderLink.id, { basePrice: patch.basePrice });
          } else if (card.builderLink.type === 'step' && typeof patch.basePrice === 'number') {
            updateBuilderItem(card.builderLink.stepId, card.builderLink.id, {
              price: patch.basePrice,
              packageBasePrice: card.builderLink.usePackagePrice ? patch.basePrice : undefined
            });
          }
          if (typeof patch.inStock === 'boolean') {
            if (card.builderLink.type === 'digit') {
              updateDigitOption(card.builderLink.id, { inStock: patch.inStock });
            } else if (card.builderLink.type === 'step') {
              updateBuilderItem(card.builderLink.stepId, card.builderLink.id, { inStock: patch.inStock });
            }
          }
        }
        return { ...card, ...patch };
      })
    );
  };

  const handleSubmitCustomerQuote = async (quotePayload) => {
    setQuotes(prev => [quotePayload, ...prev]);
    setUnreadEnquiriesCount(prev => prev + 1);
    try {
      await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload)
      });
    } catch (_e) {}
  };

  const inspireCategories = ['All', 'Birthdays', 'Baby Showers', 'Anniversaries', 'Parties'];
  const filteredSlides = inspirationSlides.filter(
    s => inspireCategory === 'All' || s.category === inspireCategory
  );
  const activeSlide = filteredSlides[carouselIndex % Math.max(1, filteredSlides.length)] || inspirationSlides[0];
  const activeSlideRecipeCalc = activeSlide
    ? calculateLookRecipePrice(activeSlide.preset, steps, digitOptions, balloonColours, curatedPalettes, activeSlide.cornerBanner)
    : null;
  const activeSlideLivePrice = activeSlide
    ? (activeSlide.manualPriceOverride
        ? applyCornerBannerDiscount(activeSlide.guidePrice, activeSlide.cornerBanner)
        : (activeSlideRecipeCalc?.finalTotal || activeSlide.guidePrice))
    : 0;
  const activeSlideOriginalPrice = activeSlide
    ? (activeSlide.manualPriceOverride
        ? activeSlide.guidePrice
        : (activeSlideRecipeCalc?.originalTotal || activeSlide.guidePrice))
    : 0;

  const handleLoadInspirationIntoBuilder = (preset) => {
    setExternalPreset(preset);
    const el = document.getElementById('build-your-edit');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const priceSections = ['All', 'Backdrops, Walls & Garlands', 'Numbers, Helium & Gifts', 'Hire Props & Finishing Extras'];
  const filteredCatalog = unifiedCatalog.filter(item => {
    const matchesSection = priceSectionFilter === 'All' || item.section === priceSectionFilter;
    const matchesBudget = item.basePrice <= maxBudget;
    return matchesSection && matchesBudget;
  });

  return (
    <div className="oe-site-wrapper">
      {/* STICKY STUDIO ADMIN TOP BAR (Calm STUDIO OS) */}
      {isAdminUnlocked && (
        <div className="oe-studio-topbar" role="region" aria-label="Studio Admin Controls">
          <div className="oe-studio-topbar-left">
            <span className="oe-studio-mode-pill">
              ✦ STUDIO OS
            </span>

            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`oe-studio-bar-btn ${isEditMode ? 'active-toggle' : ''}`}
            >
              {isEditMode ? '✎ Edit Directly' : '👁 Customer View'}
            </button>

            <button
              type="button"
              onClick={() => setShowMasterDashboard(true)}
              className="oe-studio-bar-btn"
            >
              📊 Master Sheet &amp; Orders ({quotes.length})
              {unreadEnquiriesCount > 0 && (
                <span className="oe-notif-badge">🔔 {unreadEnquiriesCount} New</span>
              )}
            </button>
          </div>

          <div className="oe-studio-topbar-right">
            {isDirty && (
              <span className="oe-unsaved-badge">● Unsaved changes</span>
            )}
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="oe-studio-bar-btn discard-btn"
                title="Discard unsaved edits and restore published website"
              >
                ↺ Discard
              </button>
            )}
            {saveToast && (
              <span style={{ color: '#F3DFB2', fontWeight: 700, fontSize: '0.75rem' }}>
                {saveToast}
              </span>
            )}
            <button
              type="button"
              disabled={isSavingSite}
              onClick={() => handleSaveAndPublish(false)}
              className="oe-studio-bar-btn save-btn"
            >
              {isSavingSite ? 'Saving...' : '💾 Save & Publish'}
            </button>
            <button
              type="button"
              onClick={handleLockStudio}
              className="oe-studio-bar-btn"
              title="Lock Studio Admin"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: MOCKUP V1 HERO WITH CENTERED ANIMATED LOGO */}
      <header id="top" className="oe-hero-section">
        <img
          src="/public/assets/hero-v1-bg.jpg"
          alt="Luxury Sage, Pearl, Blush and Gold Balloon Crescent Arch"
          className="oe-hero-bg-photo"
          fetchpriority="high"
        />

        <div className="oe-hero-center-emblem">
          <div className="oe-hero-v1-circle-content">
            <span className="oe-hero-sparkle oe-sp-1" aria-hidden="true">✦</span>
            <span className="oe-hero-sparkle oe-sp-2" aria-hidden="true">✦</span>
            <span className="oe-hero-sparkle oe-sp-3" aria-hidden="true">✦</span>

            <span className="oe-hero-the">THE</span>
            <h1 className="oe-hero-title">
              <span>Occasion</span>
              <span className="oe-hero-edit-word">Edit</span>
            </h1>
            <a href="#build-your-edit" className="oe-hero-primary-btn">
              BUILD YOURS NOW
            </a>
          </div>
        </div>

        <nav className="oe-hero-floating-nav" aria-label="Primary Navigation">
          <a href="#build-your-edit" className="oe-hero-nav-link">
            BUILD YOUR OWN
          </a>
          <a href="#be-inspired" className="oe-hero-nav-link">
            BE INSPIRED
          </a>
          <a href="#price-guide" className="oe-hero-nav-link">
            PRICE GUIDE
          </a>
          <a href="#delivery-rates" className="oe-hero-nav-link">
            DELIVERY &amp; RATES
          </a>
          <a href="#faq" className="oe-hero-nav-link">
            FAQ
          </a>
          <button
            type="button"
            onClick={() => setShowOffersModal(true)}
            className="oe-hero-offers-pill"
          >
            OFFERS
          </button>
          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) {
                setShowMasterDashboard(true);
              } else {
                setShowPinModal(true);
              }
            }}
            className="oe-hero-offers-pill"
            style={{ background: '#1C1E1B', color: '#C5A059', border: '1.5px solid #C5A059', marginLeft: '0.45rem', fontWeight: 800 }}
          >
            ✦ STUDIO OS
          </button>
        </nav>
      </header>

      {/* SECTION 2: GET INSPIRED (Categories + Carousel with EXAMPLE Watermarks & Live Stock Recipe Compiler) */}
      <section id="be-inspired" className="oe-inspire-section">
        <div className="oe-container">
          <div className="oe-section-header-center">
            <span className="oe-eyebrow">CURATED LOOKBOOK</span>
            <h2 className="oe-section-title">Get Inspired</h2>
            <p className="oe-section-subtitle">
              Browse our signature event setups by occasion · click any template to load its exact colours and items straight into the builder.
            </p>

            <div className="oe-category-filter-bar" role="tablist">
              {inspireCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={inspireCategory === cat}
                  onClick={() => {
                    setInspireCategory(cat);
                    setCarouselIndex(0);
                  }}
                  className={`oe-category-pill ${inspireCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddNewBlankLook}
                  className="oe-category-pill active"
                  style={{ borderStyle: 'dashed' }}
                >
                  + Add New Look Card
                </button>
              )}
            </div>
          </div>

          {activeSlide && (
            <div className={`oe-lookbook-split-layout ${isEditMode ? 'has-dock' : ''}`}>
              <div className="oe-lookbook-card-col">
                <div className={`oe-carousel-stage oe-carousel-main-card ${isEditMode ? 'oe-inspector-active-card' : ''} ${activeSlide.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}>
                  <CornerRibbon banner={activeSlide.cornerBanner} />

                  <div className="oe-carousel-image-wrap">
                    <img
                      src={activeSlide.image}
                      alt={activeSlide.title}
                      className="oe-carousel-img"
                    />
                    {activeSlide.isExampleWatermark && (
                      <div className="oe-watermark-overlay" aria-hidden="true">
                        <span className="oe-watermark-stamp">EXAMPLE</span>
                      </div>
                    )}
                    <span className="oe-carousel-category-badge">{activeSlide.category}</span>
                  </div>

                  <div className="oe-carousel-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span className="oe-carousel-counter">
                        LOOK 0{(carouselIndex % filteredSlides.length) + 1} OF 0{filteredSlides.length}
                      </span>
                      {isEditMode ? (
                        <select
                          value={activeSlide.category || 'Birthdays'}
                          onChange={(e) => updateSlide(activeSlide.id, { category: e.target.value })}
                          className="oe-category-classifier-select"
                          title="Classify occasion for this Look"
                        >
                          <option value="Birthdays">Birthdays</option>
                          <option value="Baby Showers">Baby Showers</option>
                          <option value="Weddings">Weddings</option>
                          <option value="Milestones">Milestones</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Parties">Parties</option>
                        </select>
                      ) : (
                        <span className="oe-carousel-category-badge">{activeSlide.category}</span>
                      )}
                    </div>

                    <div className={isEditMode ? 'oe-editable-box-blue' : ''}>
                      <EditableText
                        isEditMode={isEditMode}
                        value={activeSlide.title}
                        onChange={(val) => updateSlide(activeSlide.id, { title: val })}
                        tag="h3"
                        className="oe-carousel-title"
                      />
                    </div>

                    <div className={isEditMode ? 'oe-editable-box-blue' : ''} style={{ marginTop: '0.4rem' }}>
                      <EditableText
                        isEditMode={isEditMode}
                        value={activeSlide.description}
                        onChange={(val) => updateSlide(activeSlide.id, { description: val })}
                        tag="p"
                        multiline={true}
                        className="oe-carousel-desc"
                      />
                    </div>

                    {/* Recipe Item Chips */}
                    {activeSlideRecipeCalc && activeSlideRecipeCalc.lines.length > 0 && (
                      <div className="oe-recipe-Included-tags" aria-label="Items included in this look">
                        {activeSlideRecipeCalc.lines.map((line, i) => (
                          <span key={i} className="oe-recipe-line-tag">
                            ✓ {line.label} (£{line.amount})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={`oe-carousel-price-box ${isEditMode ? 'oe-guide-price-blue-box' : ''}`}>
                      <span style={{ fontWeight: 600 }}>Guide Price:</span>
                      {isEditMode ? (
                        <span className="oe-price-badge-highlight">From £{activeSlideLivePrice}</span>
                      ) : (
                        <strong>
                          {activeSlideLivePrice < activeSlideOriginalPrice && (
                            <span className="oe-price-old">£{activeSlideOriginalPrice}</span>
                          )}
                          <span className={activeSlideLivePrice < activeSlideOriginalPrice ? 'oe-price-new' : ''}>
                            From £{activeSlideLivePrice}
                          </span>
                        </strong>
                      )}
                    </div>

                {isEditMode && openLookRibbonId === activeSlide.id && (
                  <RibbonPickerPopover
                    banner={activeSlide.cornerBanner}
                    onChange={(newBanner) => updateSlide(activeSlide.id, { cornerBanner: newBanner })}
                    onClose={() => setOpenLookRibbonId(null)}
                  />
                )}

                {/* STUDIO MODE: "Compile Look from Stock" Recipe Checklist */}
                {isEditMode && showLookRecipeEditor && (
                  <div className="oe-look-recipe-drawer">
                    <h4>🧩 Compile This Look&apos;s Recipe from Live Stock</h4>
                    <div className="oe-recipe-grid">
                      <div className="oe-recipe-field">
                        <label>Occasion Category</label>
                        <select
                          value={activeSlide.category}
                          onChange={(e) => updateSlide(activeSlide.id, { category: e.target.value })}
                          className="oe-recipe-select"
                        >
                          {inspireCategories.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>1. Signature Palette</label>
                        <select
                          value={activeSlide.preset?.paletteId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { paletteId: e.target.value })}
                          className="oe-recipe-select"
                        >
                          {curatedPalettes.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>2. Backdrop / Wall</label>
                        <select
                          value={activeSlide.preset?.backdropId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { backdropId: e.target.value || null })}
                          className="oe-recipe-select"
                        >
                          <option value="">None (Freestanding)</option>
                          {steps[1].items.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.shortName} (£{b.packageBasePrice || b.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>Wall Size Tier</label>
                        <select
                          value={activeSlide.preset?.shimmerSize || 'small'}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { shimmerSize: e.target.value })}
                          className="oe-recipe-select"
                        >
                          <option value="small">Small Wall (£150)</option>
                          <option value="large">Large Wall (£180)</option>
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>3. Balloon Garland</label>
                        <select
                          value={activeSlide.preset?.balloonId || ''}
                          onChange={(e) => updateSlidePreset(activeSlide.id, { balloonId: e.target.value || null })}
                          className="oe-recipe-select"
                        >
                          <option value="">None</option>
                          {steps[2].items.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.shortName} (£{g.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="oe-recipe-field">
                        <label>4. Numbers / Letters</label>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <select
                            value={activeSlide.preset?.digitOptionId || 'digits-none'}
                            onChange={(e) => updateSlidePreset(activeSlide.id, { digitOptionId: e.target.value })}
                            className="oe-recipe-select"
                          >
                            {digitOptions.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          {activeSlide.preset?.digitOptionId && activeSlide.preset.digitOptionId !== 'digits-none' && (
                            <input
                              type="text"
                              maxLength={6}
                              value={activeSlide.preset?.digitText || ''}
                              placeholder="21"
                              onChange={(e) => updateSlidePreset(activeSlide.id, { digitText: e.target.value })}
                              className="oe-inline-edit-input"
                              style={{ width: '58px' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="oe-recipe-field" style={{ marginTop: '0.65rem' }}>
                      <label>5. Finishing Extras (Click to toggle in this Look)</label>
                      <div className="oe-recipe-extras-chips">
                        {steps[4].items.map(ex => {
                          const currentExtras = activeSlide.preset?.extraIds || [];
                          const isIncluded = currentExtras.includes(ex.id);
                          return (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => {
                                const nextExtras = isIncluded
                                  ? currentExtras.filter(id => id !== ex.id)
                                  : [...currentExtras, ex.id];
                                updateSlidePreset(activeSlide.id, { extraIds: nextExtras });
                              }}
                              className={`oe-recipe-chip ${isIncluded ? 'selected' : ''}`}
                            >
                              {isIncluded ? '✓ ' : '+ '}{ex.shortName} (£{ex.price})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="oe-carousel-actions">
                  <button
                    type="button"
                    onClick={() => handleLoadInspirationIntoBuilder(activeSlide.preset)}
                    className="oe-btn-sage-solid"
                  >
                    Customise This Look →
                  </button>

                  <div className="oe-carousel-arrows">
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex(i => (i - 1 + filteredSlides.length) % filteredSlides.length)
                      }
                      className="oe-arrow-btn"
                      aria-label="Previous look"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex(i => (i + 1) % filteredSlides.length)
                      }
                      className="oe-arrow-btn"
                      aria-label="Next look"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT RAIL: STUDIO INSPECTOR DOCK (MOCKUP MATCH) */}
          {isEditMode && (
            <div className="oe-studio-dock-col" role="region" aria-label="Studio Look Inspector">
              {/* PANEL 1: CORNER BANNER */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">CORNER BANNER</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">PRE-BUILT</span>
                    <div className="oe-dock-pills-list">
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'NEW', style: 'gold', discountType: 'none', discountValue: 0 }
                        })}
                        className="oe-dock-pill-btn oe-pill-new"
                      >
                        NEW
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'MOST POPULAR', style: 'coral', discountType: 'none', discountValue: 0 }
                        })}
                        className="oe-dock-pill-btn oe-pill-popular"
                      >
                        MOST POPULAR
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: '10% OFF', style: 'coral', discountType: 'percent', discountValue: 10 }
                        })}
                        className="oe-dock-pill-btn oe-pill-10off"
                      >
                        10% OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: '15% OFF', style: 'coral', discountType: 'percent', discountValue: 15 }
                        })}
                        className="oe-dock-pill-btn oe-pill-15off"
                      >
                        15% OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSlide(activeSlide.id, {
                          cornerBanner: { enabled: true, text: 'SAVE £20', style: 'coral', discountType: 'fixed', discountValue: 20 }
                        })}
                        className="oe-dock-pill-btn oe-pill-save20"
                      >
                        SAVE £20
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="oe-dock-col-label">CUSTOM BANNER</span>
                    <input
                      type="text"
                      value={activeSlide.cornerBanner?.text || ''}
                      placeholder="CUSTOM"
                      onChange={(e) => updateSlide(activeSlide.id, {
                        cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: true, text: e.target.value }
                      })}
                      className="oe-dock-input"
                    />
                    <div className="oe-ribbon-swatch-strip">
                      {[
                        { name: 'gold', bg: '#D4AF37' },
                        { name: 'coral', bg: '#E07A5F' },
                        { name: 'sage', bg: '#7C9082' },
                        { name: 'espresso', bg: '#2C221E' },
                        { name: 'sky', bg: '#6EB9EB' }
                      ].map(sw => (
                        <div
                          key={sw.name}
                          onClick={() => updateSlide(activeSlide.id, {
                            cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: true, style: sw.name }
                          })}
                          className="oe-ribbon-swatch-dot"
                          style={{ background: sw.bg }}
                          title={sw.name}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSlide(activeSlide.id, {
                        cornerBanner: { ...(activeSlide.cornerBanner || {}), enabled: false }
                      })}
                      className="oe-dock-action-btn"
                    >
                      Clear Banner
                    </button>
                  </div>
                </div>
              </div>

              {/* PANEL 2: PICK & MIX STOCK */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">PICK &amp; MIX STOCK</h4>
                <div className="oe-dock-two-cols">
                  <div>
                    <span className="oe-dock-col-label">SELECT STOCK RECIPE</span>
                    <div className="oe-product-tree">
                      {/* Branch 1: Backdrops & Walls */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Backdrops &amp; Walls</span>
                        <div className="oe-tree-items">
                          {steps[1]?.items?.map(b => {
                            const isChecked = activeSlide.preset?.backdropId === b.id;
                            return (
                              <label key={b.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { backdropId: isChecked ? null : b.id })}
                                />
                                <span className="oe-tree-item-name">{b.shortName}</span>
                                <span className="oe-tree-item-price">£{b.packageBasePrice || b.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 2: Garlands & Arches */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Garlands &amp; Arches</span>
                        <div className="oe-tree-items">
                          {steps[2]?.items?.map(g => {
                            const isChecked = activeSlide.preset?.balloonId === g.id;
                            return (
                              <label key={g.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { balloonId: isChecked ? null : g.id })}
                                />
                                <span className="oe-tree-item-name">{g.shortName}</span>
                                <span className="oe-tree-item-price">£{g.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 3: Numbers & Stacks */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Numbers &amp; Stacks</span>
                        <div className="oe-tree-items">
                          {digitOptions?.filter(d => d.type !== 'none').map(d => {
                            const isChecked = activeSlide.preset?.digitOptionId === d.id;
                            return (
                              <label key={d.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => updateSlidePreset(activeSlide.id, { digitOptionId: isChecked ? null : d.id })}
                                />
                                <span className="oe-tree-item-name">{d.shortName || d.name}</span>
                                <span className="oe-tree-item-price">£{d.price || 35}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Branch 4: Finishing Extras */}
                      <div className="oe-tree-branch">
                        <span className="oe-tree-branch-title">Finishing Extras</span>
                        <div className="oe-tree-items">
                          {steps[4]?.items?.map(ex => {
                            const isChecked = (activeSlide.preset?.extraIds || []).includes(ex.id);
                            return (
                              <label key={ex.id} className="oe-tree-subitem">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const cur = activeSlide.preset?.extraIds || [];
                                    const next = isChecked ? cur.filter(id => id !== ex.id) : [...cur, ex.id];
                                    updateSlidePreset(activeSlide.id, { extraIds: next });
                                  }}
                                />
                                <span className="oe-tree-item-name">{ex.shortName}</span>
                                <span className="oe-tree-item-price">£{ex.price}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="oe-dock-col-label">APPLY DISCOUNT</span>
                    <div className="oe-discount-input-row" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.45rem' }}>
                      <input
                        type="number"
                        min="0"
                        max={activeSlide.cornerBanner?.discountType === 'percent' ? 100 : undefined}
                        placeholder="0"
                        value={activeSlide.cornerBanner?.discountValue || ''}
                        onChange={(e) => {
                          const rawVal = parseFloat(e.target.value) || 0;
                          const currentType = activeSlide.cornerBanner?.discountType === 'fixed' ? 'fixed' : 'percent';
                          const clampedVal = currentType === 'percent' ? Math.min(100, Math.max(0, rawVal)) : Math.max(0, rawVal);
                          const ribbonText = clampedVal > 0
                            ? (currentType === 'percent' ? `${clampedVal}% OFF` : `SAVE £${clampedVal}`)
                            : (activeSlide.cornerBanner?.text || 'SALE');
                          updateSlide(activeSlide.id, {
                            cornerBanner: {
                              ...(activeSlide.cornerBanner || {}),
                              enabled: clampedVal > 0,
                              discountType: currentType,
                              discountValue: clampedVal,
                              text: ribbonText
                            }
                          });
                        }}
                        className="oe-dock-input oe-discount-num-input"
                        style={{ margin: 0, flex: '1 1 50%', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}
                      />
                      <select
                        value={activeSlide.cornerBanner?.discountType === 'fixed' ? 'fixed' : 'percent'}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          const curVal = activeSlide.cornerBanner?.discountValue || 0;
                          const clampedVal = nextType === 'percent' ? Math.min(100, curVal) : curVal;
                          const ribbonText = clampedVal > 0
                            ? (nextType === 'percent' ? `${clampedVal}% OFF` : `SAVE £${clampedVal}`)
                            : (activeSlide.cornerBanner?.text || 'SALE');
                          updateSlide(activeSlide.id, {
                            cornerBanner: {
                              ...(activeSlide.cornerBanner || {}),
                              enabled: clampedVal > 0,
                              discountType: nextType,
                              discountValue: clampedVal,
                              text: ribbonText
                            }
                          });
                        }}
                        className="oe-dock-input oe-discount-type-select"
                        style={{ margin: 0, flex: '1 1 50%', minWidth: '105px', paddingRight: '1.85rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="percent">% OFF</option>
                        <option value="fixed">£ OFF</option>
                      </select>
                    </div>

                    <span className="oe-dock-col-label" style={{ marginTop: '0.5rem' }}>LOOK GUIDE PRICE</span>
                    <div className="oe-dock-price-display">
                      <span className="price-num">£{activeSlideLivePrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 3: UPLOAD PHOTO */}
              <div className="oe-dock-card">
                <h4 className="oe-dock-title">UPLOAD PHOTO</h4>
                <div className="oe-dock-photo-row">
                  <img src={activeSlide.image} alt={activeSlide.title} className="oe-dock-photo-thumb" />
                  <div className="oe-dock-photo-controls">
                    <label className="oe-dock-action-btn" style={{ textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                      SELECT IMAGE FROM FILE
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUploadPhotoForTarget(e.target.files[0], (url) =>
                              updateSlide(activeSlide.id, { image: url, isExampleWatermark: false })
                            );
                          }
                        }}
                      />
                    </label>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#0369A1' }}>
                      <input
                        type="checkbox"
                        checked={activeSlide.isExampleWatermark}
                        onChange={() => updateSlide(activeSlide.id, { isExampleWatermark: !activeSlide.isExampleWatermark })}
                        style={{ accentColor: '#0284C7' }}
                      />
                      EDIT WATERMARK: EXAMPLE (ON)
                    </label>
                    {inspirationSlides.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLookSlide(activeSlide.id)}
                        className="oe-dock-action-btn"
                        style={{ border: '1px solid #FCA5A5', color: '#B91C1C', background: '#FEF2F2', padding: '0.25rem 0.4rem', fontSize: '0.65rem' }}
                      >
                        🗑 Delete Look Card
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

          <div className="oe-carousel-thumb-strip">
            {filteredSlides.map((slide, idx) => {
              const thumbCalc = calculateLookRecipePrice(slide.preset, steps, digitOptions, balloonColours, curatedPalettes, slide.cornerBanner);
              const thumbPrice = slide.manualPriceOverride
                ? applyCornerBannerDiscount(slide.guidePrice, slide.cornerBanner)
                : (thumbCalc.finalTotal || slide.guidePrice);
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCarouselIndex(idx)}
                  className={`oe-carousel-thumb-card ${idx === carouselIndex % filteredSlides.length ? 'active' : ''}`}
                >
                  <div className="oe-thumb-img-box">
                    <img src={slide.image} alt={slide.title} loading="lazy" />
                    {slide.isExampleWatermark && (
                      <span className="oe-thumb-watermark">EXAMPLE</span>
                    )}
                  </div>
                  <div className="oe-thumb-meta">
                    <strong>{slide.title}</strong>
                    <span>From £{thumbPrice}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: BUILD YOUR EDIT */}
      <ProductBuilder
        steps={steps}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        digitOptions={digitOptions}
        offers={offers}
        externalPreset={externalPreset}
        onClearExternalPreset={() => setExternalPreset(null)}
        onSubmitQuote={handleSubmitCustomerQuote}
        isEditMode={isEditMode}
        onUpdateBuilderItem={updateBuilderItem}
        onToggleBuilderItemStock={toggleBuilderItemStock}
        onUpdateDigitOption={updateDigitOption}
        onToggleColourStock={toggleColourStock}
        onUpdateColour={updateColour}
        onAddNewColour={addNewColour}
        onUploadPhotoForTarget={handleUploadPhotoForTarget}
        onSaveCurrentSetupAsLook={handleSaveBuilderSetupAsLook}
      />

      {/* SECTION 4: REDESIGNED INTERACTIVE PRICE GUIDE (Unified with Builder Stock & Prices) */}
      <section id="price-guide" className="oe-pricelist-section">
        <div className="oe-container">
          <div className="oe-pricelist-header-grid">
            <div>
              <span className="oe-eyebrow">OUR COLLECTION</span>
              <h2 className="oe-section-title">Price List &amp; Budget Explorer</h2>
              <p className="oe-section-subtitle">
                Every display is tailored to your venue and colour palette. Filter by category or use the budget slider to explore our options.
              </p>
            </div>

            <div className="oe-budget-explorer-card">
              <div className="oe-budget-card-top">
                <label htmlFor="price-budget-slider">Filter by Budget:</label>
                <strong className="oe-budget-amount-badge">Up to £{maxBudget}</strong>
              </div>
              <input
                id="price-budget-slider"
                type="range"
                min="35"
                max="220"
                step="5"
                value={maxBudget}
                onChange={e => setMaxBudget(Number(e.target.value))}
                className="oe-accessible-range"
              />
              <div className="oe-budget-scale-labels">
                <span>£35 (Stacks &amp; Orbs)</span>
                <span>£105 (Garlands)</span>
                <span>£180+ (Shimmer Walls)</span>
              </div>
            </div>
          </div>

          <div className="oe-category-filter-bar">
            {priceSections.map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => setPriceSectionFilter(sec)}
                className={`oe-category-pill ${priceSectionFilter === sec ? 'active' : ''}`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="oe-pricelist-cards-grid">
            {filteredCatalog.map(item => {
              const discPrice = applyCornerBannerDiscount(item.basePrice, item.cornerBanner);
              return (
                <article
                  key={item.id}
                  className={`oe-pricelist-card ${!item.inStock ? 'out-of-stock' : ''} ${item.cornerBanner?.enabled ? 'oe-has-corner-ribbon' : ''}`}
                >
                  <CornerRibbon banner={item.cornerBanner} />

                  {item.image && (
                    <div className="oe-pricelist-img-box">
                      <img src={item.image} alt={item.name} className="oe-pricelist-photo" loading="lazy" />
                      <span className={`oe-hire-badge oe-hire-badge-float ${item.hireOnly ? 'hire' : 'keep'}`}>
                        {item.hireOnly ? 'Hire Only' : 'Yours to Keep'}
                      </span>
                    </div>
                  )}
                  <div className="oe-pricelist-card-body">
                    <div className="oe-pricelist-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="oe-pricelist-cat-tag">{item.category}</span>
                      {item.tier && (
                        <span className={`oe-tier-pill ${item.tier.toLowerCase()}`}>
                          {item.tier.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <EditableText
                      isEditMode={isEditMode}
                      value={item.name}
                      onChange={(val) => updateCatalogCard(item.id, { name: val })}
                      tag="h3"
                      className="oe-pricelist-item-title"
                    />
                    <EditableText
                      isEditMode={isEditMode}
                      value={item.style}
                      onChange={(val) => updateCatalogCard(item.id, { style: val })}
                      tag="p"
                      className="oe-pricelist-item-desc"
                    />

                    {/* Dedicated Detail Chips Row for Package Pricing */}
                    <div className="oe-pricelist-chips-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0 0.2rem' }}>
                      {item.secondPrice ? (
                        <>
                          <span className="oe-pricelist-detail-chip">
                            {item.name?.toLowerCase().includes('number') || item.name?.toLowerCase().includes('digit') ? '1 digit' : 'Small / Solo'}: £{item.basePrice}
                          </span>
                          <span className="oe-pricelist-detail-chip">
                            {item.name?.toLowerCase().includes('number') || item.name?.toLowerCase().includes('digit') ? '2 digits' : 'Large / Upgrade'}: £{item.secondPrice}
                          </span>
                        </>
                      ) : (
                        <span className="oe-pricelist-detail-chip">
                          Package: £{item.basePrice}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="oe-pricelist-card-bottom">
                    <span className="oe-pricelist-price">
                      {!item.inStock && !isEditMode ? (
                        'Currently Unavailable'
                      ) : isEditMode ? (
                        <EditablePrice
                          isEditMode={true}
                          value={item.basePrice}
                          prefix="From £"
                          onChange={(num) => updateCatalogCard(item.id, { basePrice: num, pricingText: `From £${num}` })}
                        />
                      ) : discPrice < item.basePrice ? (
                        <>
                          <span className="oe-price-old">£{item.basePrice}</span>
                          <span className="oe-price-new">From £{discPrice}</span>
                        </>
                      ) : (
                        item.pricingText
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadInspirationIntoBuilder(item.builderPreset || {})}
                      className="oe-pricelist-build-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                    >
                      + Add to Edit
                    </button>
                  </div>

                  {isEditMode && (
                    <div className="oe-card-edit-overlay-bar" style={{ padding: '0.5rem 1rem 0.85rem' }}>
                      <button
                        type="button"
                        onClick={() => updateCatalogCard(item.id, { inStock: !item.inStock })}
                        className={`oe-mini-admin-btn ${item.inStock ? 'in-stock' : 'out-stock'}`}
                      >
                        {item.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                      </button>
                      <label className="oe-mini-admin-btn">
                        📷 Photo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUploadPhotoForTarget(e.target.files[0], (url) =>
                                updateCatalogCard(item.id, { image: url })
                              );
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenCatalogRibbonId(openCatalogRibbonId === item.id ? null : item.id)}
                        className="oe-mini-admin-btn"
                      >
                        🎀 Ribbon
                      </button>
                    </div>
                  )}

                  {isEditMode && openCatalogRibbonId === item.id && (
                    <div style={{ padding: '0 1rem 1rem' }}>
                      <RibbonPickerPopover
                        banner={item.cornerBanner}
                        onChange={(newBanner) => updateCatalogCard(item.id, { cornerBanner: newBanner })}
                        onClose={() => setOpenCatalogRibbonId(null)}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4B: DELIVERY RADIUS & RATES */}
      <section id="delivery-rates" className="oe-delivery-rates-standalone" aria-label="Delivery Radius and Mileage Rates">
        <DeliveryRadiusMap
          deliveryConfig={deliveryConfig}
          onUpdateDeliveryConfig={setDeliveryConfig}
          isEditMode={isEditMode}
        />
      </section>

      {/* SECTION 5: EDITORIAL FAQ & LOCAL SERVICE AREA COVERAGE (AIEO + SEO) */}
      <section id="faq" className="oe-faq-section" aria-label="Frequently Asked Questions and Service Areas">
        <div className="oe-container">
          <div className="oe-section-header-center">
            <span className="oe-eyebrow">GOOD TO KNOW</span>
            <h2 className="oe-section-title">Frequently Asked Questions</h2>
            <p className="oe-section-subtitle">
              Everything you need to know about our prop hire, bespoke installations, and delivery across Bottesford, the Vale of Belvoir &amp; East Midlands borders.
            </p>
          </div>

          <div className="oe-faq-grid">
            {faqs.map((faq, idx) => (
              <article key={faq.id || idx} className="oe-faq-item">
                <EditableText
                  isEditMode={isEditMode}
                  value={faq.question}
                  onChange={(val) =>
                    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, question: val } : f)))
                  }
                  tag="h3"
                  className="oe-faq-question"
                />
                <EditableText
                  isEditMode={isEditMode}
                  value={faq.answer}
                  onChange={(val) =>
                    setFaqs(prev => prev.map((f, i) => (i === idx ? { ...f, answer: val } : f)))
                  }
                  tag="p"
                  multiline={true}
                  className="oe-faq-answer"
                />
              </article>
            ))}
          </div>

          <div className="oe-service-area-banner">
            <div>
              <strong style={{ display: 'block', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E805E' }}>
                Areas We Cover ({seoSettings.postcodePrefixes})
              </strong>
              <EditableText
                isEditMode={isEditMode}
                value={seoSettings.serviceAreas}
                onChange={(val) => setSeoSettings({ ...seoSettings, serviceAreas: val })}
                tag="p"
                className="oe-faq-answer"
              />
            </div>
            <a href="#build-your-edit" className="oe-btn-sage-solid">
              Start Your Custom Edit →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="oe-footer">
        <div className="oe-footer-inner">
          <div className="oe-footer-brand">
            <img src="/public/assets/logo.jpg" alt="The Occasion Edit Logo" className="oe-footer-logo" loading="lazy" />
            <div>
              <p className="oe-footer-title">THE OCCASION EDIT</p>
              <p className="oe-footer-sub">Bespoke Balloon Styling &amp; Prop Hire</p>
              <p className="oe-footer-location">📍 Bottesford, Leicestershire · Serving the Vale of Belvoir &amp; East Midlands</p>
            </div>
          </div>

          <div className="oe-footer-links">
            <button type="button" onClick={() => openLegalModal('terms-and-conditions')} className="oe-footer-btn">
              Terms &amp; Conditions
            </button>
            <button type="button" onClick={() => openLegalModal('privacy-policy')} className="oe-footer-btn">
              Privacy Policy
            </button>
            <button type="button" onClick={() => openLegalModal('cookie-policy')} className="oe-footer-btn">
              Cookie Policy
            </button>
            <button type="button" onClick={() => openLegalModal('booking-agreement')} className="oe-footer-btn">
              Hire Agreement
            </button>
            <button type="button" onClick={() => setShowOffersModal(true)} className="oe-footer-btn">
              Current Offers
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAdminUnlocked) {
                  setIsEditMode(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setShowPinModal(true);
                }
              }}
              className="oe-footer-btn oe-footer-admin-btn"
            >
              {isAdminUnlocked ? `✦ Studio Mode Active (${quotes.length})` : 'Studio Admin'}
            </button>
          </div>
        </div>

        <div className="oe-footer-bottom-bar" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#7A756D' }}>
            &copy; {new Date().getFullYear()} THE Occasion Edit · Bespoke Balloon Styling &amp; Prop Hire · Bottesford, Leicestershire
          </span>
        </div>
      </footer>

      {/* MODAL: OFFERS */}
      {showOffersModal && (
        <div className="oe-modal-backdrop" onClick={() => setShowOffersModal(false)}>
          <div className="oe-modal-panel" onClick={e => e.stopPropagation()}>
            <div className="oe-modal-header">
              <h3>Current Offers &amp; Promotions</h3>
              <button type="button" onClick={() => setShowOffersModal(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>
            <div className="oe-offers-banner-list">
              {offers.filter(o => o.active).map(o => (
                <div key={o.id} className="oe-offer-card">
                  <span className="oe-offer-code">CODE: {o.code}</span>
                  <span>{o.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STUDIO ADMIN PIN UNLOCK */}
      {showPinModal && (
        <div className="oe-modal-backdrop" onClick={() => setShowPinModal(false)}>
          <div className="oe-modal-panel" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="oe-modal-header">
              <h3>Unlock Studio Edit Mode</h3>
              <button type="button" onClick={() => setShowPinModal(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>
            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#4A4843', margin: 0 }}>
                Enter your Studio PIN to edit prices, stock, photos, corner banners, and view customer enquiries directly on the page.
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                placeholder="Studio PIN (e.g. 2026)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="oe-form-input"
              />
              {pinError && (
                <p style={{ color: '#A33E31', fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{pinError}</p>
              )}
              <button type="submit" className="oe-btn-primary">
                Unlock Studio Mode →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: ENQUIRIES & BOOKINGS */}
      {showBookingsDrawer && (
        <div className="oe-admin-drawer-backdrop" onClick={() => setShowBookingsDrawer(false)}>
          <aside className="oe-admin-drawer" onClick={e => e.stopPropagation()} aria-label="Customer Enquiries Drawer">
            <div className="oe-admin-drawer-header">
              <div>
                <h3>Customer Enquiries &amp; Bookings ({quotes.length})</h3>
                <p style={{ fontSize: '0.78rem', color: '#5C5852', margin: '0.2rem 0 0' }}>
                  Every enquiry includes the client&apos;s live 3D visual build snapshot and 1-tap WhatsApp reply.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                {quotes.length > 0 && (
                  <button type="button" onClick={handleExportSafeCsv} className="oe-mini-admin-btn">
                    ⬇ Safe CSV
                  </button>
                )}
                <button type="button" onClick={() => setShowBookingsDrawer(false)} className="oe-close-btn">
                  CLOSE ×
                </button>
              </div>
            </div>

            {quotes.length === 0 ? (
              <p className="oe-admin-empty">No customer enquiries received yet.</p>
            ) : (
              quotes.map(q => {
                const cleanPhone = (q.client?.phone || '').replace(/\D+/g, '').replace(/^0/, '44');
                const waText = encodeURIComponent(
                  `Hi ${q.client?.name || ''}! Thank you for sending your custom Occasion Edit enquiry for ${q.client?.eventDate || 'your event'} (${q.configuration?.backdrop || 'Custom Display'}, est. £${q.configuration?.estimatedTotal || 0}). We'd love to check availability for you!`
                );
                return (
                  <div key={q.id} className="oe-booking-card">
                    <div>
                      {q.previewSnapshotDataUrl ? (
                        <img
                          src={q.previewSnapshotDataUrl}
                          alt="Customer 3D Build Snapshot"
                          className="oe-booking-snapshot"
                        />
                      ) : (
                        <div className="oe-booking-snapshot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#8C857B', textAlign: 'center', padding: '0.5rem' }}>
                          3D Build Snapshot
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.98rem' }}>{q.client?.name}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#5C5852' }}>
                            Event Date: <strong>{q.client?.eventDate || 'TBC'}</strong> · Postcode: <strong>{q.client?.postcode || 'TBC'}</strong>
                          </span>
                        </div>
                        <strong style={{ fontSize: '1.05rem', color: '#6E805E' }}>
                          £{q.configuration?.estimatedTotal}
                        </strong>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#3B3834', marginTop: '0.45rem', lineHeight: 1.45 }}>
                        <div><strong>Palette:</strong> {(q.configuration?.palette || []).join(', ')}</div>
                        <div><strong>Backdrop:</strong> {q.configuration?.backdrop} · <strong>Garland:</strong> {q.configuration?.balloonLayout}</div>
                        <div><strong>Numbers/Letters:</strong> {q.configuration?.digitsOrLetters}</div>
                        <div><strong>Extras:</strong> {(q.configuration?.extras || []).join(', ') || 'None'}</div>
                        {q.client?.notes && <div><strong>Notes:</strong> &ldquo;{q.client.notes}&rdquo;</div>}
                      </div>

                      <div className="oe-booking-actions-row">
                        <select
                          value={q.status || 'New Enquiry'}
                          onChange={(e) => handleUpdateQuoteStatus(q.id, e.target.value)}
                          className="oe-recipe-select"
                          style={{ width: 'auto' }}
                        >
                          <option value="New Enquiry">New Enquiry</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Deposit Paid">Deposit Paid</option>
                          <option value="Completed">Completed</option>
                        </select>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="oe-wa-btn"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                        {q.client?.phone && (
                          <a href={`tel:${q.client.phone}`} className="oe-contact-pill">
                            📞 {q.client.phone}
                          </a>
                        )}
                        {q.client?.email && (
                          <a href={`mailto:${q.client.email}`} className="oe-contact-pill">
                            ✉️ Email
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteQuoteGdpr(q.id, q.client?.name)}
                          className="oe-mini-admin-btn danger"
                        >
                          🗑 Delete (GDPR)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </aside>
        </div>
      )}

      {/* SLIDE-OVER DRAWER: GOOGLE SHEET TWO-WAY SYNC */}
      {showSheetSyncDrawer && (
        <div className="oe-admin-drawer-backdrop" onClick={() => setShowSheetSyncDrawer(false)}>
          <aside className="oe-admin-drawer" onClick={e => e.stopPropagation()} aria-label="Google Sheet Sync Settings">
            <div className="oe-admin-drawer-header">
              <h3>📊 Two-Way Google Sheet Sync</h3>
              <button type="button" onClick={() => setShowSheetSyncDrawer(false)} className="oe-close-btn">
                CLOSE ×
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: '#4A4843', margin: 0 }}>
              Connect your Google Sheet (powered by <code>GoogleAppsScript.gs</code>) so every customer quote automatically logs to <strong>1_Bookings_and_Quotes</strong>, and you can sync prices &amp; stock both ways.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="oe-field-label">Google Apps Script Web App URL (Ends in /exec)</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetConfig.webAppUrl || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, webAppUrl: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div>
                <label className="oe-field-label">Your Google Sheet URL (For 1-Click Open)</label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetConfig.sheetUrl || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, sheetUrl: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div>
                <label className="oe-field-label">Admin Sync Secret (Matches Script Properties ADMIN_SYNC_SECRET)</label>
                <input
                  type="password"
                  placeholder="e.g. occasion-edit-sync-2026"
                  value={sheetConfig.adminSecret || ''}
                  onChange={(e) => setSheetConfig({ ...sheetConfig, adminSecret: e.target.value })}
                  className="oe-form-input"
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSaveAndPublish(false)}
                  className="oe-btn-primary"
                >
                  💾 Save Sheet Connection &amp; Push Website Data
                </button>

                <button
                  type="button"
                  onClick={handlePullFromGoogleSheet}
                  className="oe-btn-secondary"
                >
                  ↻ Pull Latest Prices &amp; Stock from Sheet
                </button>

                {sheetConfig.sheetUrl && (
                  <a
                    href={sheetConfig.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="oe-contact-pill"
                    style={{ padding: '0.65rem 1rem', fontWeight: 700 }}
                  >
                    Open My Google Sheet ↗
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Master Orders & Stock Dashboard */}
      <MasterOrdersDashboard
        isOpen={showMasterDashboard}
        onClose={() => setShowMasterDashboard(false)}
        quotes={quotes}
        onUpdateQuoteStatus={handleUpdateQuoteStatus}
        onDeleteQuote={handleDeleteQuoteGdpr}
        catalog={catalog}
        steps={steps}
        digitOptions={digitOptions}
        balloonColours={balloonColours}
        curatedPalettes={curatedPalettes}
        deliveryConfig={deliveryConfig}
        studioSettings={studioSettings}
        onUpdateStudioSettings={setStudioSettings}
        sheetConfig={sheetConfig}
        onSyncFromSheet={handlePullFromGoogleSheet}
        flashToast={setSaveToast}
      />

      {/* Legal Documents Suite Modal */}
      <LegalDocumentsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialDocId={activeLegalDocId}
        studioSettings={studioSettings}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

