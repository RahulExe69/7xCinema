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


## Second-pass candidates — 2026-10-28

These are architectural research references, not pre-approved sources or dependencies.

### 7. Lumora — closest source-merging design; do not fork or rebrand
- Link: https://github.com/LumoraPlayer/Lumora
- Observed: Native Kotlin Android app whose README describes combining multiple configured Xtream Codes, M3U/M3U8, Stalker Portal, Jellyfin, Silo, Plex, plugins, and Stremio addons into one interface. It describes a Find & Play flow.
- Code-level clue: Channel.kt comments explain that details and playback URL construction differ by source, so one global provider field is insufficient when many sources coexist. ContentGrouping.kt shows explicit title normalisation/grouping and quality/source tag handling.
- License/constraints: Current LICENSE is PolyForm Noncommercial 1.0.0; it says that replaces MIT for versions after v4.4 but is not retroactive for earlier versions obtained under MIT. README explicitly requests no renaming, rebranding, reskinning, or identity replacement. The repo description says “parked”.
- Value: Learn how to represent multiple sources per logical title, preserve source identity, handle duplicate catalogue entries, and rank equivalent channel/source options.
- Decision: High-value architecture reference only. Do not fork/rebrand it or copy current-licensed code without a specific reviewed basis and respect for the author’s constraints.
- Status: Study architecture; not a reuse base by default.

### 8. Nuvio Mobile — native player/addon architecture
- Link: https://github.com/NuvioMedia/NuvioMobile
- Type: Kotlin Multiplatform / Compose Multiplatform; Android build documented in README.
- License/activity: GitHub declares GPL-3.0; current branch is cmp-rewrite, with recent repository activity in October 2026.
- Code-level evidence: PlaybackAvailabilityTest.kt tests that catalog-only or metadata-only addons do not enable playback, while a compatible stream addon does; the tests check media type and ID-prefix compatibility. PlayerEngine.android.kt integrates Android Media3/ExoPlayer and optional MPV with lifecycle and playback-state handling.
- Value: Typed addon capabilities, player lifecycle, track handling, and contract tests.
- Limitation: Nuvio follows “bring your own sources”, while 7xCinema aims to coordinate eligible providers internally with minimal user setup. GPL-3.0 means code reuse/derivation needs a deliberate licensing decision.
- Status: High-value architecture reference; no automatic fork decision.

### 9. Nuvio TV — native TV/addon reference
- Link: https://github.com/NuvioMedia/NuvioTV
- Type: Kotlin/Jetpack Compose Android TV app with Media3; GPL-3.0.
- Value: TV navigation, addon management and native player integration if Android TV becomes a target.
- Status: Reference only; TV is not a first-MVP requirement.

### 10. Community Stremio Android — Kotlin/Compose + Rust bridge reference
- Link: https://github.com/stremio-native/stremio-android
- Observed: README describes an unofficial community Android client using Kotlin/Compose, Stremio core/addons, ExoPlayer/MPV and a Rust-powered local streaming component.
- Risks: GitHub metadata did not report a recognised licence. Its last reported code push was 2026-07-23, so inspect actual LICENSE, submodule/dependency licences, build reproducibility and maintenance before any reuse.
- Status: Architecture reference only; licensing/maintenance unresolved.

### 11. Official Sources — official availability/link-out integration
- Link: https://github.com/user-griffin/official-sources
- Observed: MIT-licensed Stremio-compatible addon. README says it returns legitimate subscription/free, rental and purchase destinations, then opens the official provider app or HTTPS title page. It expressly does not play, download, proxy, decrypt, scrape or redistribute video; authentication and playback remain in the official service.
- Value: A separate official-destination layer can improve discovery coverage when 7xCinema has no authorised, compatible in-app source. Clearly label it as an external hand-off, not in-app playback.
- Risks: Depends on Watchmode; check current API-plan features, attribution, caching, rate limits and maintenance. Repository metadata showed last push 2026-08-03; compatibility needs re-verifying.
- Status: Promising design/reference; not yet integrated.

