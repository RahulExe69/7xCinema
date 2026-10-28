# 7xCinema

**One search. Multiple providers. One unified discovery and playback experience.**

7xCinema is an independent streaming-discovery application project. Its core idea is to coordinate multiple independently maintained providers so that users can discover more of the movies, series, seasons, episodes, audio languages, subtitles, and compatible playback sources available to them—without manually searching each provider.

The application should do the coordination internally. Users search once; 7xCinema gathers results from enabled integrations, reconciles duplicates carefully, preserves source provenance, combines verified language information, and offers the best compatible playback options it can establish.

> **Project status:** Research and prototype stage. A JavaScript reference core and a Kotlin/JVM aggregation/fan-out prototype are implemented and tested with synthetic providers; Android UI and live integrations are not yet implemented. Framework choices remain provisional until the Android feasibility gate is passed.

## Vision

- **Broad coverage:** search all configured providers concurrently and show useful partial results as they arrive.
- **One catalogue:** merge matching titles without hiding distinct seasons, episodes, cuts, or editions.
- **Language-aware discovery:** aggregate verified audio-track, separate dubbed-version, and subtitle availability across sources.
- **Reliable playback:** resolve sources, rank compatible options, handle failures, and retry sensible alternatives without trapping users in an endless loading state.
- **Provider independence:** an outage or change in one provider should not take down the application or erase results from others.
- **Honest UX:** distinguish confirmed details from provider claims and never promise a language or source that has not been verified.
- **Responsible integrations:** evaluate licences, terms, source legitimacy, privacy, and security before using any provider or repository.

## Product principles

1. **Search once, aggregate internally.** Provider selection is an implementation/configuration concern, not a required step in the normal user journey.
2. **Keep provenance.** Every title, language, episode, subtitle, and stream option must remain traceable to the provider that supplied it.
3. **Do not confuse languages with files.** A separate Hindi-dubbed video is not the same thing as a Hindi audio track inside an English video.
4. **Prefer verified playback over inflated counts.** A source that resolves and plays is more valuable than a large list of dead links.
5. **Fail independently.** Use timeouts, cancellation, health indicators, sensible retries, and partial-result handling.
6. **Research before choosing.** Reuse proven components when their architecture, maintenance, licence, and suitability have been checked; do not copy projects blindly.

## Documentation map

- [Product vision](docs/PRODUCT_VISION.md) — goals, users, principles, non-goals, success measures.
- [Requirements](docs/REQUIREMENTS.md) — intended user-facing behaviour and acceptance criteria.
- [Architecture](docs/ARCHITECTURE.md) — proposed components and data flow; implementation choices remain open.
- [Provider system](docs/PROVIDER_SYSTEM.md) — integration contract, capabilities, health, and lifecycle.
- [Coverage model](docs/COVERAGE_MODEL.md) — distinguishes catalogue discovery, in-app playback, official destinations, and language availability.
- [Multilingual model](docs/MULTILINGUAL.md) — audio, dubbed versions, subtitle languages, provenance, and confidence.
- [Search and deduplication](docs/SEARCH_AND_DEDUPLICATION.md) — matching, merging, and avoiding false matches.
- [Playback](docs/PLAYBACK.md) — source ranking, playback states, retries, and error handling.
- [Research summary](docs/RESEARCH_SUMMARY.md) — key findings, provisional base recommendation, and next feasibility gate.
- [Research register](docs/RESEARCH_REGISTER.md) — candidate repositories, evidence, unknowns, and next investigations.
- [Provider matrix](docs/PROVIDER_MATRIX.md) — integration roles, eligibility gates, and evidence-based scoring.
- [Technical audit](docs/TECHNICAL_AUDIT.md) — code-level findings on the core candidates and existing provider model.
- [Framework comparison](docs/FRAMEWORK_COMPARISON.md) — React/Capacitor, native Kotlin, Flutter, Rust reuse, and backend trade-offs.
- [Base repository comparison](docs/BASE_REPOSITORY_COMPARISON.md) — whether to adapt NuvioMobile or build a fresh 7xCinema app.
- [Android feasibility gate](docs/ANDROID_FEASIBILITY_GATE.md) — verified Nuvio search/player observations, candidate trade-offs, and the end-to-end acceptance gate.
- [Roadmap](docs/ROADMAP.md) — staged plan from research to a testable application.
- [Decision log](docs/DECISIONS.md) — recorded decisions and choices that still require evidence.
- [Security and privacy](docs/SECURITY.md) — provider trust boundaries, secrets, network safety, and data minimisation.
- [Testing strategy](docs/TESTING.md) — validation plan for aggregation, providers, languages, and playback.
- [Universal search core prototype](prototype/aggregation-core/README.md) — JavaScript reference implementation and automated tests using synthetic providers.
- [Kotlin aggregation core](prototype/kotlin-aggregation-core/README.md) — Kotlin/JVM title grouping, language provenance, bounded provider fan-out, timeout isolation, and CI tests.
- [Glossary](docs/GLOSSARY.md) — shared terminology for the project.
- [Contributing](CONTRIBUTING.md) — workflow and quality expectations.

