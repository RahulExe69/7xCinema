import { describe, expect, it } from "vitest";
import { getPlaybackIntent } from "./playback";

describe("playback intent", () => {
  it("opens directly when an adapter supplies a valid playable URL", () => {
    expect(getPlaybackIntent({ playableUrl: "https://archive.org/download/example/movie.mp4" }))
      .toEqual({ type: "direct", url: "https://archive.org/download/example/movie.mp4", fallbackUrls: [] });
  });

  it("preserves valid fallback sources in their declared priority order", () => {
    expect(getPlaybackIntent({
      playableUrl: "https://archive.org/download/example/large.mp4",
      playbackSources: [
        { id: "low", providerId: "archive", label: "Small copy", url: "https://archive.org/download/example/small.mp4", type: "mp4" },
        { id: "bad", providerId: "archive", label: "Unsafe", url: "javascript:alert(1)", type: "mp4" },
        { id: "high", providerId: "archive", label: "Large copy", url: "https://archive.org/download/example/large.mp4", type: "mp4" },
      ],
    })).toEqual({
      type: "direct",
      url: "https://archive.org/download/example/small.mp4",
      fallbackUrls: ["https://archive.org/download/example/large.mp4"],
    });
  });

  it("shows source choices rather than a paste box when metadata has no media URL", () => {
    expect(getPlaybackIntent({ playableUrl: undefined })).toEqual({ type: "choose-source" });
    expect(getPlaybackIntent({ playableUrl: "" })).toEqual({ type: "choose-source" });
  });

  it("does not trust invalid schemes or URLs with embedded credentials", () => {
    expect(getPlaybackIntent({ playableUrl: "javascript:alert(1)" })).toEqual({ type: "choose-source" });
    expect(getPlaybackIntent({ playableUrl: "https://user:password@example.com/video.mp4" }))
      .toEqual({ type: "choose-source" });
    expect(getPlaybackIntent({ playableUrl: "not a URL" })).toEqual({ type: "choose-source" });
  });
});
