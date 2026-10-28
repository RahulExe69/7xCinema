# 7xCinema — Initial Technical Audit

**Audit date:** 2026-10-28  
**Status:** Initial public-source review; no candidate has been approved as an integration.

This audit records what was actually inspected, what that evidence means for 7xCinema, and what still needs runtime or legal verification. README claims and repository metadata are useful leads, not proof that a provider currently works or that content access is authorised.

## Executive findings

1. **MovieBox-TUI is a useful source of provider/domain knowledge, not an Android app base to drop into 7xCinema unchanged.** It has a Rust library target and documented Android/Termux support, but its product remains a terminal UI that launches external media players. Its service's normal search method takes a single provider.
2. **7xCinema needs a new cross-provider orchestration layer.** The inspected TUI search flow calls search_typed(context.provider, ...); the native provider dispatcher matches one ProviderKind at a time. This does not provide the universal search experience we want across independent integrations.
3. **The existing audio/dub model is not enough for 7xCinema's language contract.** MovieBox-TUI has an AudioTrackOption with a subject ID, language, and label, and a MediaDetails.dubs collection. That represents source/dub metadata; it does not prove the resolved media file exposes an embedded, selectable audio track. 7xCinema's separate embedded-track and separate-dub-version model is necessary.
4. **FlixQuest is useful for studying mobile UI and player architecture, but not a blind fork recommendation.** It is Flutter, declares GPL-3.0, uses a customised player package, and documents a separate scraper API. The current dependency configuration references a sibling player project by path, with a Git alternative documented.
5. **TMDB-Embed-API should remain an architecture-only reference for now.** Its README lists a number of third-party streaming/scraping integrations, but provider permission, reliability, security, and end-user content rights are not established by that list.
6. **Stremio's addon protocol is a promising optional interoperability boundary.** It separates manifest, catalogue, metadata, streams, and subtitles. Each addon still needs an independent eligibility and reliability review.
7. **Media3/ExoPlayer can support actual track selection when tracks are present in a compatible media item.** It cannot turn a separate dubbed file from another provider into an embedded audio track.

## 1. MovieBox-TUI (mesamirh/MovieBox-Tui and Rahul's fork)

