package com.mkreader.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "FileReceiver")
public class FileReceiverPlugin extends Plugin {

    private static final String TAG = "FileReceiver";

    /**
     * Handle incoming Android Intent (VIEW or SEND action).
     * Writes file content to app sandbox and stores metadata to pending.json.
     * Called from MainActivity.onCreate / onNewIntent.
     */
    public void handleIntent(Intent intent) {
        if (intent == null) return;

        Uri uri = null;
        String action = intent.getAction();

        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }

        if (uri == null) return;

        Log.d(TAG, "Handling intent with URI: " + uri.toString());

        InputStream inputStream = null;
        BufferedReader reader = null;
        FileWriter fw = null;

        try {
            inputStream = getContext().getContentResolver().openInputStream(uri);
            reader = new BufferedReader(new InputStreamReader(inputStream));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }

            String content = sb.toString();
            String fileName = getFileName(uri);

            File outputDir = new File(getContext().getFilesDir(), "opened");
            outputDir.mkdirs();
            File outputFile = new File(outputDir, fileName);
            fw = new FileWriter(outputFile);
            fw.write(content);
            fw.close();
            fw = null;

            // Save metadata so JS can read it when ready
            savePendingMetadata(outputFile.getAbsolutePath(), fileName, outputFile.length());

            Log.d(TAG, "File saved: " + outputFile.getAbsolutePath());

            // Also try to notify listeners (works when app is already open)
            JSObject ret = new JSObject();
            ret.put("uri", outputFile.getAbsolutePath());
            ret.put("name", fileName);
            ret.put("size", outputFile.length());
            notifyListeners("fileOpen", ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to handle file intent", e);
        } finally {
            try { if (fw != null) fw.close(); } catch (Exception ignored) {}
            try { if (reader != null) reader.close(); } catch (Exception ignored) {}
            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
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

        try {
            BufferedReader reader = new BufferedReader(new FileReader(pendingFile));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();

            pendingFile.delete();

            JSObject result = new JSObject(sb.toString());
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to read pending file", e);
            call.reject("Failed to read pending file");
        }
    }

    private void savePendingMetadata(String uri, String name, long size) {
        File pendingFile = new File(getContext().getFilesDir(), "pending_intent.json");
        FileWriter fw = null;
        try {
            String json = "{\"uri\":\"" + escapeJson(uri)
                + "\",\"name\":\"" + escapeJson(name)
                + "\",\"size\":" + size + "}";
            fw = new FileWriter(pendingFile);
            fw.write(json);
        } catch (Exception e) {
            Log.e(TAG, "Failed to save pending metadata", e);
        } finally {
            try { if (fw != null) fw.close(); } catch (Exception ignored) {}
        }
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String getFileName(Uri uri) {
        String name = uri.getLastPathSegment();
        if (name != null && (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt"))) {
            return name;
        }
        return "received.md";
    }
}
