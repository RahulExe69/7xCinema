import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { buildJellyfinAuthorization, normalizeJellyfinBaseUrl, type JellyfinSession } from "./jellyfin";

const SESSION_KEY = "7xcinema-jellyfin-session";

function validateSession(value: unknown): JellyfinSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<JellyfinSession>;
  if (typeof raw.baseUrl !== "string" || typeof raw.token !== "string"
      || typeof raw.userId !== "string" || typeof raw.username !== "string") return null;
  try {
    return {
      baseUrl: normalizeJellyfinBaseUrl(raw.baseUrl),
      token: (buildJellyfinAuthorization(raw.token), raw.token),
      userId: raw.userId,
      username: raw.username,
      ...(typeof raw.serverId === "string" ? { serverId: raw.serverId } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Session tokens are persisted only on native platforms where SecureStorage
 * uses Android Keystore/iOS Keychain. The browser preview intentionally keeps
 * the token in memory rather than falling back to unencrypted localStorage.
 */
export async function restoreJellyfinSession(): Promise<JellyfinSession | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const raw = await SecureStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { await SecureStorage.removeItem(SESSION_KEY); return null; }
  const session = validateSession(parsed);
  if (!session) await SecureStorage.removeItem(SESSION_KEY);
  return session;
}

export async function persistJellyfinSession(session: JellyfinSession): Promise<boolean> {
  const valid = validateSession(session);
  if (!valid) throw new Error("The Jellyfin session was invalid; reconnect your library.");
  if (!Capacitor.isNativePlatform()) return false;
  await SecureStorage.setItem(SESSION_KEY, JSON.stringify(valid));
  return true;
}

export async function clearJellyfinSession(): Promise<void> {
  if (Capacitor.isNativePlatform()) await SecureStorage.removeItem(SESSION_KEY);
}
