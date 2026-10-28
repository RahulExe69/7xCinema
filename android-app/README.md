# Legacy Kotlin/Compose Android feasibility slice

**Status:** Retained as a reference implementation after the primary 7xCinema app shell moved to React + TypeScript + Capacitor under `capacitor-app/`.

This project is the first native Android UI/player feasibility spike. It uses Kotlin, Jetpack Compose, the tested Kotlin/JVM aggregation module, three synthetic demo adapters, and AndroidX Media3 ExoPlayer. It remains useful for understanding the native player and actual track-selection path, but it is no longer the main app shell.

## What it demonstrates
- A Compose search screen calling the Kotlin aggregation core.
- Three synthetic demo adapters with overlapping metadata; they are not live providers.
- A grouped title card retaining source identity and language-claim types.
- Per-source navigation into a real Media3 player surface.
- Player-reported audio/subtitle tracks and selection controls.
- HTTP(S) URL validation for tester-supplied media.

## Important limits
The catalogue and source names are mock data. There are no provider source URLs, live source resolution, or physical-device playback verification. The player only accepts a tester-supplied URL to media they are authorised to access. This is a feasibility slice, not a complete streaming app.

## Build
Requires JDK 21, Android SDK platform 36, and Gradle 8.14:

```sh
cd android-app
gradle testDebugUnitTest assembleDebug --no-daemon
```

The legacy app build workflow is kept for reference. New app development should start at [`capacitor-app/`](../capacitor-app/README.md); see [the migration record](../docs/CAPACITOR_MIGRATION.md).
