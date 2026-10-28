# 7xCinema — Base Repository Decision Study

**Reviewed:** 2026-10-28  
**Status:** Shortlist and recommendation for the next feasibility spike; no base selected.

## The question

Should 7xCinema adapt an existing application or create a new UI around reusable provider concepts? A repository being popular or feature-rich is not sufficient. The base must fit the product's single-search experience, licensing/distribution goals, true language model, and playback requirements.

## Candidate comparison

| Candidate | What it already contributes | Main gap versus 7xCinema | License / operational concern | Current judgement |
|---|---|---|---|---|
| Nuvio Mobile | Native Kotlin Multiplatform/Compose UI, addon registry, concurrent catalog search across enabled addons, source capability checks, Media3/ExoPlayer and optional MPV player | Search results are retained as separate catalogue sections; it does not automatically collapse all matching records into a single canonical title with merged source/language evidence. Requires configured addons/sources rather than a curated auto-managed catalogue | GPL-3.0; large active project and many moving parts; any reuse/derivative must comply with licence, notices, dependencies and trademark rules | **Strongest existing-app base to feasibility-test** if GPL-3.0 is acceptable |
| MovieBox-TUI | Rust provider interfaces, source-specific adapters, metadata/cache/resolution logic and tests | Terminal UI, external-player hand-off, selected-provider search for native providers, no polished in-app mobile player or universal native-provider search | MIT OR Apache-2.0 declared; source access and media rights still need independent review. Upstream and Rahul's fork main were identical at audit commit | Reuse concepts or evaluate isolated modules; not the app base |
| AIOStreams | Focused aggregation pipeline for configured addon results: fan-out, deduplication, filtering, sorting and formatting | Stremio addon/server layer rather than complete Android consumer app; operates mainly on source results for known catalogue IDs, not the full MovieBox-like UI/product | AGPL-3.0; integrated addons have independent terms/rights; do not adopt restriction-evasion proxy paths | Strong aggregator architecture reference; not the mobile app base |
| Lumora | Native Kotlin application combining multiple source systems, source-aware grouping and Find & Play direction | Not a 7xCinema base candidate under its current constraints | Current PolyForm Noncommercial 1.0.0; repository says no rebrand/reskin and is described as parked | Architecture reference only; do not fork/rebrand |
| FlixQuest | Flutter UI, movie/series details and player/subtitle UX | Separate Scraper API; current player depends on a separately maintained custom package; not one self-contained all-provider backend | GPL-3.0 and external player/build dependency | UI/player reference; no default fork |
| CloudStream | Native Android extension architecture and provider/plugin separation | Large extension-centric app with a different product/UX model | GPL-3.0; each extension must be individually reviewed | Extension architecture reference |
| Community Stremio Android | Kotlin/Compose, Stremio integration, ExoPlayer/MPV and Rust local streaming component | Client/streaming environment differs; not automatically a global catalogue deduplicator or MovieBox-like curated product | Recognised licence not returned by GitHub metadata; must inspect actual files/submodules | Reference only until licence/build verified |
| Build a fresh app | Complete control over UX, identity, domain model and source eligibility | More initial UI/player work and more decisions to own | Framework and native-player integration must be proven | Best fallback if Nuvio's GPL/product architecture is a poor fit |

## Code evidence for Nuvio

Reviewed the default branch at audit time, reported by GitHub as cmp-rewrite:
- SearchRepository builds search requests from every enabled addon's manifest catalogs that declare search support and from configured server-library targets.
- It launches those requests concurrently, emits each completed catalogue section incrementally, and preserves per-section error state.
- Search results are returned as multiple HomeCatalogSection items with catalogue/addon context, rather than a single globally deduplicated title list.
- The Discover flow exposes a selected catalog and loads that catalog's page; it is not a universal merge of every Discover catalogue.
- PlaybackAvailability checks whether an enabled addon's manifest supports the requested stream resource, media type and ID namespace/prefix. It also considers plugin scrapers, embedded metadata streams and supported personal servers.
- PlaybackAvailability tests explicitly distinguish catalog/metadata capability from actual playback capability.
- The Android player source integrates Media3/ExoPlayer and optional MPV.

References: [SearchRepository.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/search/SearchRepository.kt), [AddonModels.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/addons/AddonModels.kt), [PlaybackAvailability.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/PlaybackAvailability.kt), [PlaybackAvailabilityTest.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonTest/kotlin/com/nuvio/app/features/streams/PlaybackAvailabilityTest.kt), [PlayerEngine.android.kt](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/androidMain/kotlin/com/nuvio/app/features/player/PlayerEngine.android.kt).

## Proposed decision method

Do not choose from screenshots, stars, or README claims alone. Compare two equal-sized proof-of-concept paths:

### Path A — NuvioMobile adaptation spike
1. Clone the exact default branch and build it unmodified.
2. Confirm how installed addons/catalogues are configured, and identify the narrowest seam for automatic curated sources.
3. Add a test-only cross-catalog grouping experiment, keeping each source record and audio/dub/subtitle claim separate.
4. Confirm a licensed test asset plays through the existing native player and exposes actual audio/subtitle tracks.
5. Measure how invasive the changes are and review GPL-3.0 obligations.

### Path B — New 7xCinema app spike
1. Choose native Kotlin/Compose + Media3 or React/Capacitor + native Media3 boundary for the test.
2. Implement the same fake-provider universal search with incremental results and conservative deduplication.
3. Play the same licensed test asset, expose real track metadata, and verify a startup-failure event.
4. Measure packaging/build complexity, lifecycle correctness, and iteration speed.

Keep the test cases identical between paths: same title fixtures, source records, language claims, test media, and player error. If Path A is clearly faster without forcing its source-centric UX onto our product, use Nuvio as a GPL-compliant base. If global title reconciliation, default provider management or product identity requires a deep rewrite, a fresh app may be cleaner long-term.

## Preliminary recommendation

**Test NuvioMobile as the leading existing-app base, not as the automatic winner.** It already has native playback and parallel addon-catalogue discovery. The key uncertainty is the cost of changing its source-section model into the one-title/many-sources catalogue 7xCinema needs. The GPL-3.0 distribution implications are a hard gate, not a footnote.

At the same time, run a minimal fresh-app vertical slice only to the same acceptance gate. The decision should compare actual build and feature work, not abstract framework preference.

## Hard acceptance gates before picking a base

- [ ] Repository builds from a clean checkout using documented steps.
- [ ] Base and dependency licences are compatible with intended distribution.
- [ ] No trademark/branding constraint conflicts with an independent 7xCinema identity.
- [ ] A single search fans out to at least two fake/eligible catalogue providers.
- [ ] Partial results remain available when one provider fails.
- [ ] Same title across sources can merge without losing season/episode/version identity.
- [ ] Embedded audio, separate dub versions and subtitles remain distinct.
- [ ] Actual playback of an authorised test asset works and reports its real tracks.
- [ ] A confirmed startup failure produces a recoverable state rather than a stuck overlay.
- [ ] Source eligibility and security rules can be enforced centrally.
- [ ] The estimated amount of invasive rework is documented.
