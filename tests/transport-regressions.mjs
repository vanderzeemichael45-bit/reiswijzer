import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateSource, loadFunctions } from './helpers/candidate-harness.mjs';

const location = { href: 'https://9292.nl/' };
const { rwApiEndpointKey, rwComparablePlanUrl } = loadFunctions(
  ['rwApiEndpointKey', 'rwComparablePlanUrl'],
  { URL, location }
);

test('temporary validation headers are scoped to their API endpoint', () => {
  assert.equal(rwApiEndpointKey('https://web-api.9292.nl/api/v1/locations?query=Sneek'), '/api/v1/locations');
  assert.equal(rwApiEndpointKey('https://web-api.9292.nl/api/v1/plans?from=a&to=b'), '/api/v1/plans');
  assert.equal(rwApiEndpointKey('https://web-api.9292.nl/api/v1/journey/abc'), '/api/v1/journey');
  assert.notEqual(rwApiEndpointKey('https://web-api.9292.nl/api/v1/locations'), rwApiEndpointKey('https://web-api.9292.nl/api/v1/plans'));
});

test('native plan capture matching ignores harmless planner defaults', () => {
  const requested = 'https://web-api.9292.nl/api/v1/plans?from=a&to=b&requestType=Departure&dateTime=2026-08-20T09%3A29%3A00.000Z&previewsAfter=7';
  const native = 'https://web-api.9292.nl/api/v1/plans?to=b&from=a&requestType=Departure&dateTime=2026-08-20T09%3A29%3A00.000Z&previewsAfter=5';
  assert.equal(rwComparablePlanUrl(requested), rwComparablePlanUrl(native));
});

test('gear button has a standalone diagnostics fallback', () => {
  assert.match(candidateSource, /if\(!d\)\{rwOpenNativeDiagnostics\(\);return;\}/);
});

test('automatic diagnostics never operate the hidden native planner', () => {
  const start = candidateSource.indexOf('async function rwRunSelfDiagnostics');
  const end = candidateSource.indexOf('function rwResetToPlannerHome', start);
  const diagnostics = candidateSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(diagnostics, /rw9292JsonSelfHealing\(/);
  assert.match(diagnostics, /rwHealthRequestUrls\.add\(plansUrl\)/);
});

test('planner exposes explicit date and time picker controls', () => {
  assert.match(candidateSource, /id="rwPlannerDatePicker"/);
  assert.match(candidateSource, /id="rwPlannerTimePicker"/);
  assert.match(candidateSource, /showPicker/);
});

test('profile save and header controls return to a compact planner state', () => {
  assert.match(candidateSource, /closest\('\[data-rw-dashboard="profile"\]'\)/);
  assert.match(candidateSource, /if\(d\?\.open\)\{rwResetToPlannerHome\(\);return;\}/);
  assert.match(candidateSource, /rw-native-diagnostics/);
});
