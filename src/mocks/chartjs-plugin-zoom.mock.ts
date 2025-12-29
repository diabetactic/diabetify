/**
 * Mock for chartjs-plugin-zoom
 * Used in tests to avoid Chart.js zoom plugin dependencies
 *
 * Note: Chart.js registry checks for prototype properties, so we create
 * a minimal object that can be passed to Chart.register() safely.
 */

// Create a minimal plugin object that Chart.js can register
const zoomPlugin = {
  id: 'zoom',
  defaults: {
    pan: { enabled: false, mode: 'xy' },
    zoom: {
      wheel: { enabled: false },
      pinch: { enabled: false },
      mode: 'xy',
    },
  },
  // Lifecycle hooks (Chart.js expects these as function properties, not static)
  start: function () {},
  stop: function () {},
  beforeInit: function () {},
  afterInit: function () {},
  beforeUpdate: function () {},
  afterUpdate: function () {},
  beforeDatasetsDraw: function () {},
  afterDatasetsDraw: function () {},
  beforeDraw: function () {},
  afterDraw: function () {},
  beforeEvent: function () {},
  afterEvent: function () {},
  resize: function () {},
  reset: function () {},
  uninstall: function () {},
};

export default zoomPlugin;
export { zoomPlugin };
