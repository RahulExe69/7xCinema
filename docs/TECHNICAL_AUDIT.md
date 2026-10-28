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
- Compare Rahul's fork against its upstream commit and identify local divergence.
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
