import type { MediaItem, PlaybackSource } from "../types";

export type PlaybackIntent =
  | { type: "direct"; url: string; fallbackUrls: string[] }
  | { type: "choose-source" };

function safeDirectUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol === "https:" || url.protocol === "http:")
      && Boolean(url.hostname)
      && !url.username
      && !url.password
    ) {
      return url.toString();
    }
  } catch {
    // Invalid URLs must not silently launch or masquerade as playable sources.
  }
  return null;
}

/**
 * A title may open straight into the player only when an adapter supplied an
 * actual direct HTTP(S) media URL. Source arrays preserve adapter priority and
 * provide fallback candidates; catalogue IDs and availability metadata do not.
 */
export function getPlaybackIntent(
  item: Pick<MediaItem, "playableUrl" | "playbackSources">,
): PlaybackIntent {
  const candidates = [
    ...(item.playbackSources ?? []).map((source: PlaybackSource) => source.url),
    item.playableUrl,
  ];
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const value of candidates) {
    const url = safeDirectUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  if (!urls.length) return { type: "choose-source" };
  return { type: "direct", url: urls[0], fallbackUrls: urls.slice(1) };
}
