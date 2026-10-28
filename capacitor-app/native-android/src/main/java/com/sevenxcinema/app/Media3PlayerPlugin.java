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

    private static JSONObject safePlaybackHeaders(JSONObject headers) {
        JSONObject safe = new JSONObject();
        if (headers == null) return safe;
        // Only allow authentication headers used by configured media libraries.
        for (String allowed : new String[] {"Authorization", "X-Emby-Token"}) {
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
