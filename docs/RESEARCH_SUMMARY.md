# 7xCinema Research Summary

**Reviewed:** 2026-10-28  
**Status:** Research/prototype stage. JavaScript and Kotlin/JVM aggregation cores are tested; a Compose + Media3 Android slice builds in CI. Search data remains synthetic and no real third-party provider is connected.

## The product we are building

7xCinema is intended to give users a polished MovieBox-style experience while handling multiple providers internally. A single search should discover relevant content across eligible sources, group true duplicates into one logical title, preserve all distinct seasons/episodes/versions, aggregate verified language options with source provenance, and rank compatible playback candidates. Official watch destinations are an additional coverage layer, not in-app streams.

The central engineering distinction is that **catalogue search, per-title playback-source discovery, and official availability lookup are separate workflows**. They share IDs and metadata, but they return different things and require different verification.

## What the research shows

### 1. MovieBox-TUI is provider/domain reference, not the Android app base
- The user's renamed fork main branch is currently identical to upstream main at commit 7b47958867f992fda91ed5315375c6137b1d2ebf (0 ahead/behind, 0 changed files).
- The existing provider trait and models are useful reference material.
- The normal native-provider search path dispatches to one selected ProviderKind at a time. 7xCinema's cross-native-provider universal search is new work.
- The project also has an addon-level aggregator for streams returned by configured Stremio addons. That handles addon stream fan-out/dedup/ranking, but it is not the global catalogue-search feature.
- Provider-dub objects use source/subject IDs and language labels; they should not be mistaken for actual selectable audio tracks in a media asset.
- Android usage documented by the upstream is a terminal/Termux workflow with external players, not a finished MovieBox-style APK.

### 2. AIOStreams is the closest aggregation-pipeline reference
AIOStreams gathers results from configured Stremio addons, then deduplicates, filters, sorts and formats them. That makes it useful to study pipeline boundaries and tests. It is a Stremio-addon aggregator rather than a complete consumer app; it declares AGPL-3.0 and its upstream source integrations need their own terms/rights/security review. Do not import bundled providers or restriction-evasion proxy behaviour blindly.

### 3. NuvioMobile is a strong architecture/player reference, but not yet selected as the app base
Direct source inspection of `SearchRepository.kt` confirms that Nuvio builds requests across enabled add-on catalogues and configured server search targets, launches them concurrently, and publishes incremental results. `PlayerEngine.android.kt` confirms a mature Android Media3/ExoPlayer path with optional libmpv fallback.

Its gap: search results are emitted as separate catalogue/server sections, not globally merged into one canonical title card. Its setup is “bring your own sources” rather than an internally curated and automatically coordinated set. It declares GPL-3.0, so reuse requires an explicit distribution/licence decision. The source-level findings are documented in [Android feasibility gate](ANDROID_FEASIBILITY_GATE.md).

### 4. Lumora has the closest multi-source product concept, but is not a base candidate
It describes Find & Play across many configured source types and has source-aware grouping ideas. Its current licence is PolyForm Noncommercial 1.0.0; the project explicitly asks not to rebrand/reskin, and its repository is marked parked. Use as architecture inspiration only—do not fork/rebrand it.

### 5. FlixQuest and CloudStream are references, not automatic forks
FlixQuest has useful Flutter UI/player/subtitle patterns, but its repository declares GPL-3.0, its current player setup uses a separately maintained custom dependency, and it documents a separate scraper API. CloudStream is a large native Android extension model and declares GPL-3.0. Review their designs, not blindly copy their code.

### 6. Official availability can improve coverage without pretending to play video
- TMDB has metadata and Watch Providers endpoints, but Watch Providers provides availability data rather than video or full provider deep links. The docs require JustWatch attribution, and TMDB's API has its own attribution/usage terms.
- Watchmode supplies availability data and links, not playback. Its current public Developer plan lists 2,500 credits/month, non-commercial use with attribution, up to three selected countries, and no app/episode deeplinks; paid tiers are much more expensive.
- These should be optional availability adapters, not the core playback engine. Verify India coverage and current terms before adoption.

## Provisional base-selection recommendation

Do not fork a large project based on a README or screenshot. Compare three small feasibility paths using identical test cases:

1. **NuvioMobile adaptation spike** — quickest route if GPL-3.0 obligations are acceptable and its current architecture can be cleanly adapted.
2. **Fresh native Kotlin/Compose + Media3** — most direct control over Android player lifecycle and real audio/subtitle track selection.
3. **Fresh React/TypeScript + Capacitor with a native Media3 plugin** — keeps the web-first UI workflow but adds a bridge whose lifecycle/event behaviour must be tested.

MovieBox-TUI remains a potential source of isolated provider/domain concepts; it is not itself a fourth finished-app candidate. AIOStreams remains a pipeline reference, not a default hosted backend.

