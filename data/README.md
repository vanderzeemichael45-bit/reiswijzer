# Embedded fare data

ReisWijzer is distributed as one self-contained userscript. Large official fare and stop matrices therefore remain embedded in `candidate/ReisWijzer.user.js`; moving them to runtime downloads would add a new availability and integrity dependency.

`tools/audit-candidate.mjs` inventories every embedded 2026 dataset larger than 100 kB. Its hashes, sizes and explicit validity windows are recorded in `reports/candidate-data-manifest.json`. Regenerate the manifest after an intentional data update:

```sh
node tools/audit-candidate.mjs --write
```

CI rejects a stale manifest, mismatched versions, changed Stable baseline and missing safety markers. Runtime resolvers reject explicit expired delivery windows and reject all local 2026 tables outside calendar year 2026. Native current-journey 9292 prices remain an allowed fallback.
