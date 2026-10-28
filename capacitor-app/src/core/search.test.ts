import { describe, expect, it, vi } from "vitest";
import { mergeResults, searchEveryProvider } from "./search";
import type { MediaItem, SearchProvider } from "../types";

const item = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: "tmdb:movie:10", tmdbId: 10, kind: "movie", title: "Example Film",
  originalTitle: "Example Film", year: 2024, overview: "A useful synopsis.",
  genreIds: [878], genres: ["Sci-Fi"], sources: ["fixture"], ...overrides,
});

describe("universal search core", () => {
  it("deduplicates a shared TMDB id and retains provider provenance", () => {
    const merged = mergeResults([
      item({ sources: ["alpha"], posterPath: "/poster.jpg" }),
      item({ title: "Another label", overview: "", sources: ["beta"], genreIds: [12], genres: ["Adventure"] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toEqual(["alpha", "beta"]);
    expect(merged[0].posterPath).toBe("/poster.jpg");
    expect(merged[0].genres).toEqual(["Sci-Fi", "Adventure"]);
  });

  it("merges language claims without erasing per-provider provenance", () => {
    const merged = mergeResults([
      item({ sources: ["alpha"], languageClaims: [
        { languageCode: "en", language: "English", kind: "reported", evidence: "provider-metadata", sourceId: "alpha:10", selectable: false },
      ] }),
      item({ sources: ["beta"], languageClaims: [
        { languageCode: "hi", language: "Hindi", kind: "dubbed-version", evidence: "provider-metadata", sourceId: "beta:10", selectable: false },
        { languageCode: "hi", language: "Hindi", kind: "dubbed-version", evidence: "provider-metadata", sourceId: "beta:10", selectable: false },
      ] }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].languageClaims).toHaveLength(2);
    expect(merged[0].languageClaims?.map((claim) => claim.sourceId)).toEqual(["alpha:10", "beta:10"]);
    expect(merged[0].languageClaims?.every((claim) => !claim.selectable)).toBe(true);
  });

  it("does not merge different explicit IDs or media types", () => {
    expect(mergeResults([
      item({ tmdbId: 1 }),
      item({ tmdbId: 2 }),
      item({ kind: "tv", tmdbId: 1 }),
    ])).toHaveLength(3);
  });

  it("searches all providers and keeps good results when one provider fails", async () => {
    const good: SearchProvider = { id: "good", label: "Good", search: vi.fn(async () => [item({ sources: [] })]) };
    const bad: SearchProvider = { id: "bad", label: "Bad", search: vi.fn(async () => { throw new Error("offline"); }) };
    const snapshot = await searchEveryProvider("Example", [good, bad]);
    expect(good.search).toHaveBeenCalledOnce();
    expect(bad.search).toHaveBeenCalledOnce();
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.providers.map((provider) => provider.state)).toEqual(["success", "error"]);
    expect(snapshot.providers[1].message).toBe("offline");
  });

  it("emits progressive snapshots as providers complete", async () => {
    const updates: number[] = [];
    const slow: SearchProvider = { id: "slow", label: "Slow", search: async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return [item({ sources: [] })];
    } };
    const fast: SearchProvider = { id: "fast", label: "Fast", search: async () => [item({ tmdbId: 20, id: "tmdb:movie:20", sources: [] })] };
    const snapshot = await searchEveryProvider("Example", [slow, fast], (next) => updates.push(next.results.length));
    expect(snapshot.results).toHaveLength(2);
    expect(updates.length).toBeGreaterThanOrEqual(3);
  });

  it("times out one provider without cancelling successful siblings", async () => {
    const slow: SearchProvider = { id: "slow", label: "Slow", search: (_query, signal) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve([item({ sources: [] })]), 100);
      signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); });
    }) };
    const quick: SearchProvider = { id: "quick", label: "Quick", search: async () => [item({ tmdbId: 20, id: "tmdb:movie:20", sources: [] })] };
    const snapshot = await searchEveryProvider("Example", [slow, quick], undefined, 10);
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.providers[0].state).toBe("timeout");
    expect(snapshot.providers[1].state).toBe("success");
  });
});
