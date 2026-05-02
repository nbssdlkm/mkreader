package com.mkreader.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

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
        FileReceiverPlugin plugin = getBridge().getPlugin(FileReceiverPlugin.class);
        if (plugin != null) {
            plugin.handleIntent(intent);
        }
    }
}
