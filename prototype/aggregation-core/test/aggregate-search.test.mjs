import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  addVerifiedPlayerTracks,
  aggregateSearch,
  groupCatalogueRecords,
  normaliseTitle,
} from "../src/aggregate-search.mjs";

const baseProvider = (overrides = {}) => ({
  id: "provider-a",
  enabled: true,
  eligible: true,
  capabilities: { search: true },
  priority: 10,
  async search() { return []; },
  ...overrides,
});

const movie = (overrides = {}) => ({
  providerItemId: "item-1",
  title: "The Example Film",
  mediaType: "movie",
  year: 2024,
  externalIds: { imdb: "tt1234567", tmdb: "9876" },
  languageClaims: [],
  ...overrides,
});

test("rejects duplicate provider IDs so statuses cannot overwrite each other", async () => {
  const provider = baseProvider({ id: "duplicate" });
  await assert.rejects(
    aggregateSearch("example", [provider, { ...provider }]),
    /Provider IDs must be unique/,
  );
});

test("normalises punctuation and accents without reducing a title to a loose substring", () => {
  assert.equal(normaliseTitle("  Amélie: The Sequel! "), "amelie the sequel");
  assert.notEqual(normaliseTitle("Dune"), normaliseTitle("Dune Part Two"));
});

test("one search queries multiple eligible providers and merges the same title while retaining sources and language provenance", async () => {
  const providers = [
    baseProvider({
      id: "catalogue-en",
      priority: 1,
      async search(query) {
        assert.equal(query, "Dune Part Two");
        return [movie({
          title: "Dune: Part Two",
          externalIds: { imdb: "tt15239678", tmdb: "693134" },
          languageClaims: [
            { languageCode: "en", language: "English", kind: "reported", evidence: "provider-metadata" },
            { languageCode: "en", language: "English", kind: "embedded-audio", evidence: "provider-metadata" },
          ],
        })];
      },
    }),
    baseProvider({
      id: "catalogue-hi",
      priority: 2,
      async search() {
        return [movie({
          providerItemId: "hi-501",
          title: "Dune Part Two (Hindi Dub)",
          externalIds: { imdb: "tt15239678" },
          languageClaims: [
            { languageCode: "hi", language: "Hindi", kind: "dubbed-version", evidence: "provider-metadata" },
          ],
        })];
      },
    }),
    baseProvider({
      id: "subtitle-index",
      priority: 3,
      async search() {
        return [movie({
          providerItemId: "subs-33",
          title: "Dune Part Two",
          externalIds: { tmdb: "693134" },
          languageClaims: [
            { languageCode: "bn", language: "Bengali", kind: "subtitle", evidence: "subtitle-api" },
          ],
        })];
      },
    }),
  ];

  const updates = [];
  const result = await aggregateSearch(" Dune Part Two ", providers, {
    timeoutMs: 500,
    concurrency: 3,
    onUpdate(snapshot) { updates.push(snapshot); },
  });

  assert.equal(result.results.length, 1);
  const title = result.results[0];
  assert.equal(title.matchConfidence, "strong");
  assert.equal(title.sources.length, 3);
  assert.deepEqual(
    title.sources.map(source => source.providerId),
    ["catalogue-en", "catalogue-hi", "subtitle-index"],
  );
  assert.ok(title.alternateTitles.includes("Dune Part Two (Hindi Dub)"));

  const languages = new Set(title.languageClaims.map(claim => claim.languageCode + ":" + claim.kind));
  assert.ok(languages.has("en:reported"));
  assert.ok(languages.has("hi:dubbed-version"));
  assert.ok(languages.has("bn:subtitle"));

  // A catalogue/provider claim cannot manufacture a selectable embedded track.
  const providerClaim = title.languageClaims.find(claim =>
    claim.languageCode === "en" && claim.reportedKind === "embedded-audio");
  assert.ok(providerClaim);
  assert.equal(providerClaim.selectable, false);

  const updatedTitle = addVerifiedPlayerTracks(title, title.sources[0].id, [
    { type: "audio", languageCode: "en", language: "English" },
    { type: "audio", languageCode: "hi", language: "Hindi" },
    { type: "subtitle", languageCode: "bn", language: "Bengali" },
  ]);
  assert.ok(updatedTitle.languageClaims.some(claim =>
    claim.sourceId === title.sources[0].id
      && claim.kind === "embedded-audio"
      && claim.languageCode === "hi"
      && claim.evidence === "player-probe"
      && claim.selectable === true));
  assert.ok(updatedTitle.languageClaims.some(claim =>
    claim.kind === "subtitle" && claim.evidence === "player-probe" && claim.selectable === true));

  assert.equal(updates.length, 3);
  assert.ok(updates.every(snapshot => snapshot.phase === "partial" || snapshot.phase === "complete"));
  assert.equal(result.completedProviders, 3);
  assert.equal(result.successfulProviders, 3);
});

