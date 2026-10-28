# 7xCinema Coverage Model

## Purpose

7xCinema should help users miss less content without pretending that every discovered title can be played inside the app. Its coverage model separates what is discoverable, what can be played, and where an official service may offer the title.

## The three coverage layers

### 1. Catalogue discovery

A metadata/catalogue source can contribute title identity, alternate names, artwork, release details, synopsis, cast, genres, seasons and episodes. More than one source may describe the same work.

Catalogue discovery answers: **“Does 7xCinema know this title exists?”**

It does not answer whether any source currently offers it for playback.

### 2. Verified in-app playback

A playable-source integration provides a specific candidate that 7xCinema is authorised to use. That candidate must be compatible with a supported player and must be associated with the correct title, episode, version, and language evidence.

Playback coverage answers: **“Does 7xCinema currently have a permitted, compatible source it can play?”**

Keep these stages separate:
- search returned a title;
- a provider supplied a source candidate;
- the source resolved;
- the player prepared the media;
- playback actually started;
- the media exposed verified audio/subtitle tracks.

A success at one stage does not imply success at the next.

### 3. Official availability destination

An availability source may state that a title is offered by an official streaming, rental, or purchase service and provide a verified official app/page destination.

This answers: **“Where can a user go to watch or obtain this title officially?”**

It is an external hand-off, not an in-app stream. The UI should label the action clearly, validate the destination, and keep any known region, offer type, and last-checked timestamp. Never show an official destination as a successful in-app playback source.

## Language coverage

Language is an additional dimension across the three coverage layers. Do not collapse these into one unqualified language list.

- **Embedded audio track:** a track discovered in a specific media asset and selectable in the actual player.
- **Separate dubbed version:** a distinct playback candidate whose audio is dubbed into a language.
- **Subtitle:** an embedded or external subtitle resource associated with a source/version.
- **Provider claim:** a label reported by a catalogue or filename but not verified against the asset.
- **Unknown:** no reliable language evidence.

A title-level summary may show the union of language options available across its source records, but each option must retain the source, kind, evidence level, and last verification. A language present in one source must not be assigned to every source.

## Provider/source record model

Every integration declares one or more categories:

| Category | Provides | Does not prove |
|---|---|---|
| Metadata/catalogue | Metadata, titles, seasons, episodes | Playability |
| Playable source | Candidate or permitted resolver | That playback will definitely start |
| Official destination | Official app/page or offer | In-app playback |
| Personal library/server | User-authorised media | Public availability |
| Protocol/addon | Standardised integration path | Source legality or reliability |
| Live TV/IPTV | Channel/EPG/live records | VOD coverage |

Every result keeps an explicit provider/source ID. Never rely on a global “current provider” when a unified title includes sources from several providers.

## UI behaviours

1. If metadata exists but no playback candidate exists, the title can still appear in search and details.
2. If a compatible in-app source exists, show Watch and the verified options.
3. If only an official destination exists, show a clearly external action such as “Watch on [provider]”; do not show it as a stream.
4. If both exist, offer both the in-app option and external destinations, clearly distinguished.
5. If a source breaks after being listed, show the failure and try compatible alternatives according to playback policy.
6. If language evidence is uncertain, label it as reported/unverified or omit it. Do not create selectable track menus from title-level claims.
7. Keep partial-results warnings when one or more eligible catalogue providers time out.

## Measurement

Track separate metrics:
- **Catalogue coverage:** unique titles/episodes discovered from eligible metadata sources.
- **Playable coverage:** titles/episodes with at least one permitted source verified to start in the supported player during a defined observation window.
- **Official destination coverage:** titles with a fresh, validated official destination or offer.
- **Audio coverage:** verified embedded audio tracks and verified separate dubbed versions, separately.
- **Subtitle coverage:** verified embedded and external subtitles, separately.
- **Data quality:** false-duplicate merge rate, duplicate-split rate, stale claims, and unknown-language rate.
- **Search completeness:** number of eligible providers attempted, succeeded, failed, timed out, or were skipped by capability/eligibility policy.

Always report region, sample size, test method, time window, and evidence class. Do not claim complete/global coverage from an anecdotal successful search.

## Responsible access

Use only integrations and destinations the project is authorised to access and present. Metadata API terms, attribution, caching, rate limits, region availability, and official-link policies must be reviewed individually. A source code licence does not grant rights to third-party video or API data.

## Acceptance scenarios

- A title is discoverable from metadata but has no stream: title displays, Watch is unavailable, and no fake stream is shown.
- A title has one playable source and one official destination: both options are shown with different labels.
- Three providers report the same title but different languages: one logical title is shown and each language retains its actual source and evidence type.
- A provider reports “Hindi” but the media player does not expose a Hindi track: do not show Hindi as a selectable embedded track; if a separate Hindi version exists, present it as another candidate.
- Every provider times out: display a clear unavailable/partial-search state, not an empty result falsely presented as complete.
