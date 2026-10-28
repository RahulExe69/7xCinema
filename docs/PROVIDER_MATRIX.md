# 7xCinema Provider and Data-Source Matrix

**Last reviewed:** 2026-10-28  
**Status:** Research baseline only. Nothing in this matrix is automatically approved for production.

A provider being named in an upstream repository is evidence that the repository has code/documentation for it—not evidence that the source is stable, authorised, or currently playable. The matrix is split by function so metadata, in-app playback, and official destination links are never confused.

## 1. Candidate source matrix

| Candidate | Intended role | Evidence observed | Current decision | Required gate |
|---|---|---|---|---|
| TMDB API | Catalogue metadata, artwork, title IDs, recommendations, plus per-country Watch Providers availability | Official metadata endpoints; Watch Providers endpoint is powered by JustWatch and returns availability information rather than playable streams or full deep links | Candidate for metadata and a possible official-availability layer, not playback | Satisfy both TMDB and JustWatch attribution, check current terms/rate limits/caching and India coverage; confirm the intended use is eligible |
| Watchmode API | Availability by country; official service links/deeplinks; title/episode availability | Official API says it returns metadata and availability links, not video. Current page lists Developer plan at 2,500 credits/month, non-commercial with attribution, up to 3 countries and no app/episode deep links; paid Startup/Business pricing currently begins at USD $349/month | Optional official-availability layer | Verify supported country list includes India for chosen plan; confirm free-plan link limitations, API credits, attribution, cache and terms before deployment |
| Official Sources addon | Official service destination offers and external hand-off | README says it returns official streaming/rental/purchase destinations, not streams; MIT code licence; Watchmode dependency | Design reference / possible external destination adapter | Re-check maintenance, Watchmode terms/plan, link validation and region accuracy |
| User-owned Jellyfin/Plex server | Personal-library catalogue and playback | Documented by projects such as Lumora; supported server protocols can expose the user's own media | Future optional integration | Review API/licence terms, auth, secure token storage, TLS, user consent and remote-server safety |
| Stremio Addon SDK | Interoperability protocol for catalogue, metadata, streams and subtitles | Official SDK documents manifest, catalogue, metadata, streams and subtitle resources | Candidate adapter type, not a content provider itself | Evaluate each addon independently for source rights, data safety, supported IDs/types, privacy, reliability and rate limits |
| MovieBox-TUI built-in MovieBox adapter | Provider-specific catalogue/detail/resolution reference | Upstream and fork expose the provider trait and service dispatcher; current UI dispatches search by selected provider | Code/domain research only; no production approval | Audit exact source, provider terms/access, security, rights and repeatable search/resolution/playback behaviour |
| MovieBox-TUI 4KHDHub adapter | Provider-specific catalogue/source reference | Named in upstream docs and provider enum | Code/domain research only; no production approval | Same source-eligibility and test gate |
| MovieBox-TUI Dramachi adapter | Asian drama catalogue/source reference | Named in upstream docs and provider enum | Code/domain research only; no production approval | Same source-eligibility and test gate |
| MovieBox-TUI CircleFTP / DhakaFlix adapters | BDIX-oriented sources | Named in upstream docs; network dependency documented | Code/domain research only; likely network/region dependent | Confirm reachability from target user networks, access terms, source authority and reliability |
| Other community Stremio addons | Additional catalogue/stream/subtitle options | Protocol supports compatible resource responses; actual add-ons differ | Not automatically enabled | Review each addon URL, ownership, data it returns, terms, security, reliability, region and capabilities |
| iptv-org/iptv channel list | Possible separate live-TV catalogue | Public repository of channel playlists | Deferred; not part of movie/series MVP | Validate each channel/source authority, terms, region, stream availability and category; listing is not proof of redistribution rights |
| FlixQuest Scraper API | Architecture reference for a separate multi-provider API | FlixQuest README describes an external Scraper API and provider status; implementation is not fully inside its client repository | Reference only; no adoption decision | Inspect API implementation if accessible, licence, terms, safety boundaries and actual provider behaviour |
| AIOStreams | Stremio addon aggregation reference | Active TypeScript project; README documents fan-out, deduplication, filtering, sorting and formatting; AGPL-3.0 | High-value architecture reference only; no bundled provider automatically approved | Review AGPL implications and security; assess every upstream addon separately; do not adopt restriction-evasion proxy paths |
| TMDB-Embed-API | Aggregation architecture reference | Public Node.js project demonstrates provider registry/result aggregation; README lists many source integrations | Reference only; do not blindly use its stream adapters | Review code, security, dependency and rights boundary for every individual integration |
| Consumet API / consumet.ts | Legacy multi-provider entertainment data/link API reference | README says it scrapes websites; GitHub last code push reported as 2022-07-20; MIT code licence | Low-priority architecture reference only; no source is approved | Verify maintenance, dependencies, upstream site terms/rights and actual source behaviour individually |

