# Research Register

## Purpose and evidence rules

This register tracks candidate repositories, providers, standards, and technical unknowns for 7xCinema. It is an initial shortlist—not an endorsement or a declaration that a source works.

- **Observed** means the linked public page or file was inspected.
- **Documented** means the repository states the feature exists; it does not prove current runtime success.
- **Unverified** means a hands-on test, code inspection, licence/terms review, or current reliability check remains necessary.
- Record verification dates when a candidate is retested. Provider reliability changes frequently.
- Public source code and reachable endpoints do not establish permission to access or redistribute content.

## Candidate repositories

### 1. MovieBox-TUI
- **Link:** https://github.com/mesamirh/MovieBox-Tui
- **Type:** Rust terminal application with a library target.
- **Observed:** The `Cargo.toml` defines a Rust library named `moviebox_tui`; the project's documented licence is MIT OR Apache-2.0. The provider guide describes a shared provider trait and integrations labelled MovieBox, 4KHDHub, Dramachi, CircleFTP, DhakaFlix, and community Stremio addons.
- **Potential value:** Existing domain structures, provider patterns, caching, search/detail logic, and accumulated provider-specific knowledge.
- **Risks/unknowns:** A library target is not proof of Android compatibility. Review dependencies, platform-specific modules, resolver behaviour, current provider uptime, source permissions, and whether provider logic can be safely separated from TUI assumptions.
- **Next action:** Inspect `src/lib.rs`, `src/providers/`, `src/service.rs`, resolver modules, tests, and build configuration. Run tests and a minimal compatibility spike before reusing code.
- **Status:** Priority 1 for code-reuse investigation; no integration approved yet.

### 2. FlixQuest
- **Link:** https://github.com/flixquest/flixquest
- **Type:** Flutter Android/mobile/tablet/Android TV streaming application.
- **Observed:** Its README describes a TMDB-powered catalogue, season/episode navigation, a separate Scraper API, provider status UI, direct VixSrc fallback, HLS/DASH/MP4 handling, subtitle search, offline features, and themes. Its repository declares GPL-3.0. Some backend implementation is described as a separate API rather than part of the Flutter repository.
- **Potential value:** Mobile-first UX, Android TV interaction, player controls, subtitle UX, loading/error states, provider health presentation.
- **Risks/unknowns:** The listed scraper backend is not fully represented by the client repository. Current build status, release activity, provider permission, and dependency/licence implications require inspection.
- **Next action:** Inspect app modules, player code, route/state architecture, and release/build workflow; compare with React/Capacitor and other candidates.
- **Status:** Priority 1 for UX/player architecture research; not selected as a base.

### 3. CloudStream
- **Link:** https://github.com/recloudstream/cloudstream
- **Type:** Android media-centre application with extension-oriented integrations.
- **Observed:** Its README describes extensions providing source functionality rather than shipping an all-inclusive source catalogue; project licence is GPL-3.0.
- **Potential value:** Provider isolation, extension lifecycle, error handling, and separation of app UX from sources.
- **Risks/unknowns:** Individual extensions need separate review; compatibility and source legitimacy vary. GPL-3.0 compatibility needs analysis before incorporating code.
- **Next action:** Read extension interfaces, API boundaries, tests, and maintenance rules. Treat as architectural study unless an explicit reuse decision is recorded.
- **Status:** Priority 2 reference.

### 4. TMDB-Embed-API
- **Link:** https://github.com/Inside4ndroid/TMDB-Embed-API
- **Type:** Node.js stream-aggregation API.
- **Observed:** The inspected package manifest describes a TMDB-ID-in/streams-out API and dependencies for HTTP, HTML parsing, concurrency limiting, cookies, and caching. The manifest declares MIT.
- **Potential value:** Compare provider registry, aggregation, result normalisation, health checks, cache strategy, and handling of multiple resolver outcomes.
- **Risks/unknowns:** README/release claims require validation; providers may break. Inspect security boundaries, redirects, proxy behaviour, source permissions, dependency health, API exposure, and live behaviour before considering any use.
- **Next action:** Inspect `apiServer.js`, provider modules, rate limiting, request validation, tests, and release history. Do not deploy as a public proxy without a security and permission review.
- **Status:** Priority 1 for aggregation design study; no dependency approved.

