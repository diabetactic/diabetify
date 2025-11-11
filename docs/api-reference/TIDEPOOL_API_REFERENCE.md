# Tidepool API Reference

## Location
External API documentation is located in: `/TidepoolApi/`

## Contents
- **Size**: 11 MB
- **Files**: 75 markdown files
- **Structure**: Well-organized official Tidepool API documentation

## Key Documentation Sections

### Quick Start
- `/TidepoolApi/docs/quick-start/` - Getting started guides
- `/TidepoolApi/docs/quick-start/uploading-device-data.md` - Device data upload
- `/TidepoolApi/docs/quick-start/fetching-device-data.md` - Data retrieval

### Core Documentation
- `/TidepoolApi/docs/authentication.md` - OAuth and authentication
- `/TidepoolApi/docs/device-data.md` - Device data models
- `/TidepoolApi/docs/data-sharing/` - Data sharing with clinics/people
- `/TidepoolApi/docs/clinic-integration.md` - Clinic integration guide

### Data Types
- `/TidepoolApi/docs/device-data/data-types/` - All glucose data types
  - `basal.md` - Basal insulin data
  - `bolus.md` - Bolus insulin data
  - `cbg.md` - Continuous Glucose Monitor data
  - `smbg.md` - Self-Monitored Blood Glucose data
  - And more...

### Common Fields
- `/TidepoolApi/docs/device-data/common-fields.md` - Shared field definitions
- `/TidepoolApi/docs/device-data/annotations.md` - Data annotations
- `/TidepoolApi/docs/datetime.md` - Datetime handling

## Integration Notes

This documentation supports our:
- TidepoolSyncService implementation (`src/app/core/services/tidepool-sync.service.ts`)
- Glucose reading models (`src/app/core/models/glucose-reading.model.ts`)
- Data transformation logic (`src/app/core/services/tidepool-storage.service.ts`)

## Status
✅ **External reference - keep as-is**
- No duplicates found
- Well-organized structure
- Official Tidepool documentation
- Used for development reference
