import { UK_OUTCODE_CENTROIDS, INITIAL_DELIVERY_CONFIG, haversineDistanceMiles } from '../data/catalogData.js';

// Towns customers are likely to type when they don't have a venue yet
// (latitude, longitude). Also drawn on the delivery map.
export const TOWNS = [
  ['Bottesford', 52.9436, -0.8006],
  ['Nottingham', 52.9548, -1.1581],
  ['West Bridgford', 52.9295, -1.1270],
  ['Radcliffe on Trent', 52.9478, -1.0391],
  ['Cotgrave', 52.9120, -1.0420],
  ['Bingham', 52.9522, -0.9535],
  ['Newark', 53.0763, -0.8084],
  ['Southwell', 53.0778, -0.9541],
  ['Grantham', 52.9119, -0.6417],
  ['Sleaford', 52.9993, -0.4103],
  ['Melton Mowbray', 52.7650, -0.8869],
  ['Oakham', 52.6697, -0.7288],
  ['Loughborough', 52.7721, -1.2062],
  ['Long Bennington', 53.0083, -0.7553],
  ['Belvoir', 52.8945, -0.7817],
  ['Stamford', 52.6520, -0.4800],
  ['Lincoln', 53.2307, -0.5406],
  ['Leicester', 52.6369, -1.1398]
];

function normalise(text) {
  return String(text || '').toLowerCase().replace(/[^a-z]/g, '');
}

// Where a postcode, outcode or town name is, or null if we don't know it
export function locate(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const outcode = raw.toUpperCase().match(/^[A-Z]{1,2}[0-9][A-Z0-9]?/);
  if (outcode && UK_OUTCODE_CENTROIDS[outcode[0]]) {
    const [lat, lon] = UK_OUTCODE_CENTROIDS[outcode[0]];
    return { lat, lon, label: outcode[0] };
  }
  const key = normalise(raw);
  const town = TOWNS.find(([name]) => {
    const n = normalise(name);
    return key === n || key.startsWith(n) || (key.length >= 4 && n.startsWith(key));
  });
  if (town) return { lat: town[1], lon: town[2], label: town[0] };
  return null;
}

export function milesFromBase(text) {
  const place = locate(text);
  if (!place) return null;
  const [lat0, lon0] = INITIAL_DELIVERY_CONFIG.centerCoords;
  return Math.round(haversineDistanceMiles(lat0, lon0, place.lat, place.lon) * 10) / 10;
}
