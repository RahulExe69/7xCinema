package com.sevenxcinema.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
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

    private static boolean isSafeMediaUrl(URI uri) {
        String scheme = uri.getScheme();
        return uri.getHost() != null
                && scheme != null
                && (scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))
                && uri.getUserInfo() == null;
    }
}
