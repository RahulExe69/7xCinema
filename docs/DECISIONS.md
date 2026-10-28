# Architecture Decision Log

Use this file to record decisions that materially affect the product or architecture. For a major change, add a new entry instead of silently rewriting history.

Statuses: **Accepted**, **Proposed**, **Open**, **Superseded**.

## D-001 — Keep 7xCinema as an independent product repository
- **Status:** Accepted
- **Decision:** The new `RahulExe69/7xCinema` repository is the product's source of truth. `RahulExe69/MovieBox-TUI` remains the separately named upstream-based project/reference.
- **Reason:** Product planning and application changes should not be mixed accidentally with the original TUI project's maintenance.
- **Implication:** Reuse must be deliberate, documented, and licence-compatible; don't assume copying a file is harmless.

## D-002 — The user searches once; the app aggregates internally
- **Status:** Accepted
- **Decision:** Normal user flow should search all enabled, eligible providers without requiring manual provider selection.
- **Reason:** Coverage should not depend on the user knowing which provider holds a title.
- **Implication:** Provider registry, concurrency control, partial results, normalisation, and per-provider failure isolation are core components.

## D-003 — Preserve source provenance
- **Status:** Accepted
- **Decision:** Provider origin and evidence must survive normalisation and deduplication.
- **Reason:** Enables language accuracy, conflict resolution, debugging, and source-specific playback.
- **Implication:** Aggregated title metadata cannot replace the underlying source records.

## D-004 — Model multilingual options distinctly
- **Status:** Accepted
- **Decision:** Embedded audio tracks, separate dubbed versions, embedded subtitles, external subtitles, and unverified claims are different domain concepts.
- **Reason:** A language offered by one source does not imply it is present in every source or selectable within one media asset.
- **Implication:** User-visible language badges and player menus must reflect evidence and capability.

## D-005 — Choose framework after a technical spike
- **Status:** Open
- **Decision under evaluation:** Flutter vs React/Capacitor vs another justified Android approach, and in-process vs local vs remote provider execution.
- **Reason:** The project has not yet demonstrated an end-to-end Android path. Existing technologies in other projects are useful context, not automatic selection criteria.
- **Required evidence:** Maintainability, Android lifecycle/packaging, player integration, Rust reuse feasibility, provider constraints, licences, performance, security, and developer workflow.

## D-006 — Use conservative deduplication
- **Status:** Accepted
- **Decision:** Merge only with sufficient evidence; keep ambiguous matches separate until resolved.
- **Reason:** False merges can hide distinct movies, seasons, episodes, or editions.
- **Implication:** Matching is explainable, reversible, and tested against curated fixtures.

## D-007 — Rank search results and playback sources separately
- **Status:** Accepted
- **Decision:** A title's relevance in search is distinct from a source's suitability for playback.
- **Reason:** The most relevant catalogue entry is not necessarily the source with the best language or compatibility.
- **Implication:** Separate ranking policies and tests are required.

## D-008 — A provider is not stable just because it is listed
- **Status:** Accepted
- **Decision:** Provider promotion requires source/terms review, code inspection, repeatable tests, capability evidence, and a documented maintenance plan.
- **Reason:** Endpoints break and permissions/terms change.
- **Implication:** Research register and provider lifecycle status must be maintained.

## D-009 — Responsible access is a hard requirement
- **Status:** Accepted
- **Decision:** Integrations must respect applicable rights, licences, terms, technical access controls, and regional restrictions.
- **Reason:** An open repository or reachable URL is not evidence of redistribution rights.
- **Implication:** Do not implement DRM circumvention, credential theft, access-control bypass, or an unrestricted proxy.

## D-010 — Build an aggregation core against test providers first
- **Status:** Proposed
- **Decision:** Implement the orchestration and data-model proof against deterministic fake/test providers before scaling live integrations.
- **Reason:** Enables testing deduplication, partial results, failure isolation, and language evidence without depending on unstable upstreams.
- **Next step:** Confirm after framework/architecture spike.

## Open questions

- Which app framework best serves the intended Android experience and maintenance capacity?
- Should provider adapters run in-process, in a local companion service, or remotely, and which providers permit each model?
- Which metadata provider/licence is suitable, and what are its rate and attribution terms?
- What exact evidence threshold is required to merge two records?
- How should provider capability and health data be exposed to users?
- What is the minimum viable player capable of handling required transports and selectable audio/subtitle tracks?
- Which persistence features belong in the first user-facing release?