test("deduplicates repeated source items from the same provider and keeps their language claims", async () => {
  const provider = baseProvider({
    id: "one-provider",
    async search() {
      return [
        movie({
          providerItemId: "same-item",
          title: "Example Film",
          externalIds: { imdb: "tt2222222" },
          languageClaims: [
            { languageCode: "en", language: "English", kind: "reported", evidence: "provider-metadata" },
          ],
        }),
        movie({
          providerItemId: "same-item",
          title: "Example Film (Hindi Dub)",
          externalIds: { imdb: "tt2222222" },
          languageClaims: [
            { languageCode: "hi", language: "Hindi", kind: "dubbed-version", evidence: "provider-metadata" },
          ],
        }),
      ];
    },
  });

  const result = await aggregateSearch("example", [provider], { timeoutMs: 500 });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].sources.length, 1);
  assert.ok(result.results[0].alternateTitles.includes("Example Film (Hindi Dub)"));
  assert.ok(result.results[0].languageClaims.some(claim => claim.languageCode === "en"));
  assert.ok(result.results[0].languageClaims.some(claim => claim.languageCode === "hi"));
  assert.equal(result.providerStatuses[0].resultCount, 1);
});

test("a conflicting duplicate source stays identity-conflicted and cannot regain a year", async () => {
  const provider = baseProvider({
    id: "conflicted-source",
    async search() {
      return [
        movie({ providerItemId: "same", title: "Example Film", year: 2020, externalIds: { imdb: "tt1234567" } }),
        movie({ providerItemId: "same", title: "Example Film", year: 2021, externalIds: { imdb: "tt1234567" } }),
        movie({ providerItemId: "same", title: "Example Film", year: 2020, externalIds: { imdb: "tt1234567" } }),
      ];
    },
  });

  const result = await aggregateSearch("example", [provider], { timeoutMs: 500 });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].sources.length, 1);
  assert.equal(result.results[0].sources[0].identityConflict, true);
  assert.equal(result.results[0].sources[0].year, null);
  assert.equal(result.results[0].year, null);
});

test("emits progressive partial results before a slow provider finishes", async () => {
  const events = [];
  const fast = baseProvider({
    id: "fast",
    async search() { return [movie({ title: "Fast Result", externalIds: {} })]; },
  });
  const slow = baseProvider({
    id: "slow",
    async search() {
      await new Promise(resolve => setTimeout(resolve, 60));
      return [movie({ title: "Slow Result", externalIds: {} })];
    },
  });

  const result = await aggregateSearch("example", [slow, fast], {
    timeoutMs: 500,
    concurrency: 2,
    onUpdate(snapshot) {
      events.push({
        completed: snapshot.completedProviders,
        titles: snapshot.results.map(item => item.title),
      });
    },
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].completed, 1);
  assert.deepEqual(events[0].titles, ["Fast Result"]);
  assert.equal(result.results.length, 2);
  assert.equal(result.queryCompleted, true);
});

test("provider timeout is isolated and still returns successful providers", async () => {
  const fast = baseProvider({
    id: "fast",
    async search() { return [movie({ title: "Available Title", externalIds: {} })]; },
  });
  const stalled = baseProvider({
    id: "stalled",
    async search() {
      await new Promise(resolve => setTimeout(resolve, 80));
      return [movie({ title: "Too Late", externalIds: {} })];
    },
  });

  const result = await aggregateSearch("example", [fast, stalled], {
    timeoutMs: 15,
    concurrency: 2,
  });

  assert.deepEqual(result.results.map(item => item.title), ["Available Title"]);
  assert.equal(result.hasPartialFailure, true);
  assert.equal(result.allProvidersFailed, false);
  assert.equal(result.providerStatuses.find(item => item.providerId === "stalled").status, "timeout");
});

