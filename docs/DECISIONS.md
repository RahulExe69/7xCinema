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
