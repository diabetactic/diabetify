package io.diabetactic.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import de.kisimedia.plugins.widgetbridgeplugin.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerPlugin(WidgetBridgePlugin.class);
    }
}
