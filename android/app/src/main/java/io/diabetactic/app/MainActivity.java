package io.diabetactic.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import com.kis.capacitor.widget.bridge.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerPlugin(WidgetBridgePlugin.class);
    }
}
