# Universal Search Core — Proof of Concept

This is a deliberately small, dependency-free prototype to validate 7xCinema's most framework-independent requirement before selecting an app base or UI framework.

## What it demonstrates

- One query fans out to all enabled, explicitly eligibility-approved, search-capable adapters.
- Search concurrency is bounded, and each provider has its own timeout.
- Provider errors and empty results are distinct; one failure does not erase successful results.
- Results can be emitted progressively as providers finish.
- Canonical titles group by shared external ID first, with exact normalised title + year as a narrow fallback.
- Conflicting IDs, different media types, different years, and different episode coordinates prevent unsafe grouping.
- Each provider/item source remains attached to the logical title.
- Language claims preserve source provenance and distinct kinds: reported claim, separate dubbed version, subtitle, and real embedded audio track.
- Provider/catalogue metadata cannot certify a selectable embedded track. Only a separate observation from the prepared player can do so.

## Run tests

Requires Node.js 20 or newer. From this directory, run **npm test**.

No third-party packages are required. A GitHub Actions workflow runs the same tests when this prototype changes.

## Deliberate limits

This is not a video scraper, live provider integration, player, or app UI. It uses test providers and does not fetch video or subtitle files. Before production use, the core needs additional decisions/tests for ranking, pagination, cache expiry, cancellation propagation, URL/redirect safety, metadata conflict policy, episode IDs, and provider-specific eligibility.

