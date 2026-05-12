package com.mkreader.app;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@CapacitorPlugin(name = "FileReceiver")
public class FileReceiverPlugin extends Plugin {

    private static final String TAG = "FileReceiver";

    /**
     * Handle incoming Android Intent (VIEW or SEND action).
     * Supports:
     *   - ACTION_VIEW with content:// or file:// URI (file managers, WeChat "open with")
     *   - ACTION_SEND with EXTRA_STREAM (WeChat share, other apps)
     *   - ACTION_SEND with EXTRA_TEXT (plain text fallback)
     *
     * Writes file content to app sandbox and stores metadata to pending.json.
     * Called from MainActivity.onCreate / onNewIntent.
     */
    public void handleIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        String type = intent.getType();
        Log.d(TAG, "handleIntent action=" + action + " type=" + type);

        Uri uri = resolveUri(intent);

        if (uri == null) {
            // Fallback: try EXTRA_TEXT for plain text sharing
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.isEmpty()) {
                // Use subject as filename hint, fallback to shared.md
                String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
                String fileName = (subject != null && !subject.isEmpty())
                    ? sanitizeName(subject.endsWith(".md") ? subject : subject + ".md")
                    : "shared.md";
                Log.d(TAG, "Falling back to EXTRA_TEXT, length=" + sharedText.length() + " file=" + fileName);
                saveContent(sharedText, fileName);
                return;
            }
            Log.w(TAG, "No URI or text found in intent, ignoring");
            return;
        }

        Log.d(TAG, "Resolved URI: " + uri.toString() + " scheme=" + uri.getScheme());

        // Read content from the URI
        String content = readContentFromUri(uri);
        if (content == null) return;

        String fileName = getFileName(uri, intent);
        saveContent(content, fileName);
    }

    /**
     * Try multiple strategies to extract a file URI from the intent.
     */
    private Uri resolveUri(Intent intent) {
        String action = intent.getAction();

        // Strategy 1: ACTION_VIEW → getData()
        if (Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data != null) return data;
        }

        // Strategy 2: ACTION_SEND → EXTRA_STREAM (single file)
        if (Intent.ACTION_SEND.equals(action)) {
            Uri stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream != null) return stream;
        }

        // Strategy 3: ACTION_SEND_MULTIPLE → take first clip
        if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                ClipData clip = intent.getClipData();
                if (clip != null && clip.getItemCount() > 0) {
                    return clip.getItemAt(0).getUri();
                }
            }
        }

        // Strategy 4: Check getData() regardless of action (some apps set data differently)
        Uri data = intent.getData();
        if (data != null) return data;

        return null;
    }

    /**
     * Read text content from a content:// or file:// URI into a String.
     * Returns null on failure.
     */
    private String readContentFromUri(Uri uri) {
        InputStream inputStream = null;
        BufferedReader reader = null;
        try {
            // Handle file:// URIs directly (Android 9- or file managers)
            if ("file".equals(uri.getScheme())) {
                String filePath = uri.getPath();
                if (filePath != null) {
                    File file = new File(filePath);
                    if (file.exists()) {
                        inputStream = new java.io.FileInputStream(file);
                        reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line).append("\n");
                        }
                        String content = sb.toString();
                        Log.d(TAG, "Read " + content.length() + " chars from file:// URI: " + filePath);
                        return content;
                    }
                    Log.w(TAG, "File does not exist: " + filePath);
                }
                return null;
            }

            // Handle content:// URIs via ContentResolver
            inputStream = getContext().getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                Log.e(TAG, "openInputStream returned null for URI: " + uri);
                return copyViaContentResolver(uri);
            }
            reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            String content = sb.toString();
            Log.d(TAG, "Read " + content.length() + " chars from content:// URI");
            return content;
        } catch (Exception e) {
            Log.e(TAG, "Failed to read from URI: " + uri, e);
            return null;
        } finally {
            try { if (reader != null) reader.close(); } catch (Exception ignored) {}
            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
        }
    }

    /**
     * Some content providers fail with openInputStream but work with
     * ContentResolver.openFileDescriptor + copy.
     */
    private String copyViaContentResolver(Uri uri) {
        try {
            android.content.res.AssetFileDescriptor afd =
                getContext().getContentResolver().openAssetFileDescriptor(uri, "r");
            if (afd == null) {
                Log.e(TAG, "openAssetFileDescriptor returned null");
                return null;
            }
            File tmpFile = new File(getContext().getCacheDir(), "tmp_" + UUID.randomUUID().toString());
            InputStream in = null;
            OutputStream out = null;
            try {
                in = afd.createInputStream();
                out = new java.io.FileOutputStream(tmpFile);
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
                out.close(); out = null;
                in.close(); in = null;
                afd.close();

                // Now read the temp file with UTF-8
                StringBuilder sb = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(new FileInputStream(tmpFile), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                }
                tmpFile.delete();
                return sb.toString();
            } finally {
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { afd.close(); } catch (Exception ignored) {}
                tmpFile.delete();
            }
        } catch (Exception e) {
            Log.e(TAG, "copyViaContentResolver also failed", e);
            return null;
        }
    }

    /**
     * Save content to app internal storage and notify JS.
     */
    private void saveContent(String content, String fileName) {
        if (content == null || content.isEmpty()) {
            Log.w(TAG, "saveContent called with empty content");
            return;
        }

        File outputDir = getContext().getFilesDir();
        File outputFile = new File(outputDir, fileName);

        OutputStreamWriter fw = null;
        try {
            fw = new OutputStreamWriter(new FileOutputStream(outputFile), StandardCharsets.UTF_8);
            fw.write(content);
            fw.close();
            fw = null;

            Log.d(TAG, "File saved: " + outputFile.getAbsolutePath() + " (" + outputFile.length() + " bytes)");

            // Save metadata so JS can read it when ready (cold start scenario)
            savePendingMetadata(outputFile.getAbsolutePath(), fileName, outputFile.length());

            // Notify JS listeners (warm start scenario)
            JSObject ret = new JSObject();
            ret.put("uri", outputFile.getAbsolutePath());
            ret.put("name", fileName);
            ret.put("size", outputFile.length());
            notifyListeners("fileOpen", ret);
            Log.d(TAG, "Notified listeners of fileOpen event");
        } catch (Exception e) {
            Log.e(TAG, "Failed to save file content", e);
        } finally {
            try { if (fw != null) fw.close(); } catch (Exception ignored) {}
        }
    }

    /**
     * Called by JS on startup to check if a file was opened while the app was cold-starting.
     */
    @PluginMethod
    public void checkPendingFile(PluginCall call) {
        File pendingFile = new File(getContext().getFilesDir(), "pending_intent.json");
        if (!pendingFile.exists()) {
            call.resolve();
            return;
        }

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(pendingFile), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to read pending file", e);
            call.reject("Failed to read pending file");
            return;
        }

        // Parse AFTER successful read, then delete
        try {
            JSObject result = new JSObject(sb.toString());
            pendingFile.delete();
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse pending file JSON", e);
            call.reject("Failed to parse pending file");
        }
    }

    /**
     * Share a file from app private storage via FileProvider.
     * Expects JS to pass { path: "/data/data/.../file.md", name: "file.md" }.
     */
    @PluginMethod
    public void shareFile(PluginCall call) {
        String path = call.getString("path");
        String name = call.getString("name", "shared.md");

        if (path == null) {
            call.reject("Missing path parameter");
            return;
        }

        File file = new File(path);
        if (!file.exists()) {
            Log.w(TAG, "shareFile: file not found: " + path);
            call.reject("File not found");
            return;
        }

        try {
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/octet-stream");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, name);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, "分享 Markdown 文件");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            Log.d(TAG, "shareFile: launched chooser for " + name);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "shareFile failed", e);
            call.reject("Share failed: " + e.getMessage());
        }
    }

    private void savePendingMetadata(String uri, String name, long size) {
        File pendingFile = new File(getContext().getFilesDir(), "pending_intent.json");
        OutputStreamWriter fw = null;
        try {
            String json = "{\"uri\":\"" + escapeJson(uri)
                + "\",\"name\":\"" + escapeJson(name)
                + "\",\"size\":" + size + "}";
            fw = new OutputStreamWriter(new FileOutputStream(pendingFile), StandardCharsets.UTF_8);
            fw.write(json);
            Log.d(TAG, "Saved pending metadata: " + json);
        } catch (Exception e) {
            Log.e(TAG, "Failed to save pending metadata", e);
        } finally {
            try { if (fw != null) fw.close(); } catch (Exception ignored) {}
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    /**
     * Extract a usable filename from the URI or intent.
     * WeChat content URIs often have opaque paths (e.g. /external/123),
     * so we check the intent's EXTRA_TEXT subject/title as a hint.
     */
    private String getFileName(Uri uri, Intent intent) {
        // Try to get display name from content resolver
        String displayName = null;
        if ("content".equals(uri.getScheme())) {
            android.database.Cursor cursor = null;
            try {
                cursor = getContext().getContentResolver().query(
                    uri, new String[]{android.provider.OpenableColumns.DISPLAY_NAME},
                    null, null, null);
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) {
                        displayName = cursor.getString(idx);
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to query display name", e);
            } finally {
                if (cursor != null) cursor.close();
            }
        }

        if (displayName != null && !displayName.isEmpty()) {
            Log.d(TAG, "Got display name from content resolver: " + displayName);
            return sanitizeName(displayName);
        }

        // Fall back to last path segment (URL-decoded for safety)
        String name = uri.getLastPathSegment();
        if (name != null) {
            try { name = URLDecoder.decode(name, "UTF-8"); } catch (Exception ignored) {}
            if (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt")) {
                return sanitizeName(name);
            }
        }

        // Check if intent has a subject/title hint
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (subject != null) {
            String clean = subject.replaceAll("[\\\\/:*?\"<>|]", "_");
            if (clean.endsWith(".md") || clean.endsWith(".markdown") || clean.endsWith(".txt")) {
                return sanitizeName(clean);
            }
            return sanitizeName(clean + ".md");
        }

        return "received_" + System.currentTimeMillis() + ".md";
    }

    /** Remove characters unsafe for filenames. */
    private String sanitizeName(String name) {
        if (name == null) return "received.md";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }
}
