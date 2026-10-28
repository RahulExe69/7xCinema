# 7xCinema Roadmap

This roadmap sequences work by reducing the biggest risks early. Dates and effort estimates are intentionally omitted until repository and environment research is complete.

## Phase 0 — Product baseline (current)
**Goal:** Align on the product and record the requirements before implementation.

- [x] Create an independent 7xCinema repository.
- [x] Document product vision and requirements.
- [x] Document proposed provider, search, language, and playback architecture.
- [x] Create an initial research register.
- [x] Review the baseline documents and record material changes in the decision log.
- [x] Distinguish catalogue discovery, in-app playback, official destinations and language evidence.

**Exit gate:** The scope and acceptance criteria are clear enough to guide research and prototypes.

## Phase 1 — Candidate and licence audit (in progress)
**Goal:** Choose a technically sound foundation and eligible integrations.

**Status note:** The repository/code architecture audit and initial source-role matrix are documented. No third-party playable-source adapter has yet passed the complete eligibility and runtime verification gate. This phase is not complete.

- [x] Inspect initial MovieBox-TUI provider contract, service dispatch, models, Cargo manifest, and Android/Termux delivery model.
- [x] Compare the renamed MovieBox-TUI fork with upstream main: identical at commit 7b47958867f992fda91ed5315375c6137b1d2ebf, with no ahead/behind commits or changed files. Recheck if either branch moves.
- Inspect the dependency graph and decide whether a separate provider-core extraction is feasible.
- [x] Inspect NuvioMobile's actual search repository and Android player source: concurrent addon/server loaders emit partial results into per-catalogue sections; Media3 ExoPlayer and libmpv fallback are already implemented; GPL-3.0 is declared.
- [x] Add a base-repository comparison for Nuvio adaptation versus a fresh app.
- [x] Inspect Lumora, AIOStreams and Official Sources as source-aggregation/official-destination references.
- Inspect FlixQuest's UI/player structure.
- [x] Inspect TMDB-Embed-API's advertised registry/aggregation model and record its security/source-eligibility concerns.
- [x] Inspect selected aggregation logic in the MovieBox-TUI addon aggregator and AIOStreams README; broader security/eligibility review remains per provider.
- [x] Inspect CloudStream's extension-oriented model and Stremio's resource protocol at README/docs level.
- Compare extension loading/contract details without copying unreviewed integrations.
- Review licences of candidate projects and transitive dependencies.
- Assess provider access legitimacy, terms, maintenance, regions, and security.
- [x] Create an initial provider/data-source matrix distinguishing metadata, playable sources, official destinations, personal libraries and protocol adapters.
- [x] Build an initial declared-capability and source-role matrix. Live search/resolve/playback evidence remains an open research task.
- Verify TMDB/Watchmode terms, credits, attribution and India region support before adopting either service.

**Exit gate:** Architecture alternatives and at least one source that is both eligible and end-to-end verified are backed by evidence. The initial code audit is documented in TECHNICAL_AUDIT.md, but this exit gate remains OPEN until licensing/terms and security checks plus repeatable search, resolution, and playback tests are completed.

## Phase 2 — Technical feasibility spike
**Goal:** Prove the difficult pieces before investing in a large app.

- [x] Document Nuvio source findings, candidate trade-offs, licensing notes, and the shared end-to-end acceptance gate in ANDROID_FEASIBILITY_GATE.md.
- [x] Build a fresh Kotlin/Compose + Media3 Android slice: synthetic multi-provider search, unified result card, per-source picker, embedded Media3 player screen, and actual player track inspection/selection controls. CI produces a debug APK; physical-device playback verification remains open.
- [ ] Compare the fresh native slice with a minimal React/Capacitor + native Media3 bridge against the same fixture-driven acceptance tests before final stack selection.
- If the Nuvio spike is not selected, establish whether reusable Rust components compile and run in the intended Android environment.
- [x] Demonstrate UI-to-domain request and typed result mapping through synthetic adapters; network-backed provider integration remains open.
- Demonstrate playback of a permitted test asset through the intended player.
- Prove that the chosen approach can expose player errors and actual audio/subtitle tracks where supported.
- [x] Implement a framework-neutral prototype for bounded multi-provider catalogue search, progressive partial results, conservative title grouping and source-scoped language claims using synthetic providers.
- [x] Add deterministic tests for eligibility gating, concurrency, timeouts, partial results, errors vs empty results, title matching, episode coordinates, duplicate source rows, and player-observed tracks.
- [x] Confirm the original prototype test workflow passed on main commit dcd413a7816218b08fdfebc2ee3e32b56c6c1156.
- [x] Fix a duplicate-source identity-conflict edge case and add a regression test; PR #2 merged to main after GitHub Actions passed (merge commit ceac6430c9ba32173a7afffd4808741380dc0a63).
- Record a decision and rationale in the decision log after the Android/player and app-base comparison.

