# ReisWijzer

ReisWijzer is a self-contained userscript that adds a fullscreen journey planner, fare comparison and diagnostics to 9292.nl.

## Release channels

- `candidate/ReisWijzer.user.js` is the test channel. Agent changes target this file and bump its userscript version.
- `stable/ReisWijzer.user.js` is the last user-confirmed release. It is never changed automatically.

## Run locally

There is no application server or package install. Import `candidate/ReisWijzer.user.js` into Tampermonkey or Violentmonkey, disable automatic updates while testing local edits, and open `https://9292.nl/`.

## Validate

Use Node.js 22 or newer:

```sh
node --check candidate/ReisWijzer.user.js
node tools/audit-candidate.mjs
node tests/fare-regressions.mjs
```

The regression suite executes the actual fare-group and product-semantics functions extracted from Candidate. The audit verifies metadata, the Stable baseline, safety markers and the generated embedded-data manifest.

## Promotion

Candidate changes go through a pull request. After real-world browser testing, an explicitly approved promotion may copy Candidate to Stable and update `tests/stable.sha256`. Branch protection and required reviews must also be enabled in GitHub repository settings; workflow failures can detect a direct Stable change but cannot undo a push.
