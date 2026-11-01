import React from 'react';

// Draws latex balloons by finish. Chrome balloons are mirror-like: a near-white
// hot spot, a dark reflection band and a bright rim, so they read as metallic
// rather than flat mustard or grey. Pearl has a soft glow; matte is gently shaded.

function mix(hex, target, amount) {
  const n = parseInt(String(hex || '#cccccc').replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const t = target === 'white' ? 255 : 0;
  const ch = shift => Math.round(((n >> shift) & 255) + (t - ((n >> shift) & 255)) * amount);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}
const lighten = (hex, a) => mix(hex, 'white', a);
const darken = (hex, a) => mix(hex, 'black', a);

export function finishOf(colour) {
  const f = String(colour?.finish || '').toLowerCase();
  if (f.includes('chrome')) return 'chrome';
  if (f.includes('pearl') || f.includes('satin')) return 'pearl';
  return 'matte';
}

function stopsFor(hex, finish) {
  if (finish === 'chrome') {
    return [
      [0, lighten(hex, 0.92)],
      [0.1, lighten(hex, 0.45)],
      [0.3, hex],
      [0.55, darken(hex, 0.5)],
      [0.72, darken(hex, 0.25)],
      [0.86, lighten(hex, 0.3)],
      [1, darken(hex, 0.45)]
    ];
  }
  if (finish === 'pearl') {
    return [
      [0, lighten(hex, 0.7)],
      [0.45, lighten(hex, 0.18)],
      [0.85, hex],
      [1, darken(hex, 0.14)]
    ];
  }
  return [
    [0, lighten(hex, 0.16)],
    [0.6, hex],
    [1, darken(hex, 0.2)]
  ];
}

export function gradientId(prefix, colour) {
  return `${prefix}-${String(colour.id || colour.hex).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

// One radial gradient per colour, to place inside an <svg>'s <defs>
export function balloonGradients(prefix, colours) {
  const seen = new Set();
  return colours.filter(c => {
    const id = gradientId(prefix, c);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(c => (
    <radialGradient key={gradientId(prefix, c)} id={gradientId(prefix, c)} cx="50%" cy="50%" r="55%" fx="34%" fy="30%">
      {stopsFor(c.hex, finishOf(c)).map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </radialGradient>
  ));
}

// The highlight on top of the balloon body: a crisp streak for chrome, softer otherwise
export function BalloonShine({ cx, cy, r, finish }) {
  if (finish === 'chrome') {
    return (
      <g pointerEvents="none">
        <ellipse cx={cx - r * 0.33} cy={cy - r * 0.36} rx={r * 0.26} ry={r * 0.11} fill="rgba(255,255,255,0.9)" transform={`rotate(-35 ${cx - r * 0.33} ${cy - r * 0.36})`} />
        <circle cx={cx + r * 0.32} cy={cy + r * 0.38} r={r * 0.07} fill="rgba(255,255,255,0.7)" />
      </g>
    );
  }
  return (
    <ellipse
      cx={cx - r * 0.3}
      cy={cy - r * 0.3}
      rx={r * 0.22}
      ry={r * 0.14}
      fill={finish === 'pearl' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)'}
      transform={`rotate(-30 ${cx - r * 0.3} ${cy - r * 0.3})`}
      pointerEvents="none"
    />
  );
}
