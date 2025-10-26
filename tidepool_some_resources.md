**Official API Documentation (Current):**

- **Tidepool API (Stoplight)** — main entry point with auth, environments, pagination, and examples. [tidepool.stoplight.io](https://tidepool.stoplight.io/docs/tidepool-api/7ef2485b09b04-welcome)
- **Getting Started** — minimal steps (account, curl/Postman), first API calls. [tidepool.stoplight.io/getting-started](https://tidepool.stoplight.io/docs/tidepool-api/9f652c879a6e3-getting-started)
- **Fetching Device Data** — concrete query patterns (`/data/<userId>?type=smbg` etc.) and multi-type queries. [tidepool.stoplight.io/fetching-device-data](https://tidepool.stoplight.io/docs/tidepool-api/ea3175a7009e8-fetching-device-data)
- **Partner Integration Guide** — how to integrate a cloud service as a passive uploader into Tidepool Data. [tidepool.stoplight.io/partner-integration](https://tidepool.stoplight.io/docs/tidepool-api/ee88d1423e04a-partner-integration-guide)
- **Tidepool Full API** — comprehensive documentation including internal endpoints. [tidepool.stoplight.io/full-api](https://tidepool.stoplight.io/docs/tidepool-full-api/)

**Data Models & Schemas:**

- **Diabetes Data Types** — canonical JSON schemas for `basal`, `bolus`, `cbg`, `smbg`, `pumpSettings`, etc. (GitBook). [developer.tidepool.org/data-model](https://developer.tidepool.org/data-model/)
- **Data Model GitHub Repo** — documentation for Tidepool's data models with generation scripts. [github.com/tidepool-org/data-model](https://github.com/tidepool-org/data-model)

**Developer Resources:**

- **Tidepool Developer Portal** — main developer microsite with links to source code, current sprint info, and platform overview. [developer.tidepool.org](https://developer.tidepool.org/)
- **OpenAPI Sources** — the repo that powers the Stoplight site; useful for generating clients or inspecting specs. [github.com/tidepool-org/TidepoolApi](https://github.com/tidepool-org/TidepoolApi)
- **Platform Repo (Go services)** — server code implementing the platform; helpful to understand behavior beyond docs. [github.com/tidepool-org/platform](https://github.com/tidepool-org/platform)
- **Browser/Client Library** — `tidepool-platform-client` for JavaScript; shows auth flows and request shapes. [github.com/tidepool-org/platform-client](https://github.com/tidepool-org/platform-client)
- **Tidepool GitHub Organization** — all open source repos. [github.com/tidepool-org](https://github.com/tidepool-org)

**Legacy Resources (historical context only):**

- **User API (Apiary)** — older notes on sessions/login; deprecated but sometimes useful for context. [tidepooluserapi.docs.apiary.io](https://tidepooluserapi.docs.apiary.io/)
- **Old API Guidebook** — deprecated in favor of Stoplight. [developer.tidepool.org/tidepool-api](https://developer.tidepool.org/tidepool-api/index/)
- **Support Article** — confirms Stoplight as the current canonical documentation location. [support.tidepool.org](https://support.tidepool.org/hc/en-us/articles/360029368812-Tidepool-API-3rd-Party-Integrations)

**Key Note:** The Stoplight documentation is the current, actively maintained API reference. The older Apiary and legacy guidebook resources have been deprecated but may provide useful historical context.
