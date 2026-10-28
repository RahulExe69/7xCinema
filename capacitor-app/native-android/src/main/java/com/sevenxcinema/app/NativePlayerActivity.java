package com.sevenxcinema.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class NativePlayerActivity extends Activity {
    public static final String EXTRA_URL = "com.sevenxcinema.app.MEDIA_URL";
    public static final String EXTRA_TITLE = "com.sevenxcinema.app.MEDIA_TITLE";

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
    private boolean resumeAfterPause;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mediaUrl = getIntent().getStringExtra(EXTRA_URL);
        mediaTitle = getIntent().getStringExtra(EXTRA_TITLE);
        if (!isSafeMediaUrl(mediaUrl)) {
            Toast.makeText(this, "The media URL is not valid.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(createLayout());
        initializePlayer();
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
        player = new ExoPlayer.Builder(this).build();
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
                if (statusView != null) {
                    statusView.setText("Playback error · " + error.getErrorCodeName());
                }
                Toast.makeText(NativePlayerActivity.this,
                        "This source could not be played on this device.", Toast.LENGTH_LONG).show();
            }
        });

        Uri uri = Uri.parse(mediaUrl);
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
        player.setMediaItem(item.build());
        player.setPlayWhenReady(true);
        player.prepare();
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
        Uri uri = Uri.parse(value);
        String scheme = uri.getScheme();
        return uri.getHost() != null
                && scheme != null
                && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                && uri.getUserInfo() == null;
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
        if (playerView != null) playerView.setPlayer(null);
        if (player != null) {
            player.release();
            player = null;
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onDestroy();
    }
}
