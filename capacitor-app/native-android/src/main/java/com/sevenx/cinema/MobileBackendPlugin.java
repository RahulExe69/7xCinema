package com.sevenx.cinema;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MobileBackend")
public final class MobileBackendPlugin extends Plugin {
    private static final ExecutorService BACKEND_EXECUTOR = Executors.newSingleThreadExecutor();
    private static volatile boolean libraryLoaded;

    private static synchronized boolean ensureLibraryLoaded() {
        if (libraryLoaded) return true;
        try {
            System.loadLibrary("moviebox_tui");
            libraryLoaded = true;
            return true;
        } catch (LinkageError error) {
            return false;
        }
    }

    private static native String nativeStartServer();
    private static native void nativeStopServer();

    @PluginMethod
    public void start(PluginCall call) {
        BACKEND_EXECUTOR.execute(() -> {
            if (!ensureLibraryLoaded()) {
                call.reject("The MovieBox-TUI provider engine is not bundled in this APK. Rebuild the Android package.");
                return;
            }
            try {
                org.json.JSONObject config = new org.json.JSONObject(nativeStartServer());
                if (config.has("error")) {
                    call.reject("Could not start the on-device provider service: " + config.optString("error"));
                    return;
                }
                String baseUrl = config.optString("baseUrl", "");
                String token = config.optString("token", "");
                if (!baseUrl.matches("http://127\\.0\\.0\\.1:[0-9]{1,5}") || token.length() < 32) {
                    call.reject("The on-device provider service returned an invalid local connection.");
                    return;
                }
                JSObject result = new JSObject();
                result.put("baseUrl", baseUrl);
                result.put("token", token);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not start the on-device provider service.", error);
            } catch (LinkageError error) {
                call.reject("The bundled MovieBox-TUI native engine could not start.");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        BACKEND_EXECUTOR.execute(() -> {
            if (!ensureLibraryLoaded()) {
                call.resolve();
                return;
            }
            try {
                nativeStopServer();
                call.resolve();
            } catch (Exception error) {
                call.reject("Could not stop the on-device provider service.", error);
            } catch (LinkageError error) {
                call.reject("The native provider engine is unavailable.");
            }
        });
    }
}
