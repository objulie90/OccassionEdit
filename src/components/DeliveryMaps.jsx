import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  INITIAL_DELIVERY_CONFIG,
  calculateDistanceToBottesford,
  getDeliveryZoneForMileage
} from '../data/catalogData.js';

/**
 * ---------------------------------------------------------------------------
 * BOTTESFORD DELIVERY RADIUS MAP COMPONENT (Leaflet.js)
 * ---------------------------------------------------------------------------
 */
export function DeliveryRadiusMap({ deliveryConfig, onUpdateDeliveryConfig, isEditMode }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const circlesRef = useRef([]);

  const [testPostcode, setTestPostcode] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  const zones = deliveryConfig?.zones || INITIAL_DELIVERY_CONFIG.zones;
  const centerCoords = deliveryConfig?.centerCoords || INITIAL_DELIVERY_CONFIG.centerCoords; // [52.9436, -0.8006]

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !L) return;

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (_e) {}
    }

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView(centerCoords, 9);

    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 18,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    // Bottesford Studio Base Marker
    const studioIcon = L.divIcon({
      className: 'oe-map-studio-pin',
      html: '<div style="background:#1C1E1B;color:#FAF6F0;padding:5px 10px;border-radius:12px;font-size:11px;font-weight:800;border:2px solid #C5A059;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.35);">✦ Bottesford Studio</div>',
      iconSize: [120, 32],
      iconAnchor: [60, 16]
    });
    L.marker(centerCoords, { icon: studioIcon }).addTo(map)
      .bindPopup('<b>THE Occasion Edit — Studio Base</b><br>Bottesford, Leicestershire');

    // Concentric Radius Circles (Draw outer first so inner sit on top)
    const milesToMeters = (m) => m * 1609.344;
    const sortedZones = [...zones].sort((a, b) => b.miles - a.miles);
    const newCircles = [];

    sortedZones.forEach(z => {
      const circ = L.circle(centerCoords, {
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
                href="public/assets/Bottesford_Delivery_Radius_Map.kml"
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
