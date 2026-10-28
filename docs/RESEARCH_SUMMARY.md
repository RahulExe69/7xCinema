# 7xCinema Research Summary

**Reviewed:** 2026-10-28  
**Status:** Research/prototype stage. JavaScript reference and Kotlin/JVM aggregation/fan-out prototypes are implemented and CI-tested; no Android UI or real third-party playback provider has been approved.

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
| Framework/base choice | Provisional preference: fresh Kotlin/Compose + Media3 for a small Android-first spike; final selection remains open until a Capacitor comparison and device proof |
| JavaScript universal-search reference | Implemented under prototype/aggregation-core; GitHub Actions passed on main commit dcd413a7816218b08fdfebc2ee3e32b56c6c1156 |\n| Kotlin/JVM aggregation + provider fan-out | Implemented under prototype/kotlin-aggregation-core, including identity grouping, provenance, bounded concurrency, progressive snapshots, eligibility gating and timeout/error isolation; both CI jobs passed before merge commit 7b63e1c9e79997bc02dded55a5e779554f8f31bb |
| Cross-provider title deduplication | Prototype tested with synthetic fixtures; production matching policy and wider evaluation remain open |
| Language/source aggregation | Prototype preserves per-source claims and separates provider-reported audio from player-observed tracks; player integration remains open |
| Playback integration and fallback | Not started |
| Prototype tests / CI | JavaScript and Kotlin/JVM suites pass in GitHub Actions. The identity-conflict fix merged as ceac6430c9ba32173a7afffd4808741380dc0a63; Kotlin fan-out merged as 7b63e1c9e79997bc02dded55a5e779554f8f31bb. Android app build/device playback is not established |

## Next milestone

The JavaScript reference core and Kotlin/JVM aggregation/fan-out slice are now implemented and CI-tested using synthetic providers. The Kotlin module is described in [its README](../prototype/kotlin-aggregation-core/README.md); the JavaScript reference is in [the prototype README](../prototype/aggregation-core/README.md). Direct inspection of NuvioMobile's `SearchRepository.kt` confirms concurrent addon/server requests and progressive section updates, while the Android player source confirms Media3 ExoPlayer with libmpv fallback. The important mismatch is that its search results remain grouped by catalogue/server section rather than becoming 7xCinema's single canonical-title result list. See the new [Android feasibility gate](ANDROID_FEASIBILITY_GATE.md).

The provisional next step is a tiny fresh Kotlin/Compose + Media3 vertical slice, with a short React/Capacitor + native-player comparison before committing to a final stack:
1. create shared JSON fixtures consumed by both the JavaScript and Kotlin tests so their grouping/provenance behaviour cannot drift;
2. show one globally grouped title with multiple source options and per-source language claims;
3. play an owned or otherwise authorised test asset, and list the tracks exposed by the prepared player;
4. make source selection visibly transition through loading, playback, and error states;
5. force a provider failure/timeout and prove other sources remain usable;
6. build a debug APK reproducibly from a clean checkout.

The prototype still has **no live provider adapter, Android UI, or end-to-end playback validation**. The native spike is a provisional engineering direction, not an already-working app or a final architecture decision.


## Subtitle coverage research

Subtitle availability is being treated as a separate capability from dubbed audio and in-app playback. The current OpenSubtitles.com REST API is the primary subtitle API candidate to evaluate; the legacy OpenSubtitles.org XML-RPC API received a shutdown/migration notice in January 2026, so we should not inherit old integrations. Wyzie Subs is an alternate key-based API whose current terms and quota must be reviewed before adoption.

Neither subtitle API provides movie audio dubs. Every subtitle needs a title/episode/version match and format/encoding validation. See [Multilingual model](MULTILINGUAL.md), [Provider matrix](PROVIDER_MATRIX.md), and [Research register](RESEARCH_REGISTER.md) for evidence and constraints.
