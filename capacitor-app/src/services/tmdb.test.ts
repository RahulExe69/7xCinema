import { describe, expect, it } from "vitest";
import { selectOfficialTrailerUrl } from "./tmdb";

describe("official trailer selection", () => {
  it("prefers an official YouTube trailer over an unofficial newer one", () => {
    const url = selectOfficialTrailerUrl([
      { key: "NewerFake01", site: "YouTube", type: "Trailer", official: false, published_at: "2026-01-01" },
      { key: "Official7x1", site: "YouTube", type: "Trailer", official: true, published_at: "2024-01-01" },
    ]);
    expect(url).toBe("https://www.youtube.com/watch?v=Official7x1");
  });

  it("prefers a trailer over a teaser when official status is equal", () => {
    expect(selectOfficialTrailerUrl([
      { key: "Teaser1234", site: "YouTube", type: "Teaser", official: true, published_at: "2026-01-01" },
      { key: "Trailer123", site: "YouTube", type: "Trailer", official: true, published_at: "2024-01-01" },
    ])).toBe("https://www.youtube.com/watch?v=Trailer123");
  });

  it("ignores non-YouTube videos and malformed keys", () => {
    expect(selectOfficialTrailerUrl([
      { key: "someKey999", site: "Vimeo", type: "Trailer", official: true },
      { key: "bad key", site: "YouTube", type: "Trailer", official: true },
    ])).toBeNull();
  });

  it("returns no fabricated trailer when the catalogue has none", () => {
    expect(selectOfficialTrailerUrl([])).toBeNull();
    expect(selectOfficialTrailerUrl([{ key: "MusicVideo12", site: "YouTube", type: "Music", official: true }])).toBeNull();
  });
});