## D-011 — Audit the provider core before reusing the TUI crate
- **Status:** Accepted
- **Decision:** Treat MovieBox-TUI as a reference and possible source of isolated provider/domain modules, not a direct Android app dependency.
- **Evidence:** The inspected service dispatches search by a single ProviderKind and its UI search call passes the currently selected provider. The library exports the TUI module alongside service/provider modules, and its documented Android usage is Termux with an external player.
- **Implication:** 7xCinema needs a distinct universal-search coordinator. Validate whether a clean provider-core extraction is viable before consuming the complete crate.

## D-012 — Prototype React/Capacitor plus a native Media3 boundary first
- **Status:** Proposed
- **Decision:** Use React + TypeScript + Capacitor as the first framework feasibility spike, with a small Kotlin/Media3 integration for supported media playback and real audio/subtitle-track events.
- **Reason:** It balances web-first UI iteration with access to Android's native player APIs and avoids committing to a large third-party app fork.
- **Conditions:** This is not final until the proof-of-concept gates in FRAMEWORK_COMPARISON.md pass. Compare Flutter/native Kotlin if player bridging, native lifecycle, or network access becomes too costly.

## D-013 — Third-party source permission is a provider gate
- **Status:** Accepted
- **Decision:** Do not integrate a provider because its repository is public, its API responds, or another project lists it. Require source/terms/rights/security review and repeatable behaviour tests before enabling it.
- **Reason:** A code licence does not grant rights to every upstream service or media returned by an adapter.
- **Implication:** TMDB-Embed-API is currently architecture-reference-only; individual stream resolvers are not approved for reuse.

## D-014 — Use media track selection only for real media tracks
- **Status:** Accepted
- **Decision:** The player's audio/subtitle menu reflects tracks discovered from the actual prepared media and track capabilities. A separate dubbed version is a separate playback candidate.
- **Reason:** Title-level language aggregation can combine options from multiple sources but cannot manufacture an embedded track.
- **Implication:** Language-source mapping and source provenance are mandatory in domain models and tests.


## D-015 — Reopen framework choice after second-pass audit
- **Status:** Open
- **Decision:** Before implementation, compare (A) native Kotlin/Jetpack Compose + Media3 and (B) React/TypeScript + Capacitor with a native Media3 plugin using the same small vertical-slice acceptance test. Keep Flutter as a fallback, not an assumed base.
- **Reason:** The new audit found native Kotlin/Compose projects with Media3/addon capability patterns and a multi-source native reference. React familiarity may still offer faster UI iteration; bridge/player complexity needs evidence.
- **Required evidence:** Reproducible Android build, fake-provider universal search, partial results, title grouping/language provenance, actual test-media track selection, player failure events, lifecycle handling, package/build complexity, licence/dependency review, and developer iteration effort.
- **Relationship to D-012:** React/Capacitor remains a viable candidate but is no longer the only initial spike. No framework is accepted until this comparison is recorded.

## D-016 — Treat official destinations separately from playable streams
- **Status:** Accepted
- **Decision:** An availability integration may provide an official streaming/rental/purchase destination without providing playable media. Represent it as an external destination, not as an in-app stream.
- **Reason:** Users should miss less availability information even when 7xCinema cannot authoritatively play a title internally.
- **Implication:** Measure catalogue discovery, in-app playback and official-destination coverage separately. Validate destination domains and API terms.

## D-017 — Every result retains source identity
- **Status:** Accepted
- **Decision:** Aggregated title/source records and playback candidates retain explicit provider identity; never rely on one global active provider.
- **Reason:** Source-specific IDs, detail calls, language claims, restrictions, and playback resolution differ.
- **Implication:** A logical title groups sources but does not erase provider-specific records. Matching must be source-aware and reversible.


