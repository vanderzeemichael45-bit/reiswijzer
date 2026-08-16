import assert from 'node:assert/strict';
import { candidateSource, extractFunction, loadFunctions } from './helpers/candidate-harness.mjs';

const functions = loadFunctions([
  'getTripDate', 'tripDateTime', 'isNsWeekend', 'rwDatasetCoversDate',
  'rwLocalTariffCatalogCoversDate', 'rwFareFamily', 'rwFareSystemId',
  'rwCanJoinFareGroup', 'rwBuildFareGroupsFromLegs', 'rwNativePartitionFare',
  'rwFareGroupTotals', 'rwApplyKnownProductSemantics'
], {
  location: { pathname: '/reisadvies/Departure/2026-08-21T18:30/' },
  normalizeOperator: value => String(value || ''),
  fmtMoney: value => `EUR ${Number(value).toFixed(2)}`
});

assert.equal(functions.isNsWeekend('18:29'), false, 'Weekend Vrij starts Friday at 18:30');
assert.equal(functions.isNsWeekend('18:30'), true, 'Weekend Vrij applies Friday at 18:30');

assert.equal(functions.rwDatasetCoversDate({ v: ['2026-04-01', '2026-07-04'] }, '2026-07-04'), true);
assert.equal(functions.rwDatasetCoversDate({ v: ['2026-04-01', '2026-07-04'] }, '2026-07-05'), false);
assert.equal(functions.rwDatasetCoversDate({ f: '2026-08-01', t: '2026-12-31' }, '2026-08-16'), true);
assert.equal(functions.rwDatasetCoversDate({}, '2027-01-01'), false, 'Undated 2026 data must expire');
assert.equal(functions.rwLocalTariffCatalogCoversDate('2027-01-01'), false);

const railLegs = [
  { mode: 'Trein', operator: 'Arriva', from: 'Sneek Noord', to: 'Leeuwarden', departure: '19:00', identityKey: 'a' },
  { mode: 'Trein', operator: 'NS', from: 'Leeuwarden', to: 'Rotterdam Centraal', departure: '19:30', identityKey: 'b' }
];
const railGroups = functions.rwBuildFareGroupsFromLegs(railLegs);
assert.equal(railGroups.length, 1, 'Operator changes are not automatic rail fare boundaries');
assert.equal(railGroups[0].fareSystemId, 'NL_RAIL');

const btmGroups = functions.rwBuildFareGroupsFromLegs([
  { mode: 'Bus', operator: 'Qbuzz', from: 'A', to: 'B', identityKey: 'a' },
  { mode: 'Tram', operator: 'Qbuzz', from: 'B', to: 'C', identityKey: 'b' },
  { mode: 'Bus', operator: 'Arriva', from: 'C', to: 'D', identityKey: 'c' }
]);
assert.equal(btmGroups.length, 2, 'BTM joins within one operator and splits across operators');

const ferryGroups = functions.rwBuildFareGroupsFromLegs([
  { mode: 'Veerboot', operator: 'TESO', ferry: { operator: 'TESO', routeKey: 'texel' }, from: 'A', to: 'B', identityKey: 'a' },
  { mode: 'Veerboot', operator: 'TESO', ferry: { operator: 'TESO', routeKey: 'texel' }, from: 'B', to: 'A', identityKey: 'b' }
]);
assert.equal(ferryGroups.length, 2, 'Each ferry leg remains an explicit product boundary');

const partitionGroup = { ...railGroups[0], nativeFareCoverage: [
  { coverage: 'subset', price: 6.10, fromIndex: 0, toIndex: 1 },
  { coverage: 'subset', price: 27.30, fromIndex: 1, toIndex: 2 }
] };
assert.equal(functions.rwNativePartitionFare(partitionGroup).value, 33.40);
assert.equal(functions.rwNativePartitionFare({ ...partitionGroup, nativeFareCoverage: [
  { coverage: 'subset', price: 6.10, fromIndex: 0, toIndex: 1 },
  { coverage: 'subset', price: 27.30, fromIndex: 0, toIndex: 2 }
] }), null, 'Overlapping native partitions are rejected');
assert.deepEqual(
  JSON.parse(JSON.stringify(functions.rwFareGroupTotals([{ fare: { value: 6.1 } }, { fare: { value: null } }]))),
  { known: 6.1, unknown: 1, complete: false },
  'Known parts remain visible without inventing a total'
);

const teso = functions.rwApplyKnownProductSemantics(
  { mode: 'Veerboot', operator: 'TESO', ferry: { operator: 'TESO' } },
  { value: 3, note: 'test' }
);
assert.equal(teso.productType, 'return-ticket');

const resolver = extractFunction('rwResolveFareGroup');
assert.match(resolver, /through-rail-unresolved/);
assert.match(resolver, /btm-chain-unresolved/);
assert.doesNotMatch(resolver, /group\.legs\.reduce/);
assert.match(candidateSource, /unsafeSegmentSumming:false/);

console.log('fare regressions: OK');