### Evidence inspected
- [Upstream README](https://github.com/mesamirh/MovieBox-Tui/blob/main/README.md)
- [Provider contract](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/mod.rs)
- [Provider models](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/models.rs)
- [Service dispatcher](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/service.rs)
- [Cargo manifest](https://github.com/mesamirh/MovieBox-Tui/blob/main/Cargo.toml)
- [Android/Termux installation notes](https://github.com/mesamirh/MovieBox-Tui/blob/main/docs/installation.md)
- [Release history](https://github.com/mesamirh/MovieBox-Tui/releases)

### Observed structure
- Cargo defines a package named moviebox-tui, a library target named moviebox_tui, and a binary-oriented terminal product.
- src/lib.rs exports provider, service, cache, networking, player, and TUI modules together.
- The shared Provider trait exposes provider identity/capabilities, search, and details. A separate ReleaseProvider trait exposes episode stream resolution.
- Provider capability declarations include search, pagination, series, subtitles, and homepage support.
- MovieBoxService::search_typed takes a ProviderKind and dispatches to the selected provider. The TUI search flow supplies context.provider.
- Provider documentation lists MovieBox, 4KHDHub, Dramachi, two BDIX-oriented sources, and configured Stremio addons.
- The README describes Android installation through Termux and playback through an external Android media player.
- The Cargo manifest and README declare MIT OR Apache-2.0. Confirm the exact licence files and retain required notices before reusing code.

### What it means for 7xCinema
- Reuse or adapt stable domain concepts and the provider contract only after reviewing code, licence notices, current provider behaviour, and access permissions.
- Do not treat the library target or Android build target as evidence that the repository can be embedded directly into a polished APK.
- The all-provider search coordinator should be a new layer that invokes all eligible providers concurrently, isolates failures, emits partial results, normalises records, and preserves source provenance.
- The existing library exports TUI modules and its dependencies include terminal-oriented crates. A clean provider-core extraction or a small workspace/core crate may be more maintainable than depending on the entire terminal application. This requires a build spike; it is not yet an implementation decision.
- Existing data structures are useful reference material, but 7xCinema needs its own canonical identity, provenance, language-evidence, and playback-capability models.

### Remaining verification
- [x] Compare Rahul's main branch against upstream main using GitHub's compare endpoint: identical at commit 7b47958867f992fda91ed5315375c6137b1d2ebf (0 ahead, 0 behind, 0 changed files). Recheck this before future reuse if either branch moves.
- Run the project tests and inspect provider implementation/test files.
- Verify Android ARM64 build behaviour in a controlled environment.
- Check current provider response and playback success under the intended network/region, but only for integrations that pass source-eligibility review.
- Confirm which pieces can be reused and what notices/attribution need to accompany them.

## 2. FlixQuest

### Evidence inspected
- [Repository](https://github.com/flixquest/flixquest)
- [Current pubspec](https://github.com/flixquest/flixquest/blob/main/pubspec.yaml)
- [README and build instructions](https://github.com/flixquest/flixquest/blob/main/README.md)
- [Provider modules](https://github.com/flixquest/flixquest/tree/main/lib/video_providers)
- [Player architecture notes](https://github.com/flixquest/flixquest/blob/main/docs/shield_video_playback.md)

### Observed structure
- Flutter/Dart Android project with catalogue and provider-related modules.
- The README describes a separate Scraper API v2 and a direct fallback provider; the client repository is not, by itself, a complete self-contained provider system.
- Its player uses a customised better_player_plus package. The current pubspec.yaml refers to ../flixquest-betterplayer; the README also documents cloning that sibling repository or using a Git dependency.
- The repository declares GPL-3.0. Review the full licence and dependency licences before reusing or distributing modified code.
- Repository metadata showed activity in October 2026; this is a maintenance signal, not proof that all features or providers work.

### 7xCinema implication
Use it to study mobile catalogue UX, source-selection UI, player states, and subtitle interaction. Do not fork it by default: it adds framework commitment, copyleft obligations, a custom player dependency, Firebase/remote-service decisions, and a separately maintained provider API. A clean build and source-eligibility review would be needed before any stronger recommendation.

## 3. CloudStream

### Evidence inspected
- [Repository](https://github.com/recloudstream/cloudstream)
- [README](https://github.com/recloudstream/cloudstream/blob/master/README.md)

### Observed structure
- Native Android/Kotlin media-centre application with an extension-oriented model.
- Its README explains that extension integrations supply source functionality rather than all sources being bundled as a single inseparable catalogue.
- The repository declares GPL-3.0 and is active. Its size and extension ecosystem make it a reference for boundaries and lifecycle design, not an assumed 7xCinema base.

### 7xCinema implication
Study the separation of app and integrations. Keep extensions/providers declarative, versioned, capability-limited, and independently tested. Do not copy code without reviewing GPL implications and each integration's permissions and security posture.

## 4. TMDB-Embed-API

### Evidence inspected
- [Repository README](https://github.com/Inside4ndroid/TMDB-Embed-API)
- [Package manifest](https://github.com/Inside4ndroid/TMDB-Embed-API/blob/main/package.json)
- [Repository security page](https://github.com/Inside4ndroid/TMDB-Embed-API/security)

### Observed structure and concerns
- Node.js service that describes a TMDB-ID-in/streams-out interface, a provider registry, normalised source results, per-provider controls, and an administrative configuration UI.
- Repository declares MIT in its README. That licence applies to the code as licensed by its owners; it does not grant rights to every third-party service or stream returned by the code.
- The README lists numerous third-party streaming/scraping integrations. Their current functionality, terms, authorisation, and media rights were not independently established in this audit.
- The GitHub security page states that the repository has not configured a security policy. The README documents generated default admin credentials that must be changed. This is not enough to establish production security.

### 7xCinema implication
Use only as a high-level example of adapter registration, result normalisation, and operator controls. Do not adopt its stream-resolver integrations or expose the API publicly unless each source, access method, rights basis, dependency, authentication path, and network boundary has passed review. Avoid a public arbitrary-URL proxy. The first aggregation prototype should use fake providers and/or explicitly approved sources.

## 5. Stremio Addon SDK

### Evidence inspected
- [Official SDK](https://github.com/Stremio/stremio-addon-sdk)
- [Official resource documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/README.md)

### Observed contract
The documented resource types separate an addon's manifest, catalogue, metadata, streams, and subtitles. This is useful for building an optional protocol adapter instead of requiring every integration to adopt a proprietary 7xCinema interface.

### 7xCinema implication
A Stremio-compatible adapter is a candidate, not an automatic source list. Any configured addon must be checked for eligibility, privacy, supported types/IDs, timeout limits, URL safety, and rights. The protocol standardises response shapes; it does not guarantee source availability, language correctness, or permission to stream.

## 6. Metadata and media playback references

### TMDB
- [Official API FAQ](https://developer.themoviedb.org/docs/faq)
- TMDB is a candidate for catalogue metadata/artwork and potentially regional watch-availability metadata, not a video-stream provider.
- Its FAQ states that developer API use is free for non-commercial purposes with attribution and specifies logo/notice requirements. Commercial use requires contacting TMDB about licensing.
- Before adoption, determine whether 7xCinema's intended usage is non-commercial under TMDB's definition, add required attribution, review current terms and rate limits, and keep the metadata-provider adapter replaceable.

### Android Media3 / ExoPlayer
- [Supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats)
- [HLS support](https://developer.android.com/media/media3/exoplayer/hls)
- [Track selection](https://developer.android.com/media/media3/exoplayer/track-selection)
- Media3 supports track selection and preferred language settings for media items that expose supported tracks. HLS/DASH support is conditional on containers, codecs, and stream construction. A source's page label is not proof of the tracks available after preparing the media item.
- Player research should verify actual track discovery, preferred-language behaviour, subtitles, startup errors, and Android lifecycle behaviour on test media.

## 7. Preliminary decision

The best next step is not to fork a large application. It is to keep 7xCinema independent, implement the provider aggregation domain around a stable interface, use MovieBox-TUI as a reference for provider concepts, compare a modern mobile UI path, and prove one eligible search-to-playback path before scaling integrations.

See [Framework Comparison](FRAMEWORK_COMPARISON.md) and [Decision Log](DECISIONS.md). The stack remains provisional until the technical spike passes.


## 8. Second-pass findings: closer fits for source aggregation

### Lumora — strong aggregation reference, not a rebrand base
Reviewed repository metadata, README, LICENSE and source-level snippets in Channel.kt and ContentGrouping.kt. Lumora describes combining multiple user-configured source types into a shared catalogue, a Find & Play flow, and grouping duplicate content. A source-model comment explicitly warns that source-specific details and playback URLs cannot be determined from one global provider field when multiple providers coexist. The grouping utility demonstrates explicit title normalisation and source/quality-tag handling.

The current licence is PolyForm Noncommercial 1.0.0 and the README expressly rejects rebranding/reskinning. The README says versions through v4.4 carried MIT but that later change is not retroactive. The repository description says “parked”. For 7xCinema, use the architectural lesson—source provenance and cautious grouping—not the project as a base. Do not rebrand it.

References: [Lumora README](https://github.com/LumoraPlayer/Lumora), [ContentGrouping.kt](https://github.com/LumoraPlayer/Lumora/blob/main/app/src/main/java/com/lumora/util/ContentGrouping.kt), [Channel.kt](https://github.com/LumoraPlayer/Lumora/blob/main/app/src/main/java/com/lumora/model/Channel.kt), [LICENSE](https://github.com/LumoraPlayer/Lumora/blob/main/LICENSE).

### Nuvio Mobile — native player/addon architecture reference
Reviewed [NuvioMobile](https://github.com/NuvioMedia/NuvioMobile), its public README, player source, and PlaybackAvailabilityTest.kt. It declares GPL-3.0 and follows a “bring your own sources” model. Tests demonstrate a critical capability rule: catalog/metadata-only addons do not establish playback availability, whereas a compatible stream addon can; requested media type and ID namespace/prefix are checked. Its Android player integrates Media3/ExoPlayer and optional MPV.

This is strong evidence for typed capabilities and executable contract tests. The source-management model differs from 7xCinema: our target is internally coordinated providers with low user setup. Treat as a design reference unless GPL and dependency obligations are deliberately accepted.

References: [NuvioMobile](https://github.com/NuvioMedia/NuvioMobile), [PlaybackAvailabilityTest.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonTest/kotlin/com/nuvio/app/features/streams/PlaybackAvailabilityTest.kt), [PlayerEngine.android.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/androidMain/kotlin/com/nuvio/app/features/player/PlayerEngine.android.kt).

### Nuvio TV
[NuvioTV](https://github.com/NuvioMedia/NuvioTV) is a native Kotlin/Compose Android TV app with Media3 and a GPL-3.0 licence. It is an optional TV-navigation/addon-management reference, not necessary to start mobile.

### Community Stremio Android
[stremio-native/stremio-android](https://github.com/stremio-native/stremio-android) describes a community Kotlin/Compose app using Stremio core/addons, ExoPlayer/MPV and a Rust local component. GitHub metadata did not identify a licence and last reported code push was 2026-07-23. Do not reuse code until the actual licence, dependencies/submodules and maintenance are reviewed.

### Official Sources
[user-griffin/official-sources](https://github.com/user-griffin/official-sources) is an MIT-licensed Stremio-compatible addon whose README says it returns official subscription/free/rental/purchase destinations and links out to official apps/pages; it deliberately does not play, proxy, decrypt, scrape, download or redistribute video. This suggests a useful separate 7xCinema official-availability layer. It can improve “where can I watch?” coverage without claiming the app can play that provider's video. Watchmode terms, attribution, caching, quota and API plan details still need review. Metadata showed the last push on 2026-08-03.

### SHS-Player
[SHS-Player](https://github.com/SHSLabs/SHS-Player) declares MIT and is a native Kotlin/Compose player with Media3/LibVLC and subtitle/local-media/IPTV features. It is a player reference, not a catalogue aggregator; maintenance and dependency suitability need review.

## 9. Audit implications

1. Each source record needs an explicit provider identity; do not use a global “current provider” for an aggregated title.
2. Coverage must be split into catalogue discovery, verified in-app playback, and official external destinations.
3. A catalogue-only integration must never enable Watch by itself. Addon/provider capabilities require tests.
4. Native Kotlin/Compose is now a serious alternative to Capacitor; compare a narrow proof of concept before finalising the framework.

See [Provider System](PROVIDER_SYSTEM.md), [Coverage Model](COVERAGE_MODEL.md), and [Framework Comparison](FRAMEWORK_COMPARISON.md).


## 10. Fork comparison result — 2026-10-28

GitHub's compare endpoint reports the current main branches of mesamirh/MovieBox-Tui and RahulExe69/Moviebox-Tui as **identical**, both at commit 7b47958867f992fda91ed5315375c6137b1d2ebf, with 0 ahead commits, 0 behind commits, and 0 changed files. A sampled blob check independently found identical content hashes for Cargo.toml, src/lib.rs, src/providers/mod.rs, src/providers/models.rs, src/service.rs, src/tui/app/search.rs, and docs/providers.md.

This means the renamed fork currently adds no detected differences to those core paths; it remains a clean upstream snapshot, not a custom universal-search implementation. Recheck the comparison before importing code later because branches can move independently.

Reference: [upstream-to-fork compare](https://github.com/mesamirh/MovieBox-Tui/compare/main...RahulExe69:main).


## 11. Addon aggregation and dub-model findings

### An aggregator already exists inside the addon provider, but only at addon scope
Reviewed [src/providers/addons/aggregator.rs](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/addons/aggregator.rs). It fans stream requests out to configured addons with a five-second per-addon timeout, gathers results, deduplicates entries with the same direct URL, sorts by quality, and returns a list of blocked addons separately.

That is a useful pattern for bounded concurrency, independent addon failures, duplicate stream handling and source ranking. It is not the universal catalogue search 7xCinema wants: the normal native-provider search path still calls one selected ProviderKind at a time. It also deduplicates matching direct URLs, which is not sufficient for grouping same-title catalogue rows across different native providers.

### The MovieBox dub records represent alternate source subjects
Reviewed [src/providers/moviebox/adapt.rs](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/moviebox/adapt.rs) and [src/providers/models.rs](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/models.rs). The adapter maps provider dubs into AudioTrackOption records containing a subject ID, language and label. MediaDetails.sibling_ids includes those alternate subject IDs. That suggests these are provider-level alternate title/source subjects, not proof that the current media file contains selectable audio tracks. 7xCinema must keep this representation separate from track metadata read from the actual player.

### Existing test patterns worth carrying forward
The existing test suite includes:
- search failure versus empty result distinction;
- provider/query-specific cache-key isolation;
- stale detail response protection;
- URL scheme rejection in playback handling;
- stream-resolution failure cleanup and user notification;
- addon manifest/capability checks;
- deduplication/sorting of addon streams.

These are valuable test categories to reproduce in the new universal-search engine. They do not establish that all current providers are stable or authorised.

References: [addon aggregator](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/addons/aggregator.rs), [content pipeline tests](https://github.com/mesamirh/MovieBox-Tui/blob/main/tests/content_pipeline.rs), [error handling tests](https://github.com/mesamirh/MovieBox-Tui/blob/main/tests/error_handling.rs), [addon manifest tests](https://github.com/mesamirh/MovieBox-Tui/blob/main/tests/addons_manifest.rs).


## 12. AIOStreams — direct aggregation-pattern reference

Reviewed [Viren070/AIOStreams](https://github.com/Viren070/AIOStreams), its README, and GitHub repository metadata. It is an actively updated TypeScript/Stremio aggregator licensed AGPL-3.0. Its documented pipeline fetches configured addon results and deduplicates, filters, sorts and formats them into a unified list.

This is among the closest architectural references to the orchestration pattern 7xCinema needs. It is still not the full 7xCinema solution: it operates as a Stremio addon aggregation layer, does not itself supply every stream, and cannot establish rights or reliability for its upstream addons. Its ecosystem includes torrent/debrid/Usenet integrations and its README documents proxy options; do not blindly adopt its bundled sources or mechanisms that bypass provider restrictions. AGPL obligations also require a deliberate licence decision before copying or adapting code.

Use it to compare pipeline stages, addon capabilities, filtering/sorting configuration and deduplication tests. The 7xCinema core should define its own source eligibility rules, provenance model, safe networking boundaries, and distinct discovery/playback/official-destination coverage.

References: [README](https://github.com/Viren070/AIOStreams), [LICENSE](https://github.com/Viren070/AIOStreams/blob/main/LICENSE).


## 13. TMDB versus Watchmode for official-availability discovery

TMDB's official [movie Watch Providers endpoint](https://developer.themoviedb.org/reference/movie-watch-providers) and [TV Watch Providers endpoint](https://developer.themoviedb.org/reference/tv-series-watch-providers) return per-country streaming/rental/purchase availability. The documentation says the data is powered by a JustWatch partnership, does not provide full deep links, and requires JustWatch attribution. TMDB's own API also has distinct attribution/logo and use terms. A 7xCinema implementation must satisfy both sets of requirements and confirm India/region coverage.

Watchmode's current [public pricing page](https://api.watchmode.com/pricing) lists a free Developer plan with 2,500 monthly credits, non-commercial use with attribution, up to three selected countries and no app/episode deep links. It currently lists Startup at USD $349/month and Business at USD $599/month; all pricing/features are subject to change. Watchmode returns availability and links, not video streams.

**Practical recommendation:** compare the TMDB Watch Providers endpoint first for a modest non-commercial prototype, then compare Watchmode if it offers meaningful coverage/link advantages. Neither should be a core video provider; both belong to the optional official-destination/availability layer. Confirm terms, country list, freshness, credits, caching and attribution before any shipped integration.

Sources: [TMDB FAQ](https://developer.themoviedb.org/docs/faq), [TMDB movie watch providers](https://developer.themoviedb.org/reference/movie-watch-providers), [TMDB TV watch providers](https://developer.themoviedb.org/reference/tv-series-watch-providers), [Watchmode pricing](https://api.watchmode.com/pricing).