## Project status at a glance

| Area | Current status |
|---|---|
| Product vision | Documented |
| Provider candidates | Multi-pass architecture audit, provider matrix and summary; eligibility/runtime verification ongoing |
| Existing Rust provider foundation | Provider traits and service dispatcher inspected; native-provider search is single-provider, so universal aggregation is new work |
| Android/UI framework | Fresh Kotlin/Compose + Media3 is the preferred Android-first spike; Capacitor remains a comparison candidate; no app stack has passed the device gate |
| Universal search engine | JavaScript reference plus Kotlin/JVM fan-out prototype pass synthetic-provider tests; live provider adapters and UI integration remain open |
| Cross-provider deduplication | Prototype groups by shared IDs with a conservative ID-less title/year fallback; broader evaluation remains open |
| Language aggregation | Prototype preserves source-scoped claims and distinguishes provider claims from player-verified tracks |
| Playback and fallback | Planned; no app-level playback path validated |
| Automated tests / CI | JavaScript and Kotlin/JVM prototype suites run in GitHub Actions; Android application build/device playback not established |

## Current research references

- [MovieBox-TUI](https://github.com/mesamirh/MovieBox-Tui) — Rust/TUI project with provider abstractions; useful reference, not a finished mobile app.
- [NuvioMobile](https://github.com/NuvioMedia/NuvioMobile) — Kotlin/Compose + Media3 + addon-based app; useful architecture/player reference. Current search is concurrent but section-oriented; GPL-3.0 must be considered before reusing code.
- [Lumora](https://github.com/LumoraPlayer/Lumora) — multi-source grouping reference only; current licence/author constraints rule it out as a rebrand base.
- [AIOStreams](https://github.com/Viren070/AIOStreams) — Stremio addon aggregation-pipeline reference, AGPL-3.0; not a complete consumer app.
- [FlixQuest](https://github.com/flixquest/flixquest) — Flutter Android/Android TV application; useful for mobile UX and player architecture research.
- [CloudStream](https://github.com/recloudstream/cloudstream) — Android application with an extension-oriented provider model.
- [TMDB-Embed-API](https://github.com/Inside4ndroid/TMDB-Embed-API) — Node.js multi-provider aggregation example; backend behaviour and source suitability require review.
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) — reference for a standardised catalogue/stream/subtitle integration protocol.
- [Official Sources](https://github.com/user-griffin/official-sources) — reference for official watch destinations that link out instead of proxying video.
- [Watchmode](https://api.watchmode.com/) — optional official-availability metadata API, not a playback source; pricing/region/terms need review.
- [OpenSubtitles.com API](https://ai.opensubtitles.com/api-docs) — candidate for subtitle search; use the current REST API, not the retired legacy endpoint.
- [Wyzie Subs](https://docs.wyzie.io/subs/intro) — alternative subtitle API candidate subject to its terms and quota.
- [iptv-org/iptv](https://github.com/iptv-org/iptv) — separate candidate source of publicly listed live-TV streams; each stream's authorisation and availability must be checked.

See the [research register](docs/RESEARCH_REGISTER.md) for the evidence and caveats. A repository being public, an endpoint responding, or a provider appearing in documentation does **not** by itself establish that it is reliable, authorised, or appropriate to integrate.

## Before implementation

The framework-neutral search prototype passes its automated tests. The Android feasibility gate now specifies the smallest end-to-end proof needed before committing to the long-term app base:

1. port or reuse the search contract with parity fixtures;
2. build a search screen, unified result, source picker, and player surface;
3. verify real prepared-player audio/subtitle tracks using permitted test media;
4. demonstrate timeout/error isolation and a reproducible debug APK build;
5. select the app foundation based on the spike, then add eligible providers one at a time.

No app framework or backend stack is finalised yet. See [Android feasibility gate](docs/ANDROID_FEASIBILITY_GATE.md).

## Responsible use

7xCinema is intended to integrate sources that the project is authorised to access and present. Do not implement DRM circumvention, access-control bypasses, credential theft, or methods to evade a provider's restrictions. Respect applicable law, licences, terms, regional restrictions, and takedown requirements. Prefer official APIs and documented interfaces where available.

Metadata and provider responses are untrusted input. Follow the security guidance before exposing provider integrations to users or hosting a backend.

## Contributions

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Changes should preserve provider independence, source provenance, accurate language claims, and testability.
