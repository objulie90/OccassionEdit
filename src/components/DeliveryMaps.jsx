import React, { useState } from 'react';
import {
  INITIAL_DELIVERY_CONFIG,
  getDeliveryZoneForMileage,
  describeDelivery
} from '../data/catalogData.js';
import { locate, milesFromBase } from '../lib/places';

/**
 * ---------------------------------------------------------------------------
 * BOTTESFORD DELIVERY RADIUS MAP COMPONENT (Leaflet.js)
 * ---------------------------------------------------------------------------
 */
export function DeliveryRadiusMap({ deliveryConfig, onUpdateDeliveryConfig, isEditMode }) {
  const [testPostcode, setTestPostcode] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  const zones = deliveryConfig?.zones || INITIAL_DELIVERY_CONFIG.zones;

  const handleCheckPostcode = (e) => {
    e.preventDefault();
    if (!testPostcode.trim()) return;
    const miles = milesFromBase(testPostcode);
    if (miles === null) {
      setCalcResult({ error: 'Please enter a valid UK postcode (e.g. NG13, NG31, LE13).' });
      return;
    }
    const zoneInfo = getDeliveryZoneForMileage(miles, zones);
    setCalcResult({
      miles,
      zone: zoneInfo.zone,
      surcharge: zoneInfo.surcharge,
      label: zoneInfo.label,
      zoneInfo,
      outcode: testPostcode.trim().toUpperCase().match(/^[A-Z]{1,2}[0-9][A-Z0-9]?/)?.[0] || null
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
        <h2 className="oe-section-title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
          Where we deliver
        </h2>
        <p className="oe-section-subtitle" style={{ maxWidth: '680px', margin: '0 auto' }}>
          From Bottesford across the Vale of Belvoir, Grantham, Bingham, Melton Mowbray, Newark and Nottingham.
        </p>
      </div>

      <div className="oe-delivery-dual-grid">
        {/* Left Column: Postcode Calculator & Structured Zone Cards */}
        <div className="oe-delivery-info-col">
          {/* Postcode Distance Calculator Card */}
          <div className="oe-postcode-card">
            <h4 style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', color: '#1C1E1B', fontWeight: 700 }}>
              <label htmlFor="oe-delivery-postcode">Pop in your venue's postcode</label>
            </h4>
            <form onSubmit={handleCheckPostcode} className="oe-postcode-form">
              <input
                id="oe-delivery-postcode"
                type="text"
                placeholder="e.g. NG31 6AA"
                value={testPostcode}
                onChange={(e) => setTestPostcode(e.target.value.toUpperCase())}
                className="oe-postcode-input"
              />
              <button type="submit" className="oe-btn-primary" style={{ padding: '0.65rem 1.15rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                Check
              </button>
            </form>

            {calcResult && (
              <div style={{ marginTop: '0.85rem' }}>
                {calcResult.error ? (
                  <p style={{ color: '#A33E31', fontSize: '0.82rem', margin: 0, fontWeight: 700 }}>{calcResult.error}</p>
                ) : (
                  <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', padding: '0.75rem 0.95rem', borderRadius: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0369A1' }}>
                      About {Math.round(calcResult.miles)} miles from Bottesford
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#0C4A6E' }}>
                      {describeDelivery(calcResult.zoneInfo)}
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
                className={`oe-zone-card ${z.id === 'zone-1' ? 'zone-1' : 'zone-2'}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1C1E1B' }}>
                    {z.name}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: !z.perMile && !z.surcharge ? '#15803D' : '#1C1E1B' }}>
                    {z.perMile ? 'Mileage charge' : !z.surcharge ? 'Free' : `£${z.surcharge}`}
                  </span>
                </div>

                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#5C5852', lineHeight: 1.35 }}>
                  Up to {z.miles} miles from Bottesford. {z.note}
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

        {/* Right column: the zones drawn to scale, with no outside map service */}
        <div className="oe-real-leaflet-map-wrap">
          <ZoneMap zones={zones} pinPlace={calcResult && !calcResult.error ? testPostcode : null} />
        </div>
      </div>
    </div>
  );
}

// The map picture is OpenStreetMap at zoom 10, cropped to 800 x 800 pixels with
// Bottesford in the centre. These numbers place rings and pins on it exactly.
const MAP = {
  src: 'public/assets/delivery-map.jpg',
  size: 800,
  zoom: 10,
  originX: 130489.02 - 400,
  originY: 85462.09 - 400,
  metresPerPixel: 92.122
};

function toMapPixels(lat, lon) {
  const scale = 256 * 2 ** MAP.zoom;
  const x = ((lon + 180) / 360) * scale;
  const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * scale;
  return { x: x - MAP.originX, y: y - MAP.originY };
}

export function ZoneMap({ zones, pinPlace }) {
  const centre = MAP.size / 2;
  const radius = miles => (miles * 1609.344) / MAP.metresPerPixel;
  const place = pinPlace ? locate(pinPlace) : null;
  const pin = place ? toMapPixels(place.lat, place.lon) : null;
  const pinOnMap = pin && pin.x > 0 && pin.y > 0 && pin.x < MAP.size && pin.y < MAP.size;
  const byRadius = [...zones].sort((a, b) => b.miles - a.miles);

  return (
    <figure className="oe-zone-map-figure">
      <svg
        className="oe-zone-map"
        viewBox={`0 0 ${MAP.size} ${MAP.size}`}
        role="img"
        aria-label={`Map of our delivery area around Bottesford: ${zones.map(z => `${z.name.toLowerCase()} up to ${z.miles} miles`).join(', ')}`}
      >
        <image href={MAP.src} x="0" y="0" width={MAP.size} height={MAP.size} />
        {byRadius.map(z => (
          <circle
            key={z.id}
            cx={centre}
            cy={centre}
            r={radius(z.miles)}
            fill={z.color}
            fillOpacity={z.id === 'zone-1' ? 0.16 : 0.09}
            stroke={z.color}
            strokeWidth="3"
          />
        ))}
        {zones.map(z => (
          <g key={`l-${z.id}`}>
            <rect x={centre + radius(z.miles) * 0.707 - 4} y={centre + radius(z.miles) * 0.707 - 4} width="92" height="30" rx="15" fill="#FFFFFF" fillOpacity="0.92" />
            <text x={centre + radius(z.miles) * 0.707 + 42} y={centre + radius(z.miles) * 0.707 + 16} textAnchor="middle" fontSize="17" fontWeight="600" fill="#1C1E1B" fontFamily="Montserrat, sans-serif">
              {z.miles} miles
            </text>
          </g>
        ))}
        <circle cx={centre} cy={centre} r="11" fill="#C5A059" stroke="#1C1E1B" strokeWidth="3" />
        <rect x={centre - 62} y={centre + 16} width="124" height="30" rx="15" fill="#1C1E1B" />
        <text x={centre} y={centre + 37} textAnchor="middle" fontSize="17" fontWeight="700" fill="#FAF6F0" fontFamily="Montserrat, sans-serif">Bottesford</text>
        {pinOnMap && (
          <g>
            <circle cx={pin.x} cy={pin.y} r="11" fill="#E86F68" stroke="#FFFFFF" strokeWidth="3" />
            <rect x={pin.x - 46} y={pin.y - 46} width="92" height="28" rx="14" fill="#9B3328" />
            <text x={pin.x} y={pin.y - 26} textAnchor="middle" fontSize="16" fontWeight="700" fill="#FFFFFF" fontFamily="Montserrat, sans-serif">You</text>
          </g>
        )}
      </svg>
      <figcaption className="oe-map-credit">
        Map ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
      </figcaption>
    </figure>
  );
}