### 12. SHS-Player — player-only reference
- Link: https://github.com/SHSLabs/SHS-Player
- Observed: Native Kotlin/Compose multimedia app declaring MIT, with Media3/LibVLC, subtitle, local media/network and IPTV functionality.
- Value: Playback UI and capabilities, not catalogue-wide provider aggregation.
- Limitations: Metadata showed last push 2026-07-23 and a smaller community; verify build/dependencies/maintenance before any reuse.
- Status: Player reference only.

## Source type taxonomy

Every integration must declare one or more explicit types:

1. Metadata/catalogue — title identity, artwork, descriptions, ratings, credits, genres, seasons and episodes; not playable media.
2. Playable source — an authorised candidate or resolver that may lead to in-app playback.
3. Official availability destination — a title-level official streaming, subscription, rental, purchase or app destination; not proof of in-app playability.
4. Personal library/server — the user’s own authorised media server; credentials must be handled securely.
5. Interoperability adapter — a protocol such as a Stremio-compatible addon interface. The protocol is not itself a source; each addon needs review.
6. Live-TV/IPTV catalogue — channels/EPG/live streams with separate rights, region and availability checks.

A title may combine metadata from one integration, playable candidates from another, and an official destination from a third. Preserve source type and provenance for every record.

## Revised research priorities

1. MovieBox-TUI: inspect for provider/domain concepts and possible isolated module reuse; universal search still needs its own orchestration.
2. Nuvio Mobile: study native Compose, Media3 and capability-aware addon/tests; GPL review needed for code reuse.
3. Lumora: study source identity and title grouping; do not fork/rebrand current project.
4. FlixQuest: study Flutter UI/player, noting GPL, custom player and separate scraper API.
5. Stremio Addon SDK and compatible clients: evaluate protocol support; each addon needs independent review.
6. Official Sources: consider a lawful official destination layer.
7. TMDB-Embed-API: aggregation concept only until source eligibility/security are established.
8. CloudStream and Nuvio TV: extension and TV UX references, not default bases.

The framework proof of concept should now compare native Kotlin/Compose + Media3 against React/Capacitor + a native player plugin before selecting the app framework.


## Metadata and official-availability API constraints — 2026-10-28

### Watchmode
Official references: [API overview](https://api.watchmode.com/), [pricing](https://api.watchmode.com/pricing), [ID mapping and availability](https://api.watchmode.com/use-cases/imdb-tmdb-ids).

The current public pricing page says its API returns availability data, title metadata, service IDs and official links/deeplinks—not video playback. Its Developer plan lists 2,500 monthly credits, non-commercial use with attribution, availability in up to three selected countries, and no app/episode deeplinks. The current paid plans list wider regional coverage and app/episode links. Plan/pricing/features can change; re-check the provider's live terms before implementing or shipping.

For 7xCinema, this could provide a separate external “Watch on official service” destination and where-to-watch layer. It must not be described as a playable stream provider. Because our target audience includes India, confirm that India is offered among supported regions for the chosen plan before relying on it. Do not assume region coverage merely because the API advertises many countries. Confirm caching, attribution, quota, intended-use category, and link verification requirements before deployment.

### TMDB
Official reference: [TMDB developer FAQ](https://developer.themoviedb.org/docs/faq).

TMDB says its developer API is free for non-commercial purposes with attribution to TMDB as the source of data/images, and it requires use of the TMDB logo plus a prominent notice that the product is not endorsed or certified by TMDB; its FAQ places attribution within an About/Credits section. It directs commercial-use enquiries to its licensing contact. These requirements should be confirmed against the current terms at implementation time.

For 7xCinema, TMDB remains a metadata/catalogue candidate, not a playback source. Keep the adapter replaceable and don't ship an API key in a public client if the API's requirements call for protected credentials. Before adopting, record whether the project's intended distribution/use fits the applicable terms and implement required attribution.

### Official destination coverage
Discovery coverage can improve by listing eligible official providers and externally handing off to their official apps or title pages. This is a different outcome from in-app playback and must have a distinct UI label and success metric. See [Coverage Model](COVERAGE_MODEL.md) and [Provider Matrix](PROVIDER_MATRIX.md).
