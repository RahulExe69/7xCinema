import { describe, expect, it } from "vitest";
import {
  buildJellyfinAuthorization,
  buildJellyfinPlayback,
  mapJellyfinItem,
  normalizeJellyfinBaseUrl,
} from "./jellyfin";

describe("Jellyfin personal-library adapter", () => {
  it("normalizes a valid server base URL without credentials, query, or fragment", () => {
    expect(normalizeJellyfinBaseUrl(" https://media.example.net/jellyfin/// "))
      .toBe("https://media.example.net/jellyfin");
    expect(() => normalizeJellyfinBaseUrl("javascript:alert(1)")).toThrow();
    expect(() => normalizeJellyfinBaseUrl("https://user:pass@media.example.net")).toThrow();
    expect(() => normalizeJellyfinBaseUrl("https://media.example.net/?api_key=secret")).toThrow();
  });

  it("maps movie and series metadata while keeping the Jellyfin item id separate", () => {
    const movie = mapJellyfinItem({
      Id: "movie-123", Type: "Movie", Name: "My Film", OriginalTitle: "My Film (Original)",
      ProductionYear: 2022, Overview: "Library description", CommunityRating: 7.9,
      Genres: ["Drama", "Mystery"], RunTimeTicks: 5_400_000_000,
      ProviderIds: { Tmdb: "27205", Imdb: "tt1375666" },
    });
    expect(movie).toMatchObject({
      id: "jellyfin:movie-123", libraryItemId: "movie-123",
      kind: "movie", title: "My Film", year: 2022,
      tmdbId: 27205, runtimeMinutes: 9, sources: ["jellyfin-library"],
      genres: ["Drama", "Mystery"],
    });
    const series = mapJellyfinItem({
      Id: "series-456", Type: "Series", Name: "My Series",
      ProviderIds: { Tmdb: "1399" },
    });
    expect(series).toMatchObject({ kind: "tv", libraryItemId: "series-456", tmdbId: 1399 });
  });

  it("creates a stream URL without embedding the session token", () => {
    const playback = buildJellyfinPlayback({
      baseUrl: "https://media.example.net/jellyfin",
      token: "0123456789abcdef0123456789abcdef",
      userId: "user-1",
      username: "Rahul",
    }, "item-1");
    expect(playback.url).toBe("https://media.example.net/jellyfin/Videos/item-1/stream?static=true");
    expect(playback.url).not.toContain("0123456789");
    expect(playback.headers.Authorization).toContain('Token="0123456789abcdef0123456789abcdef"');
  });

  it("constructs an encoded Jellyfin authorization header and rejects CRLF injection", () => {
    expect(buildJellyfinAuthorization("0123456789abcdef0123456789abcdef"))
      .toContain('Client="7xCinema"');
    expect(() => buildJellyfinAuthorization('bad"\r\nX-Evil: true')).toThrow();
  });
});
