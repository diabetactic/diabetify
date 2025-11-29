/**
 * Zone.js flags configuration
 *
 * NOTE: __Zone_disable_customElements was removed because it breaks
 * Ionic components on Android WebView. Ionic components (ion-alert,
 * ion-toast, ion-router-outlet, etc.) ARE Web Components, so disabling
 * Zone.js patching for custom elements prevents Angular change detection
 * from firing when these components update their DOM.
 *
 * Symptoms when enabled: Alerts don't display, navigation doesn't complete,
 * toasts don't appear - all on Android while working on Chrome desktop.
 */

// REMOVED: Was breaking Ionic Web Components on Android WebView
// (window as any).__Zone_disable_customElements = true;
