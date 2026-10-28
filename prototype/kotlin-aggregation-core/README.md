# Kotlin Aggregation Core — spike

This module is an early, dependency-light Kotlin/JVM port of the title-identity and language-provenance rules in [the JavaScript reference prototype](../aggregation-core/README.md).

## In scope

- normalise provider records and external IDs;
- collapse repeated rows from the same provider item while retaining aliases and language claims;
- mark identity conflicts and keep them out of cross-provider matching;
- group different provider sources by shared external IDs, or by the deliberately narrow title/year fallback when neither source has IDs;
- require matching season/episode coordinates before grouping episode records;
- keep catalogue language claims non-selectable, and add selectable tracks only from a prepared-player observation.

## Not yet in scope

This is **not** the full Kotlin replacement for `aggregateSearch()`. It does not yet fan out network requests, run bounded concurrent provider calls, emit progressive UI snapshots, enforce per-provider timeouts, cache results, or connect to an Android screen/player. The current tests use synthetic records only.

## Run tests

Requires JDK 21 and Gradle 8.14 (or a compatible newer Gradle release):

```sh
gradle test --no-daemon
```

GitHub Actions runs the same command for relevant pushes and pull requests.

## Next parity work

- add a shared JSON fixture set consumed by both the JS reference tests and Kotlin tests;
- extend the Kotlin module with bounded provider fan-out, per-provider timeout/cancellation and progressive snapshots;
- compare outcomes using the same fixtures before wiring an Android screen to the domain layer.
