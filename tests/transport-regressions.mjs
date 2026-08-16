import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateSource, loadFunctions } from './helpers/candidate-harness.mjs';

const location = { href: 'https://9292.nl/' };
const { rwApiEndpointKey, rwComparablePlanUrl } = loadFunctions(
  ['rwApiEndpointKey', 'rwComparablePlanUrl'],
  { URL, location }
);

const { rwAmsterdamWallTimeIso } = loadFunctions(
  ['rwTimeZoneOffsetMinutes', 'rwAmsterdamWallTimeIso'],
  { Date, Intl, Object, Number, String }
);

const { segmentTotals } = loadFunctions(['segmentTotals'], { Math, Number });

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

test('planner opens the native calendar from the full date field', () => {
  assert.doesNotMatch(candidateSource, /id="rwPlannerDatePicker"/);
  assert.match(candidateSource, /data-rw-date-control><input id="rwPlannerDate" type="date" aria-label="Datum"/);
  assert.match(candidateSource, /dateControl\?\.addEventListener\('click',\(\)=>openPicker\(ownDate\)\)/);
  assert.match(candidateSource, /typeof input\.showPicker==='function'/);
});

test('planner has a browser-independent hour and minute picker', () => {
  assert.match(candidateSource, /id="rwPlannerTimePicker"/);
  assert.match(candidateSource, /id="rwPlannerTimePopover"/);
  assert.match(candidateSource, /id="rwPlannerHour"/);
  assert.match(candidateSource, /id="rwPlannerMinute"/);
  assert.match(candidateSource, /id="rwPlannerTimeApply"/);
  assert.match(candidateSource, /ownTime\.value=`\$\{hour\}:\$\{minute\}`;syncTime\(\)/);
});

test('profile save and header controls return to a compact planner state', () => {
  assert.match(candidateSource, /closest\('\[data-rw-dashboard="profile"\]'\)/);
  assert.match(candidateSource, /if\(d\?\.open\)\{rwResetToPlannerHome\(\);return;\}/);
  assert.match(candidateSource, /rw-native-diagnostics/);
});