test("failed and empty providers are distinct; unapproved and non-search providers are skipped", async () => {
  let unapprovedWasCalled = false;
  const errorProvider = baseProvider({
    id: "broken",
    async search() { throw new Error("URL and secret must not leak to UI"); },
  });
  const emptyProvider = baseProvider({ id: "empty", async search() { return []; } });
  const unapproved = baseProvider({
    id: "unapproved",
    eligible: false,
    async search() { unapprovedWasCalled = true; return [movie()]; },
  });
  const metadataOnly = baseProvider({
    id: "metadata-only",
    capabilities: { search: false },
    async search() { return [movie()]; },
  });

  const result = await aggregateSearch("example", [errorProvider, emptyProvider, unapproved, metadataOnly], {
    timeoutMs: 300,
  });

  assert.equal(unapprovedWasCalled, false);
  assert.equal(result.results.length, 0);
  assert.equal(result.providerStatuses.find(item => item.providerId === "broken").status, "error");
  assert.equal(result.providerStatuses.find(item => item.providerId === "broken").message, "Provider request failed");
  assert.equal(result.providerStatuses.find(item => item.providerId === "empty").status, "empty");
  assert.equal(result.providerStatuses.find(item => item.providerId === "unapproved").status, "skipped");
  assert.equal(result.providerStatuses.find(item => item.providerId === "metadata-only").status, "skipped");
});

test("title-year matching is a fallback, but title-only, conflicting IDs and differing years do not merge", () => {
  const records = [
    normalisedTestSource({ providerId: "a", providerItemId: "1", title: "Arrival", mediaType: "movie", year: 2016, externalIds: {} }),
    normalisedTestSource({ providerId: "b", providerItemId: "2", title: " Arrival! ", mediaType: "movie", year: 2016, externalIds: {} }),
    normalisedTestSource({ providerId: "c", providerItemId: "3", title: "Arrival", mediaType: "movie", year: 2022, externalIds: {} }),
    normalisedTestSource({ providerId: "d", providerItemId: "4", title: "Arrival", mediaType: "movie", year: 2016, externalIds: { imdb: "tt9999999" } }),
    normalisedTestSource({ providerId: "e", providerItemId: "5", title: "Arrival", mediaType: "movie", year: 2016, externalIds: { imdb: "tt8888888" } }),
    normalisedTestSource({ providerId: "f", providerItemId: "6", title: "Arrival", mediaType: "series", year: 2016, externalIds: {} }),
    normalisedTestSource({ providerId: "g", providerItemId: "7", title: "Arrival", mediaType: "movie", year: null, externalIds: {} }),
  ];
  const groups = groupCatalogueRecords(records);
  assert.equal(groups.find(group => group.sources.some(source => source.providerId === "a")).sources.length, 2);
  assert.equal(groups.find(group => group.sources.some(source => source.providerId === "a")).matchConfidence, "fallback-title-year");
  assert.ok(groups.some(group => group.sources.some(source => source.providerId === "c") && group.sources.length === 1));
  assert.ok(groups.some(group => group.sources.some(source => source.providerId === "d") && group.sources.length === 1));
  assert.ok(groups.some(group => group.sources.some(source => source.providerId === "e") && group.sources.length === 1));
  assert.ok(groups.some(group => group.sources.some(source => source.providerId === "f") && group.sources.length === 1));
  assert.ok(groups.some(group => group.sources.some(source => source.providerId === "g") && group.sources.length === 1));
});

