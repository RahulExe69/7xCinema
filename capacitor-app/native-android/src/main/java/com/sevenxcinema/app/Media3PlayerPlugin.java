package com.sevenxcinema.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.URI;
import java.net.URISyntaxException;

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

        String scheme = parsed.getScheme();
        if (parsed.getHost() == null
                || scheme == null
                || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))
                || parsed.getUserInfo() != null) {
            call.reject("Only HTTP(S) media URLs without embedded credentials are supported.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(getActivity(), NativePlayerActivity.class);
                intent.putExtra(NativePlayerActivity.EXTRA_URL, parsed.toASCIIString());
                intent.putExtra(NativePlayerActivity.EXTRA_TITLE, title == null ? "7xCinema" : title);
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
}
