# 7xCinema — Framework and Runtime Comparison

**Status:** Evidence-based comparison; provisional recommendation only.  
**Purpose:** Select the smallest maintainable path to a polished Android streaming app with accurate track selection and a replaceable multi-provider engine.

## 1. Requirements that matter most

- A modern, responsive, cinematic Android UI.
- Reliable player lifecycle, HLS/DASH/direct-file support where compatible, and truthful audio/subtitle track selection.
- A provider engine independent of the UI.
- One query across enabled providers, partial results, and failure isolation.
- A maintainable build/release path the project can actually support.
- No dependence on an unreviewed third-party streaming scraper or a public unrestricted proxy.

## 2. Options

### Option A — React + TypeScript + Capacitor, with a native Kotlin/Media3 playback plugin

**What it gives us:** A web-first interface with an Android container and an official plugin boundary to call native Java/Kotlin APIs. Capacitor documents custom native plugins for exposing native functionality to the web layer.

**Strengths**
- Fast UI iteration and reuse of familiar React/TypeScript patterns.
- Works with existing web tooling and can preserve a web preview workflow.
- A native plugin can expose a Media3 player instead of forcing advanced playback into HTML video.
- Provider domain models and aggregation tests can be implemented independently from UI components.

**Risks**
- A custom native player plugin requires Android/Kotlin work, lifecycle handling, track/event mapping, and device testing.
- Calling third-party sources from a WebView may encounter CORS restrictions. Do not respond by building an unrestricted relay/proxy; choose a bounded native networking or permitted local-service design.
- UI-to-native-player events and errors must be rigorously modelled; a WebView overlay alone cannot prove playback works.

