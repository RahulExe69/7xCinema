package com.sevenxcinema.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import org.json.JSONObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;

@CapacitorPlugin(name = "SevenXCinemaPlayer")
public final class Media3PlayerPlugin extends Plugin {
    @PluginMethod
    public void play(PluginCall call) {
        String mediaUrl = call.getString("url");
        String title = call.getString("title", "7xCinema");

        if (mediaUrl == null || mediaUrl.trim().isEmpty()) {
            call.reject("A direct media URL is required.");
            return;
        }

        final URI parsed;
        try {
            parsed = new URI(mediaUrl.trim());
        } catch (URISyntaxException error) {
            call.reject("The media URL is invalid.");
            return;
        }

        if (!isSafeMediaUrl(parsed)) {
            call.reject("Only HTTP(S) media URLs without embedded credentials are supported.");
            return;
        }

        String progressUrl = "";
        String requestedProgressUrl = call.getString("progressUrl");
        if (requestedProgressUrl != null && !requestedProgressUrl.trim().isEmpty()) {
            try {
                URI candidate = new URI(requestedProgressUrl.trim());
                if (isSafeMediaUrl(candidate) && sameOrigin(parsed, candidate)
                        && candidate.getRawQuery() == null && candidate.getRawFragment() == null
                        && candidate.getPath() != null
                        && candidate.getPath().matches(".*/Users/[A-Za-z0-9_-]{1,80}/PlayingItems/[A-Za-z0-9_-]{1,80}/Progress")) {
                    progressUrl = candidate.toASCIIString();
                }
            } catch (URISyntaxException ignored) {
                // Playback still works; malformed progress reporting is just disabled.
            }
        }

        final String safeProgressUrl = progressUrl;
        ArrayList<String> fallbackUrls = new ArrayList<>();
        JSArray fallbackArray = call.getArray("fallbackUrls");
        if (fallbackArray != null) {
            for (int index = 0; index < fallbackArray.length() && fallbackUrls.size() < 7; index++) {
                try {
                    String candidate = fallbackArray.getString(index);
                    URI fallbackUri = new URI(candidate);
                    if (isSafeMediaUrl(fallbackUri) && !fallbackUri.toASCIIString().equals(parsed.toASCIIString())
                            && !fallbackUrls.contains(fallbackUri.toASCIIString())) {
                        fallbackUrls.add(fallbackUri.toASCIIString());
                    }
                } catch (Exception ignored) {
                    // Skip malformed fallback candidates; never block the valid primary source.
                }
            }
        }

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getActivity(), NativePlayerActivity.class);
                intent.putExtra(NativePlayerActivity.EXTRA_URL, parsed.toASCIIString());
                intent.putExtra(NativePlayerActivity.EXTRA_TITLE, title == null ? "7xCinema" : title);
                JSObject options = call.getData();
                long resumePositionMs = options == null ? 0L : Math.max(0L, Math.min(options.optLong("startPositionMs", 0L), 604_800_000L));
                intent.putExtra(NativePlayerActivity.EXTRA_START_POSITION_MS, resumePositionMs);
                intent.putExtra(NativePlayerActivity.EXTRA_PROGRESS_URL, safeProgressUrl);
                intent.putStringArrayListExtra(NativePlayerActivity.EXTRA_FALLBACK_URLS, fallbackUrls);
                intent.putExtra(NativePlayerActivity.EXTRA_HEADERS, safePlaybackHeaders(call.getObject("headers")).toString());
                getActivity().startActivity(intent);

                JSObject result = new JSObject();
                result.put("opened", true);
                result.put("player", "androidx-media3");
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not open the native player.", error);
            }
        });
    }

    private static boolean sameOrigin(URI left, URI right) {
        if (!left.getScheme().equalsIgnoreCase(right.getScheme())
                || !left.getHost().equalsIgnoreCase(right.getHost())) return false;
        int leftPort = left.getPort() >= 0 ? left.getPort()
                : (left.getScheme().equalsIgnoreCase("https") ? 443 : 80);
        int rightPort = right.getPort() >= 0 ? right.getPort()
                : (right.getScheme().equalsIgnoreCase("https") ? 443 : 80);
        return leftPort == rightPort;
    }

    private static JSONObject safePlaybackHeaders(JSONObject headers) {
        JSONObject safe = new JSONObject();
        if (headers == null) return safe;
        // Only allow authentication headers used by configured media libraries.
        for (String allowed : new String[] {"Authorization", "X-Emby-Token", "Referer", "Origin", "User-Agent", "Cookie", "Accept", "Accept-Language", "X-Requested-With"}) {
            String value = headers.optString(allowed, "");
            if (!value.isEmpty() && value.length() <= 4096
                    && value.indexOf('\r') < 0 && value.indexOf('\n') < 0) {
                try {
                    safe.put(allowed, value);
                } catch (org.json.JSONException ignored) {
                    // Ignore malformed headers.
                }
            }
        }
        return safe;
    }

    private static boolean isSafeMediaUrl(URI uri) {
        String scheme = uri.getScheme();
        return uri.getHost() != null
                && scheme != null
                && (scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))
                && uri.getUserInfo() == null;
    }
}
