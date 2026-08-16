# ReisWijzer agent instructions

This repository has two release channels:

- `candidate/ReisWijzer.user.js`: experimental build used for live testing.
- `stable/ReisWijzer.user.js`: last user-confirmed stable build.

## Hard rules

1. Never modify `stable/ReisWijzer.user.js` automatically.
2. AI/code-agent changes go only to a dedicated working branch and must target the candidate build.
3. Preserve the proven fare architecture and safety invariants unless a test explicitly proves a change is required:
   - deterministic fare pipeline
   - fareSystemId -> FareGroup -> resolver
   - `unsafeSegmentSumming=false`
   - physical/operator segment boundaries are not automatically fare boundaries
4. Never invent a price when native 9292 data is incomplete. Prefer an unresolved/known-part status.
5. Treat ferry product semantics, Weekend Vrij across train operators, native rail partitions and native BTM partitions as regression-sensitive.
6. Do not promote candidate to stable without explicit user approval after real-world testing.
7. Prefer adaptive runtime/fallback changes over brittle DOM selector patches.
8. Whenever transport/API behavior changes, retain native 9292 capture as a fallback until the replacement is proven.
9. Every code change must bump `@version` on candidate.
10. Keep `@updateURL` and `@downloadURL` pointed to the GitHub candidate path for candidate builds.

## Development loop

- Read `feedback/latest.json` and open issues labelled `runtime-feedback` when present.
- Form a specific hypothesis for the observed failure.
- Change the smallest coherent subsystem that addresses the root cause.
- Run static validation and regression tests.
- If tests pass, create/update a pull request targeting the candidate development branch.
- Never silently alter stable.
