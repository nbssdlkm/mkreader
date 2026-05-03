package com.mkreader.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Handle intent from app launch
        Intent intent = getIntent();
        if (intent != null) {
            handleFileIntent(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle intent when app is already running
        if (intent != null) {
            handleFileIntent(intent);
        }
    }

    private void handleFileIntent(Intent intent) {
        // Bridge.getPlugin takes the plugin id (matches @CapacitorPlugin name)
        // and returns a PluginHandle wrapper; .getInstance() yields the Plugin
        // instance which we cast to our concrete type.
        PluginHandle handle = getBridge().getPlugin("FileReceiver");
        if (handle == null) return;
        Object instance = handle.getInstance();
        if (instance instanceof FileReceiverPlugin) {
            ((FileReceiverPlugin) instance).handleIntent(intent);
        }
    }
}
