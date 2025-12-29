/**
 * Mock for capacitor-widget-bridge Capacitor plugin
 * Used in tests to avoid native platform dependencies
 */

export const WidgetBridgePlugin = {
  setItem: async (_options: { group?: string; key: string; value: string }) => {
    return Promise.resolve();
  },
  getItem: async (_options: { group?: string; key: string }) => {
    return Promise.resolve({ value: null });
  },
  removeItem: async (_options: { group?: string; key: string }) => {
    return Promise.resolve();
  },
  reloadAllTimelines: async () => {
    return Promise.resolve();
  },
  reloadTimelines: async (_options: { ofKind: string }) => {
    return Promise.resolve();
  },
};

export default WidgetBridgePlugin;
