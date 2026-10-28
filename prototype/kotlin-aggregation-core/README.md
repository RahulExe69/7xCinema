# Kotlin Aggregation Core — spike

This dependency-light Kotlin/JVM module is the native-side prototype for 7xCinema's Android-first feasibility work. Its title-identity and language-provenance rules correspond to the [JavaScript reference prototype](../aggregation-core/README.md).

## In scope

- normalise provider records and external IDs;
- collapse repeated rows from the same provider item while retaining aliases and language claims;
- mark identity conflicts and keep them out of cross-provider matching;
- group different provider sources by shared external IDs, or by the deliberately narrow title/year fallback when neither source has IDs;
- require matching season/episode coordinates before grouping episode records;
- keep catalogue language claims non-selectable, and add selectable tracks only from a prepared-player observation;
- fan out a search to explicitly enabled, eligibility-approved and search-capable synthetic adapters;
- bound concurrent adapter calls, enforce provider timeouts, return partial results, and emit snapshots as providers finish;
- isolate per-provider errors and keep safe generic error messages.

## Not yet in scope

- Real network/provider adapters, API request cancellation integration, caching, ranking, and adapter health persistence.
- An Android application module, search UI, source picker, or player surface.
- Verification with live media URLs or a real device.
- Fully shared fixtures between the Kotlin and JavaScript implementations.

The tests use synthetic provider functions and records only. This module is a tested JVM prototype, not a claim that an Android APK or end-to-end playback works.

## Run tests

Requires JDK 21 and Gradle 8.14 (or a compatible newer Gradle release):

```sh
gradle test --no-daemon
```

GitHub Actions runs both the JavaScript reference tests and the Kotlin test suite. The Kotlin suite covers matching, provenance, eligibility, progressive updates, failure isolation, concurrency bounds, and timeout handling.

## Next parity work

- add shared JSON fixtures consumed by both implementations;
- compare canonical IDs, grouped sources, language claims, and confidence fields using identical input records;
- preserve behaviour through further adversarial fixtures for conflicting external IDs, alternate titles, and episodes;
- only then wire the domain module into a minimal Android Compose screen and Media3 player proof.
