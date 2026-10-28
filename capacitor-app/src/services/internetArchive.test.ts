import { describe, expect, it } from "vitest";
import { chooseArchiveMp4, isExplicitOpenLicense } from "./internetArchive";

describe("Internet Archive open-license gate", () => {
  it("accepts only explicit Creative Commons Public Domain Mark and CC0 declarations", () => {
    expect(isExplicitOpenLicense("https://creativecommons.org/publicdomain/mark/1.0/")).toBe(true);
    expect(isExplicitOpenLicense("http://creativecommons.org/publicdomain/zero/1.0/")).toBe(true);
    expect(isExplicitOpenLicense(["copyright", "https://creativecommons.org/publicdomain/zero/1.0/"])).toBe(true);
  });

  it("rejects non-commercial, non-derivative, unknown-host, and malformed licence values", () => {
    expect(isExplicitOpenLicense("https://creativecommons.org/licenses/by-nc/4.0/")).toBe(false);
    expect(isExplicitOpenLicense("https://creativecommons.org/licenses/by-nd/4.0/")).toBe(false);
    expect(isExplicitOpenLicense("https://evil.example/publicdomain/mark/1.0/")).toBe(false);
    expect(isExplicitOpenLicense("not a url")).toBe(false);
    expect(isExplicitOpenLicense(undefined)).toBe(false);
  });

  it("chooses the largest compatible MP4 and ignores preview/sample files", () => {
    const file = chooseArchiveMp4([
      { name: "movie_sample.mp4", format: "MPEG4", size: "1000" },
      { name: "thumb.mp4", format: "MPEG4", size: "2000" },
      { name: "movie.mp4", format: "MPEG4", size: "9000" },
      { name: "movie-720p.mp4", format: "MPEG4", size: "20000" },
      { name: "../outside.mp4", format: "MPEG4", size: "999999" },
      { name: "folder/../outside.mp4", format: "MPEG4", size: "888888" },
      { name: "movie.avi", format: "AVI", size: "30000" },
    ]);
    expect(file?.name).toBe("movie-720p.mp4");
  });

  it("returns no file when no compatible MP4 exists", () => {
    expect(chooseArchiveMp4([{ name: "movie.avi", format: "AVI", size: "30000" }])).toBeUndefined();
  });
});