## D-018 — Evaluate NuvioMobile as an existing-app base before committing to a fresh stack
- **Status:** Open
- **Decision under evaluation:** Compare a NuvioMobile adaptation spike against a fresh 7xCinema app. If building fresh, compare native Kotlin/Compose + Media3 with React/Capacitor + a native Media3 plugin.
- **Evidence:** Nuvio already has native player integrations, addon capability checks, and concurrent searches across enabled addon catalogs/server libraries. Current search presents results as separate catalogue sections rather than one global canonical-title merge, so the core product requirement still needs work.
- **Trade-offs:** Nuvio's GPL-3.0 licence may impose obligations on a distributed derivative; it is also a large, active project with a user-configured addon model. A fresh app gives cleaner UX/control but requires more player, lifecycle and native bridge work.
- **Required evidence:** Clean build, license/dependency review, ability to configure approved sources by default, universal title grouping/language provenance, actual test playback/track selection, build/release complexity, and amount of invasive refactor.
- **Relationship to D-015:** Framework comparison now includes the choice of app base as well as the language/UI framework. No base has been selected.


## D-019 — Keep the aggregation proof-of-concept independent from the app framework
- **Status:** Accepted for prototype; production architecture remains open
- **Decision:** Maintain the first universal-search slice as a dependency-free prototype under prototype/aggregation-core. Do not treat its JavaScript runtime as the final app/domain runtime until the Nuvio/native/Capacitor comparison is complete.
- **Evidence:** The prototype searches all explicitly eligible test adapters with bounded concurrency, per-provider timeouts, progressive partial results, distinct empty/error outcomes, conservative ID/title-year matching, source provenance, same-provider duplicate-row collapse, and source-scoped language claims. Player-selectable embedded tracks are added only from an explicit player observation. GitHub Actions tests passed on the merged main commit dcd413a7816218b08fdfebc2ee3e32b56c6c1156.
- **Limitations:** All providers are synthetic. No live third-party playback source, Android UI, video player, source resolution, pagination, cache policy or production security adapter has been integrated.
- **Next gate:** Compare NuvioMobile adaptation with fresh native Kotlin/Compose + Media3 and React/Capacitor + native Media3 using the same vertical-slice tests. Reuse or port this core only if the chosen path warrants it.


## D-020 — Prefer a fresh native Android vertical-slice spike before adapting NuvioMobile
- **Status:** Provisional recommendation; final app-base decision remains open
- **Decision under evaluation:** Build a tiny fresh Kotlin/Compose + AndroidX Media3 slice first, while retaining a time-boxed React/Capacitor comparison. Do not fork NuvioMobile as the default base yet.
- **Evidence:** Direct source inspection confirms Nuvio's search runs addon-catalogue and configured-server loaders concurrently and emits incremental results, but keeps them as separate `HomeCatalogSection` entries. Its Android playback path is mature and supports Media3 ExoPlayer with libmpv fallback. The product's global canonical-title/source/language grouping would need a separate mapping and UI/data-model change. The repository declares GPL-3.0. See [Android feasibility gate](ANDROID_FEASIBILITY_GATE.md).
- **Reason:** A fresh native slice tests the product's hardest requirements against a player API that can expose actual prepared tracks, without first committing to a large inherited app architecture. Capacitor remains attractive because the existing JavaScript prototype can be reused more directly, but track selection and lifecycle must be proven through a native bridge.
- **Required proof:** The same fixture-driven acceptance tests must pass for grouped search results, source selection, real prepared-player tracks, independent provider failures, and a reproducible debug APK.
- **Caution:** This is not approval to start broad provider integration or a claim that a native build already succeeds. Nuvio remains a serious fallback/reference candidate; any code reuse requires licence and dependency review.


## D-021 — Keep the first Android slice native and fixture-driven
- **Status:** Accepted for the feasibility slice; production architecture remains provisional
- **Decision:** Add a small fresh Kotlin/Compose Android application that depends on the Kotlin/JVM aggregation module and Media3, rather than forking NuvioMobile before testing the product-specific result model.
- **Evidence:** The Android slice now compiles in GitHub Actions and produces a debug APK. It runs the Kotlin domain core with three synthetic adapters, displays a merged title with per-source options/language claims, and provides a Media3 player probe with prepared-player track inspection/selection controls. Shared identity fixtures are consumed by both JavaScript and Kotlin tests.
- **Reason:** This proves that the native UI can call the aggregation model and host the intended player without inheriting a large application architecture. It does not prove production streaming: the search providers are synthetic and source-resolution is not connected.
- **Required next proof:** Install the built APK on a real Android device, play an authorised test asset, verify track switching/error/lifecycle behaviour, and demonstrate one provider-to-playback path only after source eligibility and terms are reviewed.
- **Caution:** Do not interpret a successful APK build or user-supplied test URL as approval of any third-party provider or proof that a real provider stream works.
