import { describe, expect, it } from "vitest";
import { mapMovieboxCatalogEntry, type MovieboxCatalogEntry } from "./movieboxTui";

describe("MovieBox-TUI catalogue adapter", () => {
  it("preserves every provider-specific ID after server-side title merging", () => {
    const row: MovieboxCatalogEntry = {
      id: { provider: "moviebox", value: "movie-123" },
      title: "Example Film",
      media_type: "movie",
      year: "2024",
      poster_url: "https://images.example.test/poster.jpg",
      season_count: null,
      sources: [
        { provider: "moviebox", value: "movie-123" },
        { provider: "fourkhdhub", value: "film-456" },
        { provider: "dramachi", value: "dramachi-789" },
      ],
      languages: ["English", "Hindi", "Bengali", "Hindi"],
      provider_count: 3,
    };

    const item = mapMovieboxCatalogEntry(row);

    expect(item.title).toBe("Example Film");
    expect(item.year).toBe(2024);
    expect(item.sources).toEqual(["moviebox", "fourkhdhub", "dramachi"]);
    expect(item.providerItems).toEqual(row.sources);
    expect(item.providerItems).toHaveLength(3);
  });

  it("keeps provider-reported languages clearly marked as unverified metadata", () => {
    const row: MovieboxCatalogEntry = {
      id: { provider: "moviebox", value: "film-1" },
      title: "Language Test",
      media_type: "movie",
      languages: ["English", "Hindi", "Bengali", "Hindi"],
    };

    const item = mapMovieboxCatalogEntry(row);

    expect(item.languageClaims?.map((claim) => claim.language)).toEqual([
      "English",
      "Hindi",
      "Bengali",
    ]);
    expect(item.languageClaims?.every((claim) =>
      claim.kind === "reported"
      && claim.evidence === "provider-metadata"
      && !claim.selectable
    )).toBe(true);
  });

  it("maps series records without pretending they are direct-playable media", () => {
    const item = mapMovieboxCatalogEntry({
      id: { provider: "dramachi", value: "series-1" },
      title: "Example Series",
      media_type: "series",
      season_count: 2,
    });

    expect(item.kind).toBe("tv");
    expect(item.seasonCount).toBe(2);
    expect(item.playableUrl).toBeUndefined();
  });
});
