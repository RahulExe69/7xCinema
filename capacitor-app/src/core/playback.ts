import type { MediaItem } from "../types";

export type PlaybackIntent =
  | { type: "direct"; url: string }
  | { type: "choose-source" };

/**
 * A title may open straight into the player only when an actual direct HTTP(S)
 * media URL was supplied by a provider. Catalogue IDs, posters and watch-provider
 * metadata are not playback sources.
 */
export function getPlaybackIntent(item: Pick<MediaItem, "playableUrl">): PlaybackIntent {
  const value = item.playableUrl?.trim();
  if (!value) return { type: "choose-source" };

  try {
    const url = new URL(value);
    if (
      (url.protocol === "https:" || url.protocol === "http:")
      && Boolean(url.hostname)
      && !url.username
      && !url.password
    ) {
      return { type: "direct", url: url.toString() };
    }
  } catch {
    // Invalid URLs must not silently launch or masquerade as playable sources.
  }
  return { type: "choose-source" };
}