## Non-negotiable design rules

- One user query; many eligible catalogue providers; progressive partial results.
- Every provider/source retains identity and provenance after title grouping.
- Deduplicate conservatively; never merge distinct seasons, episodes, versions or editions blindly.
- Keep embedded audio tracks, separate dubbed versions, embedded/external subtitles, and unverified provider claims distinct.
- Only report a track as selectable if the actual prepared media exposes it.
- A catalogue hit is not a playable source; a resolved URL is not proof playback starts.
- A title may offer a clearly labelled official destination when no in-app source exists.
- One provider failure must not suppress results from others.
- Each third-party integration must pass licence/terms, source eligibility, privacy/security, region, reliability and playback verification before being enabled.

## Current status

| Workstream | Status |
|---|---|
| Product vision and requirements | Documented |
| Architecture and source/language models | Documented as proposed design |
| Candidate repository audit | Initial code-level pass completed; full per-repo review remains |
| Provider/source eligibility | Not yet cleared; candidate documentation is not approval |
| Framework/base choice | Fresh Kotlin/Compose + Media3 has a compiling Android slice; final architecture remains provisional pending physical-device playback and a time-boxed Capacitor comparison |
| JavaScript universal-search reference | Implemented under prototype/aggregation-core; GitHub Actions passed on main commit dcd413a7816218b08fdfebc2ee3e32b56c6c1156 |
| Kotlin/JVM aggregation + provider fan-out | Implemented under prototype/kotlin-aggregation-core, including identity grouping, provenance, bounded concurrency, progressive snapshots, eligibility gating and timeout/error isolation; both CI jobs passed before merge commit 7b63e1c9e79997bc02dded55a5e779554f8f31bb |
| Cross-provider title deduplication | Prototype tested with synthetic fixtures; production matching policy and wider evaluation remain open |
| Language/source aggregation | Kotlin/JVM prototype preserves per-source claims and requires player-observed evidence for selectable tracks; UI can show claims without treating them as verified audio |
| Android UI/player shell | Compose search/source-selection screen and Media3 player probe implemented; CI builds a debug APK. Source resolution and physical-device checks remain open |
| Playback integration and fallback | Player controls, error reporting and actual-track inspection/selection are implemented in the probe; no real media playback on device or source resolver has been verified |
| Prototype tests / CI | Shared identity fixtures pass in the JavaScript and Kotlin/JVM suites; Android debug APK build and artifact upload passed in GitHub Actions run [40670343817](https://github.com/RahulExe69/7xCinema/actions/runs/40670343817). Device playback remains unverified |

## Next milestone

The JavaScript reference core and Kotlin/JVM aggregation/fan-out slice are now implemented and CI-tested using synthetic providers. The Kotlin module is described in [its README](../prototype/kotlin-aggregation-core/README.md); the JavaScript reference is in [the prototype README](../prototype/aggregation-core/README.md). Direct inspection of NuvioMobile's `SearchRepository.kt` confirms concurrent addon/server requests and progressive section updates, while the Android player source confirms Media3 ExoPlayer with libmpv fallback. The important mismatch is that its search results remain grouped by catalogue/server section rather than becoming 7xCinema's single canonical-title result list. See the new [Android feasibility gate](ANDROID_FEASIBILITY_GATE.md).

The next milestone is physical-device verification of the new Android slice. The following are implemented and CI-checked: the Compose UI calls the Kotlin aggregation core; three synthetic adapters produce one grouped title with separate source choices and language claims; source selection opens a real Media3 player screen; the player exposes audio/subtitle tracks and selection controls after media is prepared; and a clean CI checkout produces a debug APK. See [the Android slice README](../android-app/README.md).

Still open: install the APK on a physical Android device; test it with an authorised media URL; verify track switching, buffering/error/lifecycle behaviour; test the UI on a small screen; compare with a small Capacitor/native-player approach; and implement one real provider only after its rights, terms, and reliability checks pass. The current catalogue results remain synthetic and source URLs are not resolved from provider results.


## Subtitle coverage research

Subtitle availability is being treated as a separate capability from dubbed audio and in-app playback. The current OpenSubtitles.com REST API is the primary subtitle API candidate to evaluate; the legacy OpenSubtitles.org XML-RPC API received a shutdown/migration notice in January 2026, so we should not inherit old integrations. Wyzie Subs is an alternate key-based API whose current terms and quota must be reviewed before adoption.

Neither subtitle API provides movie audio dubs. Every subtitle needs a title/episode/version match and format/encoding validation. See [Multilingual model](MULTILINGUAL.md), [Provider matrix](PROVIDER_MATRIX.md), and [Research register](RESEARCH_REGISTER.md) for evidence and constraints.
