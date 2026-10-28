# 7xCinema Android Slice

This is the first Android UI/player feasibility spike. It uses Kotlin, Jetpack Compose, the tested Kotlin/JVM aggregation module, and AndroidX Media3 ExoPlayer.

## What it demonstrates

- A Compose search screen that calls the Kotlin aggregation core.
- Three **synthetic demo adapters** returning overlapping metadata; they are not live providers.
- One grouped title card retaining source identity and language claim types.
- Per-source navigation into a real Media3 player surface.
- Loading and error state feedback, plus display and selection controls for audio/subtitle tracks reported by the prepared player.
- URL validation for HTTP(S) input.

## Important limits

The catalogue results and source names are mock data. They do not contain playable URLs, and the Watch/source-resolution pipeline is not connected. The player accepts a URL that the tester supplies for a media file they are authorised to access. No third-party streams or DRM/access-control bypasses are included.

This slice is not a production app yet. It still needs a reproducible build/device test, real authorised provider adapters, source-resolution, tests around player lifecycle and track selection, and a proper visual/UI pass.

## Build

Requires JDK 21, Android SDK platform 36, and Gradle 8.14:

```sh
cd android-app
gradle assembleDebug --no-daemon
```

The debug APK is written to `android-app/app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions runs a clean debug build and uploads the APK as a workflow artifact on relevant changes.
