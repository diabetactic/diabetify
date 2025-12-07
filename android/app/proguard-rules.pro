# Diabetactic ProGuard Rules for Production Release
# Critical for Capacitor HTTP plugin to work in release builds
# Generated: 2025-12-06

# ============================================================================
# 1. CAPACITOR CORE - Prevent removal of JavaScript bridge
# ============================================================================
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Keep all Capacitor plugin classes and their methods
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# Keep all classes with @CapacitorPlugin annotation
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Keep PluginCall and JSObject (critical for HTTP responses)
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }
-keepclassmembers class com.getcapacitor.JSObject { *; }
-keepclassmembers class com.getcapacitor.JSArray { *; }

# Keep all JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================================================
# 2. CAPACITOR HTTP PLUGIN - Critical for API requests
# ============================================================================
-keep class com.capacitorjs.plugins.http.** { *; }
-keepclassmembers class com.capacitorjs.plugins.http.** { *; }
-dontwarn com.capacitorjs.plugins.http.**

# ============================================================================
# 3. CAPACITOR PLUGINS - Keep all installed plugins
# ============================================================================
# Preferences (token storage)
-keep class com.capacitorjs.plugins.preferences.** { *; }
-keepclassmembers class com.capacitorjs.plugins.preferences.** { *; }

# Secure Storage (encrypted credentials)
-keep class com.aparajita.capacitor.securestorage.** { *; }
-keepclassmembers class com.aparajita.capacitor.securestorage.** { *; }

# Network (connectivity detection)
-keep class com.capacitorjs.plugins.network.** { *; }
-keepclassmembers class com.capacitorjs.plugins.network.** { *; }

# Local Notifications
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-keepclassmembers class com.capacitorjs.plugins.localnotifications.** { *; }

# Splash Screen
-keep class com.capacitorjs.plugins.splashscreen.** { *; }

# Status Bar
-keep class com.capacitorjs.plugins.statusbar.** { *; }

# Haptics
-keep class com.capacitorjs.plugins.haptics.** { *; }

# Keyboard
-keep class com.capacitorjs.plugins.keyboard.** { *; }

# Browser
-keep class com.capacitorjs.plugins.browser.** { *; }

# Device
-keep class com.capacitorjs.plugins.device.** { *; }

# App
-keep class com.capacitorjs.plugins.app.** { *; }

# ============================================================================
# 4. WEBVIEW & JAVASCRIPT BRIDGE
# ============================================================================
-keep class android.webkit.WebView { *; }
-keepclassmembers class android.webkit.WebView { *; }
-keep class android.webkit.WebViewClient { *; }
-keep class android.webkit.WebChromeClient { *; }

# Keep WebView JavaScript interfaces
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
}

# JavaScript interface annotation
-keepattributes JavascriptInterface

# ============================================================================
# 5. OKHTTP / NETWORKING (used by Capacitor HTTP)
# ============================================================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }
-keepclasseswithmembers class okhttp3.** { *; }

# ============================================================================
# 6. GSON / JSON SERIALIZATION (for API responses)
# ============================================================================
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# Keep generic signature of classes (for type safety)
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# ============================================================================
# 7. CORDOVA COMPATIBILITY (for older plugins)
# ============================================================================
-keep class org.apache.cordova.** { *; }
-keepclassmembers class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

-keep public class * extends org.apache.cordova.CordovaPlugin {
    public <methods>;
}

# ============================================================================
# 8. NATIVE METHODS & REFLECTION
# ============================================================================
-keepclasseswithmembernames class * {
    native <methods>;
}

-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ============================================================================
# 9. PARCELABLE & SERIALIZABLE
# ============================================================================
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# 10. ENUMS
# ============================================================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============================================================================
# 11. ANDROID COMPONENTS
# ============================================================================
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep Fragment constructors
-keepclassmembers class * extends androidx.fragment.app.Fragment {
    public <init>(...);
}

# ============================================================================
# 12. DEBUGGING & CRASH REPORTING
# ============================================================================
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-renamesourcefileattribute SourceFile

# ============================================================================
# 13. SUPPRESS WARNINGS
# ============================================================================
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn androidx.**
