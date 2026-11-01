import React from 'react';
import { balloonGradients, gradientId, finishOf, BalloonShine } from './balloonFinish';

/**
 * ProductPreview Component — Left Panel Live Canvas
 */
export function ProductPreview({
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

  const paletteColours = selectedColours.length > 0
    ? selectedColours
    : [
        { id: 'sage', hex: '#7A8C68', finish: 'Matte' },
        { id: 'pearl-white', hex: '#F5F2EB', finish: 'Pearl' },
        { id: 'champagne-gold', hex: '#C5A059', finish: 'Chrome' },
        { id: 'blush-pink', hex: '#E6B8AF', finish: 'Matte' },
        { id: 'nude-stone', hex: '#B8A693', finish: 'Matte' }
      ];

  const colourAt = (index) => paletteColours[index % paletteColours.length];
  // Fill for the balloon body: a gradient that shows chrome, pearl or matte
  const getColour = (index) => `url(#${gradientId('pv', colourAt(index))})`;
  const finishAt = (index) => finishOf(colourAt(index));

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
      { dx: 0, dy: 0, r: 26, i: seed + 0 },
      { dx: -22, dy: 14, r: 20, i: seed + 1 },
      { dx: 20, dy: 12, r: 18, i: seed + 2 },
      { dx: -10, dy: -22, r: 19, i: seed + 3 },
      { dx: 16, dy: -18, r: 15, i: seed + 4 },
      { dx: -28, dy: -6, r: 13, i: seed + 2 },
      { dx: 6, dy: 24, r: 14, i: seed + 1 },
    ].map(b => ({ ...b, c: getColour(b.i), finish: finishAt(b.i) }));
    return (
      <g transform={`translate(${cx}, ${cy}) scale(${scale})`} key={`cluster-${cx}-${cy}`}>
        {bubbles.map((b, i) => (
          <g key={i}>
            <circle cx={b.dx} cy={b.dy} r={b.r} fill={b.c} stroke="rgba(28,30,27,0.18)" strokeWidth="0.9" />
            <BalloonShine cx={b.dx} cy={b.dy} r={b.r} finish={b.finish} />
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
          {balloonGradients('pv', paletteColours)}
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

        {isPaletteOnlyPreview && selectedColours.length > 0 && (
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
                <BalloonShine cx={b.cx} cy={b.cy} r={Math.min(b.rx, b.ry)} finish={finishAt(b.idx)} />
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

      {/* Until they choose colours, the empty stage explains how ordering works */}
      {isPaletteOnlyPreview && selectedColours.length === 0 && (
        <div className="rpc-how-it-works">
          <h3>How it works</h3>
          <ol>
            <li><span><strong>Build your edit</strong> and pay nothing now at all.</span></li>
            <li><span><strong>Add what you'd like</strong> and we'll give you a guide price.</span></li>
            <li><span><strong>Send it to us</strong>, and one of the team will be in touch with a quote and to confirm we can make your event.</span></li>
          </ol>
        </div>
      )}
    </div>
  );
}