test('result date metadata only reads a journey captured for the selected result', () => {
  assert.doesNotMatch(candidateSource, /rwRawJourneyFor\(/);
  assert.match(candidateSource, /const raw=rwJourneyReadyFor\(journey\)\?lastCapturedJourney:null/);
});

test('native planner fallback uses the visible 9292 date format and radio mode', () => {
  assert.match(candidateSource, /padStart\(2,'0'\)\}-\$\{String\(dateTime\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\}-\$\{dateTime\.getFullYear\(\)\}/);
  assert.match(candidateSource, /querySelectorAll\('input\[type="radio"\]'\)/);
  assert.match(candidateSource, /rwSelectNativeRequestMode\(requestType\)/);
});

test('native API bootstrap restores focus to the ReisWijzer location field', () => {
  assert.match(candidateSource, /const active=document\.activeElement/);
  assert.match(candidateSource, /restoreVisibleFocus\(\)/);
  assert.match(candidateSource, /setSelectionRange\(selection\.start,selection\.end\)/);
  assert.match(candidateSource, /input\.focus\?\.\(\{preventScroll:true\}\);\s*restoreVisibleFocus\(\);\s*const enc=/);
});

test('Dutch planner wall time is converted to UTC across summer and winter time', () => {
  assert.equal(rwAmsterdamWallTimeIso('2026-09-05', '10:37'), '2026-09-05T08:37:00.000Z');
  assert.equal(rwAmsterdamWallTimeIso('2026-01-05', '10:37'), '2026-01-05T09:37:00.000Z');
  assert.equal(rwAmsterdamWallTimeIso('2026-09-05', '10:37', 90), '2026-09-05T10:07:00.000Z');
});

test('new trip keeps the planner home visible over stale native journey data', () => {
  assert.match(candidateSource, /rwPlannerUiState\.forceHome=true/);
  assert.match(candidateSource, /if\(rwPlannerUiState\.forceHome\|\|!js\.length\)/);
  assert.match(candidateSource, /rwPlannerUiState\.forceHome=false;\s*rememberPlansJson/);
});

test('resolved FareGroups can provide the hero total when native fareInfo is incomplete', () => {
  assert.match(candidateSource, /const detailedSegments=journeyReady\s*\? pricedSegmentsQuick\(s,picks\.selected\)\s*:\s*\[\]/);
  assert.doesNotMatch(candidateSource, /journeyReady && rwOfficialJourneyFareInfo\(picks\.selected\)\s*\? pricedSegmentsQuick/);
  const totals = segmentTotals([
    { mode: 'Trein', fare: { value: 12.45, source: '9292 journey fareInfo' } },
    { mode: 'Veerboot', fare: { value: 32.68, source: 'Rederij Doeksen tarieven personen 2026' } },
    { mode: 'Veerboot', fare: { value: 11.31, source: 'Rederij Doeksen tarieven personen 2026' } }
  ]);
  assert.equal(totals.exact, 56.44);
  assert.equal(totals.min, 56.44);
  assert.equal(totals.max, 56.44);
  assert.equal(totals.unknown, 0);
  assert.equal(totals.complete, true);
});

test('an explicit ReisWijzer journey choice outranks the stale native DOM selection', () => {
  assert.match(candidateSource, /let selectedId=rwExplicitJourneyId&&byId\.has\(rwExplicitJourneyId\)\?rwExplicitJourneyId:''/);
  assert.match(candidateSource, /function rwNavigateToJourney\(journey\)[\s\S]*?rwExplicitJourneyId=id/);
  assert.match(candidateSource, /if\(rwExplicitJourneyId&&!previewIds\.has\(rwExplicitJourneyId\)\)rwExplicitJourneyId=''/);
  assert.match(candidateSource, /rwResetToPlannerHome\(\)[\s\S]*?rwExplicitJourneyId=''/);
});

test('duplicate fastest cheapest and calmest recommendations are grouped by journey id', () => {
  const start = candidateSource.indexOf('function recommendationCards');
  const end = candidateSource.indexOf('function journeyBadges', start);
  const recommendationSource = candidateSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(recommendationSource, /const grouped=new Map\(\)/);
  assert.match(recommendationSource, /grouped\.get\(id\)\|\|\{journey,labels:\[\]\}/);
  assert.match(recommendationSource, /x\.labels\.join\(' · '\)/);
  assert.match(candidateSource, /\$\{recommendationCards\(picks,s,operators\)\}/);
});

test('a new direct plan keeps its loading view until plans and journey are ready', () => {
  assert.match(candidateSource, /rwPlannerUiState\.directPlanning=true;\s*rwPlannerUiState\.forceHome=false/);
  assert.match(candidateSource, /if\(first\?\.id\)await rwLoadJourneyDirect\(first\.id\);\s*rwPlannerUiState\.directPlanning=false;\s*renderBusy=false;\s*await render\(\)/);
  assert.match(candidateSource, /if\(rwPlannerUiState\.directPlanning\)return;\s*renderBusy=true/);
});

test('profile presents one save action and groups secondary controls as advanced', () => {
  const start = candidateSource.indexOf('function subscriptionForm');
  const end = candidateSource.indexOf('function wireSettings', start);
  const profileSource = candidateSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(profileSource, /rwSaveTop/);
  assert.doesNotMatch(profileSource, /Abonnementen & profiel/);
  assert.equal((profileSource.match(/id="rwSave"/g) || []).length, 1);
  assert.match(profileSource, /rw-advanced-profile/);
  assert.match(profileSource, /⚙ Geavanceerd/);
  assert.match(profileSource, /Wijzigingen opslaan/);
});

test('candidate architecture has no shadowed function declarations or retired planner paths', () => {
  const declarations = [...candidateSource.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
    .map(match => match[1]);
  const duplicates = declarations.filter((name, index) => declarations.indexOf(name) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
  for (const retiredName of [
    'plannerState',
    'segmentModel',
    'segmentProgress',
    'statusBadgeHtml',
    'rwCloakNativePlanner',
    'rwRenderOwnSuggestions'
  ]) {
    assert.doesNotMatch(candidateSource, new RegExp(`function\\s+${retiredName}\\s*\\(`));
  }
});
