package com.mkreader.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugin BEFORE super.onCreate() so it's included
        // in the Bridge builder. Capacitor's PluginManager only loads plugins
        // from capacitor.plugins.json (npm packages), not custom app plugins.
        registerPlugin(FileReceiverPlugin.class);

        super.onCreate(savedInstanceState);

        // After the Bridge is created, process any launch intent.
        // (onNewIntent already fires during BridgeActivity.load() for cold start,
        //  but we call it here too as a safety net for edge cases.)
        Intent intent = getIntent();
        if (intent != null) {
            Log.d(TAG, "onCreate intent action=" + intent.getAction() + " type=" + intent.getType());
            handleFileIntent(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "onNewIntent action=" + (intent != null ? intent.getAction() : "null")
            + " type=" + (intent != null ? intent.getType() : "null"));
        if (intent != null) {
            handleFileIntent(intent);
        }
    }

    private void handleFileIntent(Intent intent) {
        PluginHandle handle = getBridge().getPlugin("FileReceiver");
        if (handle == null) {
            Log.w(TAG, "FileReceiver plugin not found in bridge");
            return;
        }
        Object instance = handle.getInstance();
        if (instance instanceof FileReceiverPlugin) {
            ((FileReceiverPlugin) instance).handleIntent(intent);
        } else {
            Log.w(TAG, "FileReceiver plugin instance is not FileReceiverPlugin");
        }
    }
}