References:
- [TMDB developer FAQ](https://developer.themoviedb.org/docs/faq)
- [TMDB movie watch providers](https://developer.themoviedb.org/reference/movie-watch-providers)
- [TMDB TV watch providers](https://developer.themoviedb.org/reference/tv-series-watch-providers)
- [Watchmode API and plan details](https://api.watchmode.com/)
- [Watchmode pricing](https://api.watchmode.com/pricing)
- [Official Sources](https://github.com/user-griffin/official-sources)
- [Stremio Addon SDK resource protocol](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/README.md)
- [MovieBox-TUI provider guide](https://github.com/mesamirh/MovieBox-Tui/blob/main/docs/providers.md)
- [FlixQuest](https://github.com/flixquest/flixquest)
- [AIOStreams](https://github.com/Viren070/AIOStreams)
- [Consumet API](https://github.com/prince-ao/consumet-api)
- [Consumet TypeScript library](https://github.com/prince-ao/consumet.ts)
- [TMDB-Embed-API](https://github.com/Inside4ndroid/TMDB-Embed-API)
- [iptv-org/iptv](https://github.com/iptv-org/iptv)

## 2. Declared capabilities in the existing MovieBox-TUI code

These values are read from provider source code on 2026-10-28. They are declarations, not live verification.

| Adapter | Search | Pagination | Series | Subtitles | Homepage |
|---|---|---|---|---|---|
| MovieBox | Yes | Yes | Yes | Yes | Yes |
| 4KHDHub | Yes | No | Yes | Yes | No |
| Dramachi | Yes | Yes | Yes | No | No |
| CircleFTP | Yes | No | Yes | No | No |
| DhakaFlix | Yes | No | Yes | No | No |
| Stremio Addons | Yes | No | Yes | Yes | No |

These flags do not advertise audio-track discovery, separate dubbed versions, actual stream-resolution success, playback format compatibility, official destinations, or rights eligibility. 7xCinema needs a richer contract with evidence and verification status. Sources: [MovieBox](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/moviebox/mod.rs), [4KHDHub](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/fourkhdhub/mod.rs), [Dramachi](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/dramachi/mod.rs), [CircleFTP](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/bdix/circleftp/mod.rs), [DhakaFlix](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/bdix/dhakaflix/mod.rs), [Addons](https://github.com/mesamirh/MovieBox-Tui/blob/main/src/providers/addons/mod.rs).

## 3. Candidate scoring rules

Do not assign scores just because a README advertises a feature. Score a provider only after collecting evidence. Use “Unknown” when not measured.

| Dimension | What constitutes evidence |
|---|---|
| Discovery coverage | Curated title/episode sample, measured hit rate, region and date |
| Search reliability | Repeated requests with success/timeout/error breakdown |
| Detail coverage | Correct metadata, IDs, season/episode completeness |
| Resolution reliability | A permitted candidate resolves for a repeatable test asset |
| Playback reliability | Test asset starts in the intended player; format/track details recorded |
| Language accuracy | Evidence separates embedded tracks, dubbed versions and subtitles; sample checked |
| Source legitimacy | Ownership, access method, terms/rights basis and region constraints reviewed |
| Security | URL/redirect validation, no unrestricted proxy, secret redaction, bounded response sizes |
| Maintenance | Code activity, issue handling, release history, test coverage, ownership |
| Integration cost | Dependencies, runtime/language, Android packaging, licensing and operations |

## 4. Provider status vocabulary

- **Discovered:** candidate identified; no functionality implied.
- **Code-inspected:** source and documented interface reviewed.
- **Eligibility-reviewed:** terms/access/rights and security gate reviewed.
- **Search-verified:** dated test confirms expected structured catalogue results.
- **Resolve-verified:** a source candidate resolves with the intended supported flow.
- **Playback-verified:** an authorised test asset starts in the target player; environment and date recorded.
- **Stable:** sufficient repeated verification, test coverage and maintenance process.
- **Degraded/disabled/retired:** status reflects observed failures or changed eligibility.

One label cannot substitute for another. Search verification does not imply playback verification.

## 5. Immediate priorities

1. Keep fake/test providers as the first aggregation-engine test target.
2. Inspect the local fork's divergence from upstream before choosing any code to reuse.
3. Run the native Kotlin/Compose + Media3 versus React/Capacitor + native-player thin-slice comparison.
4. Treat TMDB and Watchmode as separate replaceable metadata/availability adapters; make neither a playback backend.
5. Do not enable MovieBox-TUI source adapters, Consumet site adapters, unknown community addons, or any scraped resolver merely because it appears in candidate code. Each must pass the eligibility and evidence gates.
6. Study AIOStreams' aggregation pipeline alongside the TUI addon aggregator; neither a protocol aggregator nor its upstream addons replace per-source eligibility review.
7. Keep user-owned server integrations and official destination links as possible coverage layers, distinct from general third-party playable-source coverage.


## Subtitle-specific integration candidates

| Candidate | Role | Current evidence | Decision | Gate |
|---|---|---|---|---|
| OpenSubtitles.com REST API | External subtitle search/download | Official REST docs accept external IDs, file hash or query; API key required. Old OpenSubtitles.org XML-RPC API received a 2026 shutdown/migration notice | Primary candidate to evaluate | Use current .com REST API only; review current terms/quota/download rules, key handling, rate-limit headers, file/version matching and redistribution |
| Wyzie Subs API | External subtitle aggregation/search | Current docs require API key and advertise free/paid plans. Terms dated 2026-09-24 prohibit facilitating piracy/copyright infringement and circumvention of technical controls | Alternate candidate; no approval yet | Confirm intended use fits terms; review quotas, current provider coverage, key handling, source/version matching and subtitle data terms |

These integrations return subtitle candidates, not audio dubs or movie video. The app must associate every subtitle with a title/episode/version and verify format/encoding and timing where possible.

References: [OpenSubtitles API docs](https://ai.opensubtitles.com/api-docs), [OpenSubtitles legacy API migration notice](https://forum.opensubtitles.com/t/opensubtitles-org-api-final-shutdown-notice-for-non-vip-users/5045), [Wyzie docs](https://docs.wyzie.io/subs/intro), [Wyzie terms](https://store.wyzie.io/terms).
