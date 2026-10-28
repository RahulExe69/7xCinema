import { describe, expect, it } from "vitest";
import {
  authenticateJellyfin,
  buildJellyfinAuthorization,
  buildJellyfinPlayback,
  fetchJellyfinLibrary,
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

  it("authenticates without exposing the password in the URL and returns a session token", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(JSON.stringify({
        AccessToken: "0123456789abcdef0123456789abcdef",
        ServerId: "server-1",
        User: { Id: "user-1", Name: "Rahul" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    const session = await authenticateJellyfin(
      "https://media.example.net",
      "Rahul",
      "not-a-real-password",
      fakeFetch,
    );
    expect(requestedUrl).toBe("https://media.example.net/Users/AuthenticateByName");
    expect(requestedUrl).not.toContain("not-a-real-password");
    expect(requestedInit?.method).toBe("POST");
    expect(String(requestedInit?.body)).toContain('"Username":"Rahul"');
    expect(session).toMatchObject({ userId: "user-1", username: "Rahul", serverId: "server-1" });
    expect(session.token).toBe("0123456789abcdef0123456789abcdef");
  });

  it("loads a personal library with no search term and authenticates the request", async () => {
    let requestedUrl = "";
    let authorization = "";
    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      return new Response(JSON.stringify({ Items: [
        { Id: "movie-1", Type: "Movie", Name: "Library Film", ProductionYear: 2021, ProviderIds: { Tmdb: "1234" } },
        { Id: "series-1", Type: "Series", Name: "Library Show" },
      ] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    const session = {
      baseUrl: "https://media.example.net",
      token: "0123456789abcdef0123456789abcdef",
      userId: "user-1",
      username: "Rahul",
    };
    const items = await fetchJellyfinLibrary(session, undefined, 20, fakeFetch);
    expect(requestedUrl).toContain("/Users/user-1/Items?");
    expect(requestedUrl).not.toContain("SearchTerm");
    expect(requestedUrl).toContain("IncludeItemTypes=Movie%2CSeries");
    expect(authorization).toContain('Token="0123456789abcdef0123456789abcdef"');
    expect(items.map((item) => item.title)).toEqual(["Library Film", "Library Show"]);
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