### 5. Stremio Addon SDK
- **Link:** https://github.com/Stremio/stremio-addon-sdk
- **Type:** SDK for compatible HTTP addon integrations.
- **Observed:** Public repository provides an addon integration framework. It is a protocol/framework, not a guarantee of any content catalogue or playback source.
- **Potential value:** Standardised adapter for compatible catalogues, metadata, streams, and subtitles.
- **Risks/unknowns:** Addons vary in availability, metadata completeness, source rights, and quality.
- **Next action:** Review protocol schemas and consider a narrow adapter with capability and permission checks.
- **Status:** Priority 2 interoperability reference.

### 6. iptv-org/iptv
- **Link:** https://github.com/iptv-org/iptv
- **Type:** Publicly listed IPTV stream catalogue.
- **Potential value:** Separate research path for legitimate, publicly accessible live television.
- **Risks/unknowns:** Public listing alone does not establish authorisation, ownership, uninterrupted availability, or compatibility; validate each entry and its rights before integration.
- **Next action:** Evaluate only for a distinct live-TV scope after the movie/series MVP.
- **Status:** Deferred; not part of the initial movie/series milestone.

## Provider inventory inherited from MovieBox-TUI documentation

The inspected provider guide lists MovieBox, 4KHDHub, Dramachi, CircleFTP, DhakaFlix, and community Stremio add-ons. The guide describes them as primary catalogue, high-resolution sources, Asian drama, BDIX media, and addon integrations respectively.

This inventory is **documentation evidence only**. Before any integration, confirm:
- the current code path and actual behaviour;
- terms/licensing and whether the intended access is permitted;
- current uptime from a repeatable test;
- region/network requirements;
- catalogue/episode coverage;
- what language metadata truly represents;
- playback formats and real startup success;
- security exposure and maintenance responsibility.

CircleFTP/DhakaFlix are described in the upstream docs as BDIX-oriented. Do not assume they are reachable or advantageous from every ISP or region.

## Research scorecard

Score each candidate 0–5 only after collecting evidence; use “Unknown” rather than a guessed score.

| Dimension | Questions |
|---|---|
| Coverage | How many relevant titles, episodes, and regions? How measured? |
| Language quality | Are audio tracks, separate dubbed files, and subtitles distinguishable? |
| Resolution | Is quality metadata verified against the actual source? |
| Reliability | Search success, resolve success, playback-start success, and latency over a defined sample? |
| Compatibility | Can the intended Android player handle the actual formats? |
| Maintenance | Recent activity, issue response, tests, stable releases, ownership? |
| Licence | Is code reuse compatible with 7xCinema distribution and dependencies? |
| Access legitimacy | Are interface access and content use authorised and consistent with terms/law? |
| Security | Input validation, redirect handling, secrets management, SSRF controls, and safe logging? |
| Integration cost | How much adapter/runtime/build complexity does it add? |

## Evidence log template

For each future finding, record:
- date and environment/region;
- repository commit or release tag;
- file paths inspected;
- test method and sample size;
- measured outcome and limitations;
- confidence level;
- decision and follow-up owner/action.

Do not use “supports every language,” “all sources working,” or similar claims without reproducible evidence.


## Code-level audit update — 2026-10-28

This section supersedes any earlier impression that a repository listing alone proves implementation readiness.

### MovieBox-TUI: inspected contract and service dispatch
Reviewed the upstream README, Cargo manifest, src/lib.rs, src/providers/mod.rs, src/providers/models.rs, src/service.rs, and the search call site in src/tui/app/search.rs. The same provider contract and service dispatcher were confirmed in Rahul's renamed fork.

- A library target exists, and the provider contract exposes capabilities, search, details, and a separate episode stream-resolution trait.
- The TUI search caller passes a currently selected context.provider to search_typed. MovieBoxService dispatches that single ProviderKind to its corresponding adapter. Therefore the core does **not** currently implement 7xCinema's desired “one user query searches every native provider” flow. It will need a separate orchestration/aggregation layer.
- src/lib.rs exposes TUI modules together with provider/service/network/player modules. A library target alone does not mean clean modular reuse. Verify build dependencies before choosing between extracting a provider-core crate, adapting select modules, or implementing a new provider layer.
- The README documents Android (Termux) use and external media players. This is not the same delivery model as a standalone polished APK with an in-app native player.
- AudioTrackOption currently carries a subject ID, language, and label, and MediaDetails holds a dubs collection. This is source/dub metadata; it is not proof of multiple selectable audio tracks inside the resolved media asset. Keep this distinction in 7xCinema's domain model.
- Project manifests/README declare MIT OR Apache-2.0. Review the exact license files and retain notices before copying any code.

