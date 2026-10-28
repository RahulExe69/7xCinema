# 7xCinema Roadmap

This roadmap sequences work by reducing the biggest risks early. Dates and effort estimates are intentionally omitted until repository and environment research is complete.

## Phase 0 — Product baseline (current)
**Goal:** Align on the product and record the requirements before implementation.

- [x] Create an independent 7xCinema repository.
- [x] Document product vision and requirements.
- [x] Document proposed provider, search, language, and playback architecture.
- [x] Create an initial research register.
- [ ] Review the baseline documents and record material changes in the decision log.

**Exit gate:** The scope and acceptance criteria are clear enough to guide research and prototypes.

## Phase 1 — Candidate and licence audit
**Goal:** Choose a technically sound foundation and eligible integrations.

- [x] Inspect initial MovieBox-TUI provider contract, service dispatch, models, Cargo manifest, and Android/Termux delivery model.
- Inspect MovieBox-TUI dependency graph and confirm local fork divergence.
- Inspect FlixQuest's UI/player structure.
- [x] Inspect TMDB-Embed-API's advertised registry/aggregation model and record its security/source-eligibility concerns.
- Inspect selected aggregation logic and security boundaries only as needed for architectural research.
- [x] Inspect CloudStream's extension-oriented model and Stremio's resource protocol at README/docs level.
- Compare extension loading/contract details without copying unreviewed integrations.
- Review licences of candidate projects and transitive dependencies.
- Assess provider access legitimacy, terms, maintenance, regions, and security.
- Build a capability/evidence matrix for explicitly eligible providers, with date/region/test method and separate search/resolve/playback verification.

**Exit gate:** Architecture alternatives and at least one eligible end-to-end integration candidate are backed by evidence. Initial code audit is documented in TECHNICAL_AUDIT.md; source eligibility, deeper code checks, and runtime verification remain open.

## Phase 2 — Technical feasibility spike
**Goal:** Prove the difficult pieces before investing in a large app.

- Compare Flutter, React/Capacitor, and a Rust/local-service approach against explicit criteria.
- Establish whether reusable Rust components compile and run in the intended Android environment.
- Demonstrate UI-to-provider request and typed result mapping.
- Demonstrate playback of a permitted test asset through the intended player.
- Prove that the chosen approach can expose player errors and actual audio/subtitle tracks where supported.
- Record a decision and rationale in the decision log.

**Exit gate:** A repeatable proof of concept runs on Android and confirms the chosen stack and provider-execution model.

## Phase 3 — Aggregation core
**Goal:** Prove the central product value with fake/test providers before adding many live integrations.

- Define domain types and provider contract.
- Implement registry, bounded parallel search, per-provider timeouts, cancellation, and partial results.
- Implement normalisation, conservative deduplication, source provenance, and metadata conflict handling.
- Model audio tracks, separate dubbed versions, and subtitles separately.
- Implement health observations, cache expiry, and typed errors.
- Add unit tests and deterministic evaluation fixtures.

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
