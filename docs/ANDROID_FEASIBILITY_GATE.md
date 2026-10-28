# Android Feasibility Gate

**Status:** Research gate in progress — no app framework selected yet  
**Last checked:** 2026-10-28

## Decision this gate must answer

Which foundation lets 7xCinema ship a maintainable Android app with:
- one query fanned out across every enabled and approved search provider;
- progressive results, per-provider failures, global identity matching, and source provenance;
- grouped language/version claims without presenting unverified catalogue claims as actual player tracks;
- reliable playback, audio/subtitle track inspection, headers, and error reporting;
- a usable, maintainable UI without inheriting an unnecessary addon or library architecture.

The search-core prototype is a behavioural reference, not an Android runtime module. It is JavaScript ES modules with Node's built-in test runner. A native Kotlin app would need a deliberate port with parity tests; a Capacitor app can reuse the JavaScript more directly, but needs a native playback bridge for track discovery and selection.

## Evidence inspected

### NuvioMobile

Repository: https://github.com/NuvioMedia/NuvioMobile  
Licence declared by repository: GNU GPL-3.0. See https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/LICENSE and the project's [build instructions](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/README.md).

Inspected source files:
- [SearchRepository.kt](https://github.com/NuvioMedia/NuvioMobile/blob/86e0d5bb45f20d541d17f92146d60746420db71d/composeApp/src/commonMain/kotlin/com/nuvio/app/features/search/SearchRepository.kt)
- [PlayerEngine.android.kt](https://github.com/NuvioMedia/NuvioMobile/blob/86e0d5bb45f20d541d17f92146d60746420db71d/composeApp/src/androidMain/kotlin/com/nuvio/app/features/player/PlayerEngine.android.kt)

Verified observations from code:
1. Search builds requests for enabled addons whose manifests expose search-compatible catalogues and also includes configured server search targets.
2. The search repository launches loaders concurrently with coroutines and emits results incrementally as each loader completes. It cancels the previous active search and tracks request state to avoid unnecessary repeats.
3. The native player code uses AndroidX Media3 ExoPlayer and supports a libmpv path, including automatic fallback from ExoPlayer on failure. The source handles playback headers and external subtitles, and its surface reports controller/snapshot/error callbacks.
4. The current search state is section-based: each add-on catalogue or server search returns a `HomeCatalogSection`, which is accumulated and displayed as separate sections. This is useful parallel-search infrastructure, but it is not the single globally deduplicated title model 7xCinema requires.
5. Nuvio's published description says users bring their own sources. That is a different product/setup assumption from a 7xCinema-managed, explicitly reviewed provider registry.

**Assessment:** Strong reference for concurrent search orchestration, Android playback, and source/error handling. A direct fork would still require meaningful work to replace the search result model, source onboarding/eligibility flow, and product UX. GPL-3.0 is not an automatic blocker, but redistribution and derivative-work obligations must be evaluated and followed before adopting or distributing a fork. This assessment is engineering research, not legal advice.

### AndroidX Media3

Official Android documentation: https://developer.android.com/media/media3  
Media3's ExoPlayer and track-selection APIs provide a native route to prepared-player track inspection and selection. The implementation still needs a thin proof of concept against our intended stream formats and headers; metadata saying a language exists is not equivalent to a prepared player exposing that track.

## Candidate comparison

| Candidate | Reuse of existing JS core | Native playback and track visibility | Product/search model fit | Main cost or risk | Current verdict |
|---|---|---|---|---|---|
| Fork/adapt NuvioMobile | Low; would need a Kotlin integration or a separate service boundary | High; substantial Media3/libmpv implementation already exists | Medium-low; current search is concurrent but section-oriented | GPL-3.0 obligations, large inherited codebase, significant product-model changes | Reference candidate, not selected |
| Fresh Kotlin + Compose + Media3 | Low; port the algorithm and keep JS fixtures as a behavioural oracle | High; native APIs and lifecycle without a JS-to-player bridge | High; can implement the global title/source/language model directly | More up-front work; native port needs parity tests | Preferred Android-first candidate for a thin-slice spike |
| React + Capacitor + native Media3 plugin | High; JS aggregation prototype can be reused | Medium-high after plugin is implemented and tested | High; UI and result grouping fully controlled | Player lifecycle, selected-track state, headers, and errors need a reliable native bridge | Viable alternative if fastest reuse of the JS core is the priority |

This is a comparative engineering judgement, not a claim that any candidate already passes a build or playback test.

## Go/no-go acceptance test

Before selecting a long-term base, implement the smallest end-to-end slice against owned or otherwise authorized test media:

1. **Search:** use three fixture adapters and verify they are queried in parallel with bounded concurrency and independent timeouts.
2. **One logical title:** return the same title from three adapters with shared external IDs and different source names. The UI must show one result with all three source options.
3. **Language correctness:** combine English, Hindi, and Bengali claims while showing each claim's type and originating source. Do not label a provider claim as a verified embedded track.
4. **Watch action:** tapping a source must visibly transition to a player/loading/error state; a transparent overlay or no-op is a failure.
5. **Player probe:** load a known test asset and list the tracks returned by the prepared player. Only actual player tracks may be selectable as embedded audio/subtitles.
6. **Failure handling:** one adapter times out and one fails; other sources remain visible, with safe per-provider status.
7. **Build/reproducibility:** clean checkout builds a debug APK through a documented command and CI, with no secret keys committed.

The spike passes only when the tests above are demonstrated, not merely described. Do not use unlicensed streams or attempt to bypass access controls to prove playback.

## Recommended next implementation sequence

1. Treat the merged JavaScript core as the reference contract. Add JSON fixtures that can be reused by a Kotlin port and by a Capacitor/native bridge test.
2. Create a small Android spike using Kotlin, Compose, and Media3: search box, result card, source picker, player surface, and actual prepared-player track list. No production provider integrations yet.
3. In parallel, time-box a review of Nuvio's reusable interfaces and GPL obligations; do not copy code while that review is open.
4. Compare the native spike with a minimal Capacitor bridge using the same fixture suite. Choose on demonstrated build/playback parity and maintenance cost—not on UI mockups.
5. Add real provider adapters only after source eligibility, terms, error isolation, and provenance are defined.

## Known limits

- No real provider adapter is wired into the prototype.
- No Android UI or APK has been built by this repository yet.
- No live playback, subtitle selection, or embedded-audio selection has been validated.
- Nuvio source review was targeted, not a complete audit of every module or transitive dependency.