**Status:** Highest-priority source of provider/domain reference material; not approved as a direct app dependency and not yet proven Android-app reusable.

Relevant files: [provider contract](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/mod.rs), [models](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/models.rs), [service](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/service.rs), [Android/Termux install](https://github.com/mesamirh/MovieBox-Tui/blob/main/docs/installation.md).

### FlixQuest: reference, not default fork
Reviewed its main README, pubspec.yaml, and provider module listing. It is a Flutter app; the repo declares GPL-3.0. The documented player integration depends on a separately maintained customised better_player_plus package, with the current pubspec using a sibling path and the README documenting a Git alternative. It also documents a separate Scraper API, so the client alone is not a self-contained provider engine.

**Status:** Study UI/player and track/subtitle UX; do not choose it as the base without a licence/build reproducibility review.

References: [repository](https://github.com/flixquest/flixquest), [pubspec](https://github.com/flixquest/flixquest/blob/main/pubspec.yaml), [provider modules](https://github.com/flixquest/flixquest/tree/main/lib/video_providers), [custom player setup](https://github.com/flixquest/flixquest/blob/main/README.md).

### CloudStream: native extension-architecture reference
The public repository is Kotlin/Android and declares GPL-3.0. It is actively maintained, but its size and copyleft obligations make it an architecture reference rather than an assumed base.

**Status:** Study extension boundaries and lifecycle. Reuse requires explicit licence compatibility analysis.

Reference: [CloudStream](https://github.com/recloudstream/cloudstream).

### TMDB-Embed-API: reference-only pending source and security review
Its README describes an aggregation API with a provider registry and numerous third-party stream/scraping adapters. The repo declares MIT, but this does not grant permission to use each upstream service or distribute its content. The public GitHub security page reports no configured security policy; the README also documents generated default admin credentials that must be changed.

**Status:** Learn from the registry/result-normalisation concept only. Do not copy or enable its stream resolvers until source authorization, access terms, security, maintenance, dependencies, and rights are independently assessed.

References: [repository](https://github.com/Inside4ndroid/TMDB-Embed-API), [package manifest](https://github.com/Inside4ndroid/TMDB-Embed-API/blob/main/package.json), [security page](https://github.com/Inside4ndroid/TMDB-Embed-API/security).

### Stremio Addon SDK: protocol candidate
Its documented protocol separates manifest, catalog, metadata, streams, and subtitles. The protocol can support an adapter boundary, but it does not guarantee the legality or reliability of individual addons.

**Status:** Candidate for a constrained interoperability adapter after addon-level review.

Reference: [resource documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/README.md).

### Metadata and native playback evidence
- [TMDB API FAQ](https://developer.themoviedb.org/docs/faq): TMDB documents non-commercial developer use with attribution and specific logo/notice requirements; commercial use requires a separate licensing conversation. TMDB is a metadata candidate, not a video-stream provider.
- [Media3 supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats) and [track selection](https://developer.android.com/media/media3/exoplayer/track-selection): the player can select tracks that the prepared media exposes; it cannot turn title-level language aggregation into a selectable track menu.

### Current research direction
1. Use MovieBox-TUI as a reference for provider concepts, while building a separate universal-search coordinator.
2. Prototype a React/TypeScript + Capacitor UI with a small Kotlin/Media3 player boundary first, subject to comparison with Flutter/native Kotlin in a technical spike.
3. Build aggregation tests with fake providers before depending on any live third-party source.
4. Prioritise official/documented and otherwise explicitly authorised sources. Treat public code, an HTTP response, a README claim, or an encrypted endpoint as insufficient evidence of permission or stability.
5. Keep TMDB metadata adoption conditional on intended use, terms, attribution, and any commercial licensing needs.
