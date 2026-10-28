import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativePlayerOptions {
  url: string;
  title: string;
  /** Resume position in milliseconds, used for the first source only. */
  startPositionMs?: number;
  /** Optional authenticated Jellyfin progress endpoint on the same server. */
  progressUrl?: string;
  /** Ordered, adapter-supplied fallback URLs tried after a player error. */
  fallbackUrls?: string[];
  headers?: Record<string, string>;
}

interface NativePlayerResult {
  opened: boolean;
  player: "androidx-media3";
}

interface NativePlayerPlugin {
  play(options: NativePlayerOptions): Promise<NativePlayerResult>;
}

export const NativePlayer = registerPlugin<NativePlayerPlugin>("SevenXCinemaPlayer");

export function isNativePlayerAvailable(): boolean {
  return Capacitor.getPlatform() === "android";
}
