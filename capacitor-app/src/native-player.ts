import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativePlayerOptions {
  url: string;
  title: string;
  /** Ordered, adapter-supplied fallback URLs tried after a player error. */
  fallbackUrls?: string[];
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
