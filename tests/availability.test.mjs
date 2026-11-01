// Runs the shared availability cases against the website's rules.
// Usage: node tests/availability.test.mjs
import { readFileSync } from 'node:fs';
import { computeAvailability } from '../src/lib/availability.js';

const spec = JSON.parse(readFileSync(new URL('./availability-cases.json', import.meta.url), 'utf8'));
const now = Date.parse(spec.now);
let failed = 0;

for (const c of spec.cases) {
  const result = computeAvailability(c.date, spec.orders, spec.hireItems, { ...spec.settings, ...(c.settings || {}) }, now, c.ignore || null);
  const problems = [];
  for (const [id, free] of Object.entries(c.expect)) {
    if (result.items[id].free !== free) problems.push(`${id} free ${result.items[id].free}, expected ${free}`);
  }
  if (result.dayFull !== c.dayFull) problems.push(`dayFull ${result.dayFull}, expected ${c.dayFull}`);
  if (problems.length) {
    failed += 1;
    console.log(`FAIL ${c.name}: ${problems.join('; ')}`);
  } else {
    console.log(`pass ${c.name}`);
  }
}

if (failed) {
  console.log(`${failed} of ${spec.cases.length} failed`);
  process.exit(1);
}
console.log(`all ${spec.cases.length} passed`);
