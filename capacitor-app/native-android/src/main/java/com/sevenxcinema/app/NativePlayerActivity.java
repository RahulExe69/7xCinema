package com.sevenxcinema.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONException;
import org.json.JSONObject;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.Map;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class NativePlayerActivity extends Activity {
    public static final String EXTRA_URL = "com.sevenxcinema.app.MEDIA_URL";
    public static final String EXTRA_TITLE = "com.sevenxcinema.app.MEDIA_TITLE";
    public static final String EXTRA_FALLBACK_URLS = "com.sevenxcinema.app.MEDIA_FALLBACK_URLS";
    public static final String EXTRA_HEADERS = "com.sevenxcinema.app.MEDIA_HEADERS";
    public static final String EXTRA_START_POSITION_MS = "com.sevenxcinema.app.MEDIA_START_POSITION_MS";
    public static final String EXTRA_PROGRESS_URL = "com.sevenxcinema.app.MEDIA_PROGRESS_URL";

    private static final int BACKGROUND = Color.rgb(8, 10, 16);
    private static final int SURFACE = Color.rgb(22, 26, 37);
    private static final int ACCENT = Color.rgb(139, 255, 207);
    private static final int TEXT = Color.rgb(240, 243, 249);
    private static final int MUTED = Color.rgb(155, 164, 181);

    private ExoPlayer player;
    private PlayerView playerView;
    private TextView statusView;
    private String mediaUrl;
    private String mediaTitle;
    private String progressUrl;
    private long resumePositionMs = 0L;
    private final ArrayList<String> sourceUrls = new ArrayList<>();
    private final Map<String, String> requestHeaders = new LinkedHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService progressExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "7xCinema-JellyfinProgress");
        thread.setDaemon(true);
        return thread;
    });
    private int currentSourceIndex = 0;
    private boolean resumeAfterPause;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mediaUrl = getIntent().getStringExtra(EXTRA_URL);
        mediaTitle = getIntent().getStringExtra(EXTRA_TITLE);
        resumePositionMs = Math.max(0L, Math.min(getIntent().getLongExtra(EXTRA_START_POSITION_MS, 0L), 604_800_000L));
        if (!isSafeMediaUrl(mediaUrl)) {
            Toast.makeText(this, "The media URL is not valid.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        String requestedProgressUrl = getIntent().getStringExtra(EXTRA_PROGRESS_URL);
        progressUrl = isSafeProgressUrl(mediaUrl, requestedProgressUrl) ? requestedProgressUrl : null;
        sourceUrls.add(mediaUrl);
        ArrayList<String> fallbackUrls = getIntent().getStringArrayListExtra(EXTRA_FALLBACK_URLS);
        if (fallbackUrls != null) {
            for (String candidate : fallbackUrls) {
                if (sourceUrls.size() >= 8) break;
                if (isSafeMediaUrl(candidate) && !sourceUrls.contains(candidate)) sourceUrls.add(candidate);
            }
        }
        String rawHeaders = getIntent().getStringExtra(EXTRA_HEADERS);
        if (rawHeaders != null) {
            try {
                JSONObject headers = new JSONObject(rawHeaders);
                for (String allowed : new String[] {"Authorization", "X-Emby-Token"}) {
                    String value = headers.optString(allowed, "");
                    if (!value.isEmpty() && value.length() <= 4096
                            && value.indexOf('\r') < 0 && value.indexOf('\n') < 0) {
                        requestHeaders.put(allowed, value);
                    }
                }
            } catch (JSONException ignored) {
                // Invalid header metadata is discarded rather than logged.
            }
        }

        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(createLayout());
        initializePlayer();
        if (progressUrl != null) mainHandler.postDelayed(progressReporter, 15_000L);
    }

    private View createLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BACKGROUND);
        root.setPadding(dp(12), dp(8), dp(12), dp(10));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);

        Button close = styledButton("‹");
        close.setContentDescription("Close player");
        close.setTextSize(28);
        close.setMinWidth(dp(42));
        close.setOnClickListener(view -> finish());
        header.addView(close, new LinearLayout.LayoutParams(dp(45), dp(44)));

        TextView title = new TextView(this);
        title.setText(mediaTitle == null || mediaTitle.trim().isEmpty() ? "7xCinema Player" : mediaTitle);
        title.setTextColor(TEXT);
        title.setTextSize(16);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setMaxLines(2);
        title.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(48), 1);
        titleParams.leftMargin = dp(10);
        header.addView(title, titleParams);
        root.addView(header, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        statusView = new TextView(this);
        statusView.setText("Connecting to media…");
        statusView.setTextColor(MUTED);
        statusView.setTextSize(11);
        statusView.setPadding(dp(3), dp(4), dp(3), dp(7));
        root.addView(statusView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING);
        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
        playerView.setBackgroundColor(Color.BLACK);
        root.addView(playerView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));

        LinearLayout tracks = new LinearLayout(this);
        tracks.setGravity(Gravity.CENTER);
        tracks.setOrientation(LinearLayout.HORIZONTAL);
        tracks.setPadding(0, dp(9), 0, dp(2));

        Button audio = styledButton("♫  Audio tracks");
        audio.setOnClickListener(view -> showTrackPicker(C.TRACK_TYPE_AUDIO));
        Button subtitles = styledButton("CC  Subtitles");
        subtitles.setOnClickListener(view -> showTrackPicker(C.TRACK_TYPE_TEXT));
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(0, dp(46), 1);
        buttonParams.setMargins(dp(4), 0, dp(4), 0);
        tracks.addView(audio, buttonParams);
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(0, dp(46), 1);
        subtitleParams.setMargins(dp(4), 0, dp(4), 0);
        tracks.addView(subtitles, subtitleParams);
        root.addView(tracks, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(59)));

        TextView footnote = new TextView(this);
        footnote.setText("Tracks shown here come from the prepared player—not catalogue claims.");
        footnote.setTextColor(MUTED);
        footnote.setTextSize(9);
        footnote.setGravity(Gravity.CENTER);
        footnote.setPadding(0, dp(2), 0, dp(4));
        root.addView(footnote, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        return root;
    }

    private Button styledButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(label.equals("‹") ? TEXT : ACCENT);
        button.setTextSize(12);
        button.setAllCaps(false);
        GradientDrawable background = new GradientDrawable();
        background.setColor(SURFACE);
        background.setCornerRadius(dp(10));
        background.setStroke(dp(1), Color.rgb(47, 56, 69));
        button.setBackground(background);
        return button;
    }

    private void initializePlayer() {
        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory();
        if (!requestHeaders.isEmpty()) httpFactory.setDefaultRequestProperties(requestHeaders);
        DefaultDataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, httpFactory);
        DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(dataSourceFactory);
        player = new ExoPlayer.Builder(this).setMediaSourceFactory(mediaSourceFactory).build();
        player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build(), true);
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (statusView == null) return;
                switch (playbackState) {
                    case Player.STATE_BUFFERING:
                        statusView.setText("Buffering…");
                        break;
                    case Player.STATE_READY:
                        statusView.setText("Ready · Audio and subtitle tracks are read from the player");
                        break;
                    case Player.STATE_ENDED:
                        statusView.setText("Playback ended");
                        break;
                    default:
                        statusView.setText("Connecting to media…");
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                if (currentSourceIndex + 1 < sourceUrls.size()) {
                    currentSourceIndex++;
                    if (statusView != null) {
                        statusView.setText("Source failed · trying option "
                                + (currentSourceIndex + 1) + " of " + sourceUrls.size());
                    }
                    prepareSourceAtIndex(currentSourceIndex);
                    return;
                }
                if (statusView != null) {
                    statusView.setText("All available sources failed · " + error.getErrorCodeName());
                }
                Toast.makeText(NativePlayerActivity.this,
                        "All supplied source options failed on this device.", Toast.LENGTH_LONG).show();
            }
        });
        prepareSourceAtIndex(0);
    }

    private void prepareSourceAtIndex(int index) {
        if (player == null || index < 0 || index >= sourceUrls.size()) return;
        player.setMediaItem(buildMediaItem(sourceUrls.get(index)), index == 0 ? resumePositionMs : 0L);
        player.setPlayWhenReady(true);
        player.prepare();
    }

    private MediaItem buildMediaItem(String value) {
        Uri uri = Uri.parse(value);
        MediaItem.Builder item = new MediaItem.Builder().setUri(uri);
        String path = uri.getPath();
        if (path != null) {
            String lowerPath = path.toLowerCase(Locale.ROOT);
            if (lowerPath.endsWith(".m3u8")) {
                item.setMimeType(MimeTypes.APPLICATION_M3U8);
            } else if (lowerPath.endsWith(".mpd")) {
                item.setMimeType(MimeTypes.APPLICATION_MPD);
            } else if (lowerPath.endsWith(".ism") || lowerPath.endsWith(".isml")) {
                item.setMimeType(MimeTypes.APPLICATION_SS);
            }
        }
        return item.build();
    }

    private final Runnable progressReporter = new Runnable() {
        @Override
        public void run() {
            if (player == null || progressUrl == null || isFinishing()) return;
            final long positionTicks = Math.max(0L, player.getCurrentPosition()) * 10_000L;
            final boolean paused = !player.isPlaying();
            progressExecutor.execute(() -> postProgress(positionTicks, paused));
            mainHandler.postDelayed(this, 15_000L);
        }
    };

    private void postProgress(long positionTicks, boolean paused) {
        HttpURLConnection connection = null;
        try {
            String separator = progressUrl.contains("?") ? "&" : "?";
            URL url = new URL(progressUrl + separator
                    + "positionTicks=" + positionTicks
                    + "&isPaused=" + paused
                    + "&isMuted=false"
                    + "&playMethod=DirectPlay");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(5_000);
            connection.setReadTimeout(5_000);
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(0);
            connection.setRequestProperty("Accept", "application/json");
            String authorization = requestHeaders.get("Authorization");
            if (authorization != null && !authorization.isEmpty()) {
                connection.setRequestProperty("Authorization", authorization);
            }
            String embyToken = requestHeaders.get("X-Emby-Token");
            if (embyToken != null && !embyToken.isEmpty()) {
                connection.setRequestProperty("X-Emby-Token", embyToken);
            }
            connection.getResponseCode();
        } catch (Exception ignored) {
            // Playback must continue if the personal server is temporarily offline.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private boolean isSafeProgressUrl(String streamValue, String reportValue) {
        if (reportValue == null || reportValue.trim().isEmpty()) return false;
        try {
            URI stream = new URI(streamValue);
            URI report = new URI(reportValue);
            if (!isSafeMediaUrl(report) || report.getRawQuery() != null || report.getRawFragment() != null) return false;
            if (!stream.getScheme().equalsIgnoreCase(report.getScheme())
                    || !stream.getHost().equalsIgnoreCase(report.getHost())) return false;
            int streamPort = stream.getPort() >= 0 ? stream.getPort()
                    : (stream.getScheme().equalsIgnoreCase("https") ? 443 : 80);
            int reportPort = report.getPort() >= 0 ? report.getPort()
                    : (report.getScheme().equalsIgnoreCase("https") ? 443 : 80);
            if (streamPort != reportPort) return false;
            String path = report.getPath();
            return path != null && path.matches(".*/Users/[A-Za-z0-9_-]{1,80}/PlayingItems/[A-Za-z0-9_-]{1,80}/Progress");
        } catch (Exception error) {
            return false;
        }
    }

    private static final class TrackOption {
        final Tracks.Group group;
        final int index;
        final String label;
        final boolean selected;

        TrackOption(Tracks.Group group, int index, String label, boolean selected) {
            this.group = group;
            this.index = index;
            this.label = label;
            this.selected = selected;
        }
    }

    private void showTrackPicker(int trackType) {
        if (player == null) {
            showMessage("The player has not started yet.");
            return;
        }

        List<TrackOption> options = new ArrayList<>();
        int selectedIndex = -1;
        for (Tracks.Group group : player.getCurrentTracks().getGroups()) {
            if (group.getType() != trackType) continue;
            for (int trackIndex = 0; trackIndex < group.length; trackIndex++) {
                Format format = group.getTrackFormat(trackIndex);
                String label = trackLabel(format, trackType, options.size() + 1);
                boolean selected = group.isTrackSelected(trackIndex);
                options.add(new TrackOption(group, trackIndex, label, selected));
                if (selected) selectedIndex = options.size() - 1;
            }
        }

        if (options.isEmpty()) {
            showMessage(trackType == C.TRACK_TYPE_AUDIO
                    ? "No selectable audio tracks have been reported by this media."
                    : "No selectable subtitle tracks have been reported by this media.");
            return;
        }

        boolean isText = trackType == C.TRACK_TYPE_TEXT;
        List<String> labels = new ArrayList<>();
        if (isText) {
            labels.add("Off");
            selectedIndex = selectedIndex < 0 ? 0 : selectedIndex + 1;
        }
        for (TrackOption option : options) labels.add(option.label);

        new AlertDialog.Builder(this)
                .setTitle(isText ? "Subtitle tracks" : "Audio tracks")
                .setSingleChoiceItems(labels.toArray(new String[0]), selectedIndex, (dialog, which) -> {
                    if (isText && which == 0) {
                        player.setTrackSelectionParameters(
                                player.getTrackSelectionParameters().buildUpon()
                                        .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                                        .clearOverridesOfType(C.TRACK_TYPE_TEXT)
                                        .build());
                        updateTrackStatus("Subtitles off");
                    } else {
                        int optionIndex = isText ? which - 1 : which;
                        if (optionIndex >= 0 && optionIndex < options.size()) {
                            TrackOption option = options.get(optionIndex);
                            player.setTrackSelectionParameters(
                                    player.getTrackSelectionParameters().buildUpon()
                                            .setTrackTypeDisabled(trackType, false)
                                            .clearOverridesOfType(trackType)
                                            .setOverrideForType(new TrackSelectionOverride(
                                                    option.group.getMediaTrackGroup(),
                                                    Collections.singletonList(option.index)))
                                            .build());
                            updateTrackStatus((isText ? "Subtitle: " : "Audio: ") + option.label);
                        }
                    }
                    dialog.dismiss();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private String trackLabel(Format format, int trackType, int position) {
        String language = format.language;
        String languageLabel = "";
        if (language != null && !language.isEmpty() && !"und".equalsIgnoreCase(language)) {
            languageLabel = Locale.forLanguageTag(language).getDisplayLanguage(Locale.getDefault());
        }
        String label = format.label == null ? "" : format.label.trim();
        if (label.isEmpty() && languageLabel.isEmpty()) {
            label = "Track " + position;
        } else if (label.isEmpty()) {
            label = languageLabel;
        } else if (!languageLabel.isEmpty() && !label.equalsIgnoreCase(languageLabel)) {
            label = languageLabel + " · " + label;
        }

        if (trackType == C.TRACK_TYPE_AUDIO && format.channelCount > 0) {
            label += " · " + format.channelCount + "ch";
        } else if (trackType == C.TRACK_TYPE_TEXT && format.sampleMimeType != null) {
            String mime = format.sampleMimeType;
            int slash = mime.lastIndexOf('/');
            label += slash >= 0 ? " · " + mime.substring(slash + 1) : "";
        }
        return label;
    }

    private void updateTrackStatus(String message) {
        if (statusView != null) statusView.setText(message);
    }

    private void showMessage(String message) {
        new AlertDialog.Builder(this)
                .setTitle("Track selection")
                .setMessage(message)
                .setPositiveButton("OK", null)
                .show();
    }

    private boolean isSafeMediaUrl(String value) {
        if (value == null || value.trim().isEmpty()) return false;
        try {
            java.net.URI uri = new java.net.URI(value.trim());
            String scheme = uri.getScheme();
            return uri.getHost() != null
                    && scheme != null
                    && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    && uri.getUserInfo() == null;
        } catch (java.net.URISyntaxException error) {
            return false;
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onPause() {
        if (player != null) {
            resumeAfterPause = player.getPlayWhenReady();
            player.pause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (player != null && resumeAfterPause) {
            player.play();
            resumeAfterPause = false;
        }
    }

    @Override
    protected void onDestroy() {
        mainHandler.removeCallbacks(progressReporter);
        if (player != null && progressUrl != null) {
            long finalPositionTicks = Math.max(0L, player.getCurrentPosition()) * 10_000L;
            progressExecutor.execute(() -> postProgress(finalPositionTicks, true));
        }
        progressExecutor.shutdown();
        if (playerView != null) playerView.setPlayer(null);
        if (player != null) {
            player.release();
            player = null;
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onDestroy();
    }
}