**Evidence:** [Capacitor](https://capacitorjs.com/docs), [Capacitor plugins](https://capacitorjs.com/docs/plugins), [Android Media3 track selection](https://developer.android.com/media/media3/exoplayer/track-selection).

### Option B — Flutter/Dart with a maintained native playback plugin

**What it gives us:** A single Dart UI codebase with native Android packaging and established widget/integration-test tooling.

**Strengths**
- Strong mobile layout and animation workflow.
- Native plugins can provide playback and device integrations.
- FlixQuest supplies reference material for catalogue, TV mode, source options, and player UI.

**Risks**
- The team would commit to Dart/Flutter instead of the existing React-heavy workflow.
- FlixQuest is GPL-3.0 and uses a custom player package plus a separately documented scraper API; copying or forking it has licensing and operational implications.
- The custom player/plugin still requires lifecycle, track, and error testing; the framework alone does not solve provider aggregation.

**Evidence:** [Flutter testing](https://docs.flutter.dev/testing/overview), [FlixQuest](https://github.com/flixquest/flixquest).

### Option C — Native Android/Kotlin (for example, Jetpack Compose + Media3)

**What it gives us:** The most direct access to Android media APIs and lifecycle.

**Strengths**
- Direct path to Media3 track selector, native playback events, audio/subtitle controls, background behaviour, and Android system integrations.
- Fewer bridging layers between UI and player.
- Potentially the cleanest path if Android-only native player capability is the overriding priority.

**Risks**
- More Kotlin/native UI work and less leverage of existing web UI skills.
- No automatic solution for provider data modelling, aggregation, rights review, or multilingual provenance.
- UI iteration may be less convenient if a browser-first preview workflow is a priority.

**Evidence:** [Media3 track selection](https://developer.android.com/media/media3/exoplayer/track-selection), [Media3 supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats).

### Option D — Embed MovieBox-TUI's Rust project directly

**What it gives us:** Existing provider/domain code with Rust async networking and a documented provider contract.

**Strengths**
- A starting point for understanding provider logic, metadata adaptation, caching, and resolver outcomes.
- MIT OR Apache-2.0 is declared in its Cargo manifest/README, subject to the exact files and notices used.

**Risks**
- Its current product is a terminal app that launches external players; Android documentation describes Termux rather than a native APK experience.
- src/lib.rs exports TUI modules, and the normal service search dispatches through a selected ProviderKind. It does not directly satisfy universal cross-provider search.
- Reusing the complete crate may bring terminal UI and other dependencies into the Android build. A separate provider-core crate or a carefully scoped adapter may be required.
- Code reuse does not establish permission to use every upstream provider or its returned media.

**Conclusion:** Reuse knowledge and potentially isolated modules after a build/licence spike. Do not treat the entire crate as the app framework.

### Option E — Remote aggregation service

**What it gives us:** Provider orchestration outside the client, easier central updates, and one API for multiple clients.

**Strengths**
- Provider adapters and caching can be updated without releasing a new client build.
- Useful if the integrated sources explicitly permit server-side access and their terms can be met.

**Risks**
- Adds hosting, privacy, security, uptime, cost, rate-limit, and abuse-management obligations.
- Provider credentials/tokens and third-party stream URLs can be highly sensitive.
- A generic relay can become an unrestricted proxy and create serious security and source-permission issues.
- A backend cannot make an unauthorised source legitimate.

**Conclusion:** Do not choose this merely for convenience. Keep it open only for approved sources and a clearly constrained API.

## 3. Provisional comparison

| Criterion | React + Capacitor + native player plugin | Flutter + native player plugin | Native Kotlin + Media3 | Direct TUI crate reuse | Remote backend |
|---|---|---|---|---|---|
| Mobile UI iteration | Strong | Strong | Strong, more native work | Weak as-is | Not a UI choice |
| Native track selection | Strong if plugin built well | Strong if plugin built well | Direct | External-player hand-off as-is | Doesn't itself solve playback |
| Reuse existing web patterns | Strong | Low | Low | Low | Depends on client |
| Reuse MovieBox-TUI domain logic | Via separate core/bridge if validated | Via separate core/bridge if validated | Via separate core/bridge if validated | Direct reuse is tempting but coupled | Could adapt selected logic, subject to policy |
| Build complexity | Medium | Medium | Medium | Medium–high if extracting modules | High operations/security burden |
| Provider independence | Must be architected | Must be architected | Must be architected | One-provider dispatch requires new orchestration | Possible but needs governance |
| Legal/security complexity | Depends on adapters | Depends on adapters | Depends on adapters | Same source-permission issue | Highest operational exposure |
| Current status | Candidate | Candidate | Candidate | Reference only | Conditional / not preferred by default |

Qualitative ratings are provisional engineering judgement, not measured benchmarks.

## 4. Provisional recommendation

**Prototype Option A first:** React + TypeScript + Capacitor for the application UI, a small native Kotlin/Media3 integration for direct supported streams and real track-selection events, and a provider-aggregation core kept independent of the UI.

Reasons:
- It offers a practical balance of rapid UI iteration and access to actual Android media APIs.
- Capacitor officially supports native plugin boundaries for Java/Kotlin code.
- It allows provider orchestration and deduplication to be tested outside the player.
- It avoids taking on the entire FlixQuest or CloudStream codebase and their respective licence/architecture commitments.

**This is not a final decision.** If the spike reveals that the player bridge, Android lifecycle, or native networking becomes disproportionately complex, compare a Flutter or native Kotlin proof of concept before building the full app.

## 5. Required proof-of-concept gates

Before finalising the framework, demonstrate:

1. A minimal UI opens and calls a typed native/player API.
2. A test source plays on an Android device using the intended playback path.
3. The app reads real track metadata and can select an available audio/subtitle track where the test media exposes one.
4. A separate dubbed version is presented as a separate source, not a fake embedded track.
5. A test provider search completes without CORS/security workarounds that create an unrestricted proxy.
6. A fake-provider test proves concurrent search, partial results, and per-provider failure isolation.
7. The app can recover from player errors without getting stuck behind a loading overlay.
8. Build, licence, dependency, and security implications are documented.

## 6. Related official documentation

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Capacitor plugin guide](https://capacitorjs.com/docs/plugins)
- [Media3 supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats)
- [Media3 track selection](https://developer.android.com/media/media3/exoplayer/track-selection)
- [Flutter testing overview](https://docs.flutter.dev/testing/overview)
- [TMDB API FAQ and attribution requirements](https://developer.themoviedb.org/docs/faq)