test("episodes only merge when season and episode coordinates match", () => {
  const makeEpisode = (providerId, providerItemId, episodeNumber) => ({
    sourceId: providerId + "::" + providerItemId,
    providerId,
    providerItemId,
    providerPriority: 1,
    title: "The Pilot",
    normalisedTitle: "the pilot",
    mediaType: "episode",
    year: 2024,
    externalIds: { imdb: "tt1234567" },
    seasonNumber: 1,
    episodeNumber,
    languageClaims: [],
  });
  const groups = groupCatalogueRecords([
    makeEpisode("one", "s1e1", 1),
    makeEpisode("two", "s1e1-alt", 1),
    makeEpisode("three", "s1e2", 2),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find(group => group.sources.some(source => source.providerId === "one")).sources.length, 2);
});

test("search concurrency stays within the configured bound", async () => {
  let active = 0;
  let peak = 0;
  const providers = Array.from({ length: 6 }, (_, index) => baseProvider({
    id: "p" + index,
    async search() {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active -= 1;
      return [movie({ providerItemId: "item-" + index, title: "Unique " + index, year: 2020 + index, externalIds: {} })];
    },
  }));

  const result = await aggregateSearch("example", providers, { timeoutMs: 500, concurrency: 2 });
  assert.equal(peak, 2);
  assert.equal(result.successfulProviders, 6);
});

test("player tracks cannot be attached to a title from an unrelated source", () => {
  const [title] = groupCatalogueRecords([
    normalisedTestSource({
      providerId: "one",
      providerItemId: "item-1",
      title: "Example",
      mediaType: "movie",
      year: 2024,
      externalIds: { imdb: "tt1234567" },
    }),
  ]);
  assert.throws(() => addVerifiedPlayerTracks(title, "two::item-2", [
    { type: "audio", languageCode: "en", language: "English" },
  ]), /does not belong/);
});

function normalisedTestSource(record) {
  const providerId = record.providerId || "fixture";
  const providerItemId = record.providerItemId || "id";
  const title = record.title;
  const mediaType = record.mediaType || "movie";
  const year = Number.isInteger(record.year) ? record.year : null;
  const externalIds = record.externalIds || {};
  const sourceId = record.sourceId || providerId + "::" + providerItemId;
  const languageClaims = record.languageClaims || [];
  return {
    sourceId,
    providerId,
    providerItemId,
    providerPriority: record.providerPriority ?? 1,
    title,
    normalisedTitle: normaliseTitle(title),
    mediaType,
    year,
    externalIds,
    seasonNumber: record.seasonNumber ?? null,
    episodeNumber: record.episodeNumber ?? null,
    languageClaims,
  };
}


function loadSharedIdentityFixtures() {
  const lines = readFileSync(new URL("./fixtures/identity-cases.tsv", import.meta.url), "utf8").split(/\r?\n/);
  const cases = new Map();

  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const fields = line.split("|");
    const [kind, caseId] = fields;
    const entry = cases.get(caseId) || { id: caseId, records: [], expected: null, languages: null };

    if (kind === "R") {
      const [, , providerId, providerItemId, title, mediaType, year, idsRaw, season, episode,
        languageCode, language, claimKind, evidence] = fields;
      const externalIds = {};
      for (const pair of (idsRaw || "").split(";").filter(Boolean)) {
        const splitAt = pair.indexOf("=");
        if (splitAt > 0) externalIds[pair.slice(0, splitAt)] = pair.slice(splitAt + 1);
      }
      const languageClaims = languageCode || language || claimKind
        ? [{
            languageCode: languageCode || null,
            language: language || null,
            kind: claimKind || "reported",
            evidence: evidence || "provider-metadata",
          }]
        : [];
      entry.records.push({
        providerId,
        item: {
          providerItemId,
          title,
          mediaType,
          year: year ? Number(year) : null,
          externalIds,
          seasonNumber: season ? Number(season) : null,
          episodeNumber: episode ? Number(episode) : null,
          languageClaims,
        },
      });
    } else if (kind === "E") {
      const [, , groupCount, groupSizes, confidences, canonicalIds, years, sourceConflicts] = fields;
      entry.expected = {
        groupCount: Number(groupCount),
        groupSizes,
        confidences,
        canonicalIds,
        years,
        sourceConflicts,
      };
    } else if (kind === "L") {
      entry.languages = (fields[2] || "").split(",").filter(Boolean).sort();
    } else {
      throw new Error("Unknown row in shared identity fixture: " + kind);
    }
    cases.set(caseId, entry);
  }

  return [...cases.values()];
}

for (const fixture of loadSharedIdentityFixtures()) {
  test("shared JS/Kotlin identity fixture: " + fixture.id, async () => {
    const byProvider = new Map();
    for (const record of fixture.records) {
      if (!byProvider.has(record.providerId)) byProvider.set(record.providerId, []);
      byProvider.get(record.providerId).push(record.item);
    }
    const providers = [...byProvider.entries()].map(([id, items]) => ({
      id,
      priority: 100,
      enabled: true,
      eligible: true,
      capabilities: { search: true },
      async search() { return items; },
    }));

    const result = await aggregateSearch("fixture", providers, { timeoutMs: 1_000, concurrency: 4 });
    assert.equal(result.results.length, fixture.expected.groupCount);
    assert.equal(result.results.map(title => title.sources.length).join(","), fixture.expected.groupSizes);
    assert.equal(result.results.map(title => title.matchConfidence).join(","), fixture.expected.confidences);
    assert.equal(result.results.map(title => title.canonicalId).join(","), fixture.expected.canonicalIds);
    assert.equal(result.results.map(title => String(title.year ?? "null")).join(","), fixture.expected.years);
    assert.equal(
      result.results.flatMap(title => title.sources.map(source => String(source.identityConflict === true))).join(","),
      fixture.expected.sourceConflicts,
    );
    if (fixture.languages) {
      const actualLanguages = [...new Set(
        result.results.flatMap(title => title.languageClaims.map(claim => claim.languageCode + ":" + claim.kind)),
      )].sort();
      assert.deepEqual(actualLanguages, fixture.languages);
    }
  });
}
