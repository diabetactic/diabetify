// Dynamic local Docker proxy (used by `ng serve --configuration local`).
// Allows running Docker backend on a non-default host port.
//
// Precedence:
//   1) E2E_API_URL (full URL)
//   2) DIABETACTIC_API_PORT (port number)
//   3) default 8000

const target =
  process.env.E2E_API_URL ||
  `http://localhost:${process.env.DIABETACTIC_API_PORT || 8000}`;

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '',
    },
    logLevel: 'debug',
  },
};

