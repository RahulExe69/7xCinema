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
