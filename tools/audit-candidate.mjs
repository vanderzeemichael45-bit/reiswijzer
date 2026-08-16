import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const candidatePath = path.resolve('candidate/ReisWijzer.user.js');
const stablePath = path.resolve('stable/ReisWijzer.user.js');
const manifestPath = path.resolve('reports/candidate-data-manifest.json');
const stableHashPath = path.resolve('tests/stable.sha256');
const source = fs.readFileSync(candidatePath, 'utf8');
const stable = fs.readFileSync(stablePath, 'utf8').replace(/\r\n/g, '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const metadataVersion = source.match(/^\/\/ @version\s+(\S+)/m)?.[1];
const runtimeVersion = source.match(/const VERSION='([^']+)'/)?.[1];
assert(metadataVersion, 'Candidate metadata version is missing');
assert.equal(metadataVersion, runtimeVersion, 'Metadata and runtime versions differ');
assert.match(source, /^\/\/ @name .*Candidate/m);
assert.match(source, /^\/\/ @updateURL\s+https:\/\/raw\.githubusercontent\.com\/vanderzeemichael45-bit\/reiswijzer\/main\/candidate\/ReisWijzer\.user\.js/m);
assert.match(source, /^\/\/ @downloadURL\s+https:\/\/raw\.githubusercontent\.com\/vanderzeemichael45-bit\/reiswijzer\/main\/candidate\/ReisWijzer\.user\.js/m);
assert.match(source, /function rwDatasetCoversDate/);
assert.match(source, /expired-local-catalog/);
assert.match(source, /unsafeSegmentSumming:false/);

const expectedStableHash = fs.readFileSync(stableHashPath, 'utf8').trim();
assert.equal(hash(stable), expectedStableHash, 'Stable changed without an approved baseline update');

const data = [];
for (const [index, line] of source.split(/\r?\n/).entries()) {
  const match = line.match(/^\s*const\s+([A-Z][A-Z0-9_]*2026[A-Z0-9_]*)=(.*);$/);
  if (!match || line.length < 100_000) continue;
  const payload = match[2];
  let parsed;
  try { parsed = JSON.parse(payload); } catch { parsed = null; }
  const windows = [];
  const collect = value => {
    if (Array.isArray(value)) for (const item of value) collect(item);
    else if (value && typeof value === 'object') {
      if (Array.isArray(value.v) && value.v.length >= 2) windows.push(value.v.slice(0, 2));
      if (value.f && value.t) windows.push([value.f, value.t]);
    }
  };
  collect(parsed);
  data.push({ name: match[1], line: index + 1, bytes: Buffer.byteLength(payload), sha256: hash(payload), validityWindows: windows });
}

const manifest = { schemaVersion: 1, candidateVersion: metadataVersion, generatedFrom: 'candidate/ReisWijzer.user.js', datasets: data };
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, serialized);
} else {
  assert.equal(fs.readFileSync(manifestPath, 'utf8'), serialized, 'Data manifest is stale; run node tools/audit-candidate.mjs --write');
}

console.log(`candidate audit: OK (${metadataVersion}, ${data.length} large embedded datasets)`);
