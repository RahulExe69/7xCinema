# 7xCinema Research Summary

**Reviewed:** 2026-10-28  
**Status:** Planning/research stage. No application implementation or real third-party playback provider has been approved.

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

### 3. NuvioMobile is the strongest existing app-base candidate to test
It already has a Kotlin/Compose app, addon registry, parallel searches across enabled addon catalogues and user-configured server libraries, capability checks, and Android Media3/ExoPlayer with optional MPV. Its tests distinguish catalogue metadata from playback capability.

Its gap: search results are emitted as separate catalogue sections, not globally merged into one canonical title card. Its setup is “bring your own sources” rather than an internally curated and automatically coordinated set. It declares GPL-3.0, so reuse requires an explicit distribution/licence decision.

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
| Framework/base choice | Open; must be decided by proof of concept |
| Universal search implementation | Not started |
| Cross-provider title deduplication | Not started |
| Language/source aggregation implementation | Not started |
| Playback integration and fallback | Not started |
| Tests/CI/release workflow | Not established in 7xCinema repo |

## Next milestone

Run the same minimal feasibility test against the shortlisted base approaches:
1. two fake catalogue providers return overlapping and distinct titles;
2. show partial results while one source is delayed or fails;
3. merge the same title into one group while preserving each source;
4. distinguish a real audio track from a separate dubbed version;
5. play a licensed test asset and discover its actual tracks;
6. trigger a player-start failure and verify recovery;
7. compare build effort, source-model fit, licence obligations and maintainability.

Only after this gate should the repository move from planning into the first application implementation. Keep the exact decision and evidence in the decision log.