**Exit gate:** A repeatable proof of concept runs on Android and confirms the chosen stack and provider-execution model. The JavaScript/Kotlin prototypes pass CI, and the native Android slice builds a debug APK in CI. The Android/device player-validation portion remains open.

## Phase 3 — Aggregation core
**Goal:** Turn the validated prototype into a production-ready domain module before adding live integrations.

- [x] Prototype provider contracts, eligibility gating, bounded parallel search, per-provider timeout isolation and partial results.
- [x] Prototype conservative title grouping, source provenance, duplicate same-source row handling and separate language claim kinds.
- [x] Add deterministic synthetic-provider tests and a passing CI workflow.
- [x] Add shared pipe-delimited identity fixtures consumed by both the JavaScript and Kotlin tests; both suites pass against the same canonical-ID/grouping/language cases.
- [ ] Decide production language/runtime after the app-base comparison; retain or port the prototype only if the final stack benefits from it.
- [ ] Add user cancellation, cache expiry, typed provider diagnostics, ranking policy and broader adversarial/matching fixtures.
- [x] Add regression coverage preventing a conflicted source from regaining a year from a later duplicate row.
- [ ] Validate metadata conflict handling and stable identity behaviour on a curated cross-provider title set.
- [x] Connect a prototype Compose search/source-selection screen and Media3 player surface to the Kotlin domain layer. Playback source resolution remains unconnected.

**Exit gate:** The acceptance gate in REQUIREMENTS.md passes for at least two independent test providers.

## Phase 4 — First authorised provider and playback
**Goal:** Validate one end-to-end path before broadening source coverage.

- Implement one permitted provider adapter.
- Verify search, details/episodes, and source resolution separately.
- Implement the Watch flow and playback state machine.
- Add source compatibility checks, ranking, and safe fallback.
- Verify preferred-language behaviour and truthful track labels.
- Run failure/timeout and fallback tests on a real Android device.

**Exit gate:** Reproducible search-to-playback success and actionable failures are demonstrated.

## Phase 5 — Coverage expansion
**Goal:** Add integrations based on incremental value rather than raw provider count.

- Add eligible providers one at a time.
- Validate overlapping-title matching and source provenance.
- Measure catalogue coverage and language accuracy.
- Retire or disable unstable/unauthorised integrations.
- Add provider health summaries and maintenance procedures.

**Exit gate:** New integrations improve measured coverage without unacceptable false merges, security risk, or reliability regressions.

## Phase 6 — User experience and personal library
**Goal:** Turn the working core into a polished daily-use app.

- Home, search, detail, season/episode, and source-options screens.
- Language preferences and playback settings.
- Favourites, watch history, continue watching, and local-first settings.
- Accessibility, responsive layouts, network/error states, and loading feedback.
- Privacy review before adding analytics or account-based sync.

## Phase 7 — Release readiness
**Goal:** Produce a maintainable, secure release.

- Automated tests, linting, dependency review, and build CI.
- Signed release build and reproducible versioning.
- Secure configuration and secret scanning.
- Privacy notice, support/issue process, third-party notices, and provider-source policies.
- Device matrix testing and release checklist.
- Document deprecation/retirement path for each provider.

## Definition of done for any phase

- Requirements and acceptance criteria are testable.
- Code and dependencies have a documented licence/eligibility basis.
- Errors are typed and safely handled.
- Tests cover success and failure paths.
- No secrets or sensitive URLs are committed or logged.
- Docs describe actual behaviour, not only intended behaviour.
- The decision log captures architecture-changing trade-offs.
