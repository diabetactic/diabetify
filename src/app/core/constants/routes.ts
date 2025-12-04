/**
 * Application Route Constants
 *
 * Centralized route definitions to prevent hardcoded strings throughout the app.
 * Use these constants for all navigation and routing operations.
 */

export const ROUTE_SEGMENTS = {
  TABS: 'tabs',
  WELCOME: 'welcome',
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  READINGS: 'readings',
  APPOINTMENTS: 'appointments',
  PROFILE: 'profile',
  TRENDS: 'trends',
  SETTINGS: 'settings',
  ADVANCED: 'advanced',
  ADD_READING: 'add-reading',
  ACCOUNT_PENDING: 'account-pending',
  CREATE: 'create',
  DETAIL: 'detail',
  APPOINTMENT_DETAIL: 'appointment-detail',
  BOLUS_CALCULATOR: 'bolus-calculator',
  INTEGRATION_TEST: 'integration-test',
} as const;

export const ROUTES = {
  // Root routes
  WELCOME: `/${ROUTE_SEGMENTS.WELCOME}`,
  LOGIN: `/${ROUTE_SEGMENTS.LOGIN}`,
  ACCOUNT_PENDING: `/${ROUTE_SEGMENTS.ACCOUNT_PENDING}`,
  ADD_READING: `/${ROUTE_SEGMENTS.ADD_READING}`,
  BOLUS_CALCULATOR: `/${ROUTE_SEGMENTS.BOLUS_CALCULATOR}`,

  // Tabs container
  TABS: `/${ROUTE_SEGMENTS.TABS}`,

  // Tab pages (under /tabs)
  TABS_DASHBOARD: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.DASHBOARD}`,
  TABS_READINGS: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.READINGS}`,
  TABS_APPOINTMENTS: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.APPOINTMENTS}`,
  TABS_PROFILE: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.PROFILE}`,
  TABS_TRENDS: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.TRENDS}`,

  // Appointments nested routes
  APPOINTMENTS_CREATE: `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.APPOINTMENTS}/${ROUTE_SEGMENTS.CREATE}`,

  // Settings routes
  SETTINGS: `/${ROUTE_SEGMENTS.SETTINGS}`,
  SETTINGS_ADVANCED: `/${ROUTE_SEGMENTS.SETTINGS}/${ROUTE_SEGMENTS.ADVANCED}`,

  // Dashboard detail
  DASHBOARD_DETAIL: `/${ROUTE_SEGMENTS.DASHBOARD}/${ROUTE_SEGMENTS.DETAIL}`,
} as const;

/**
 * Helper to build appointment detail route with ID
 */
export function appointmentDetailRoute(appointmentId: number | string): string {
  return `/${ROUTE_SEGMENTS.TABS}/${ROUTE_SEGMENTS.APPOINTMENTS}/${ROUTE_SEGMENTS.APPOINTMENT_DETAIL}/${appointmentId}`;
}

/**
 * Route arrays for use with router.navigate()
 */
export const ROUTE_ARRAYS = {
  WELCOME: [ROUTES.WELCOME],
  LOGIN: [ROUTES.LOGIN],
  ACCOUNT_PENDING: [ROUTES.ACCOUNT_PENDING],
  ADD_READING: [ROUTES.ADD_READING],
  TABS: [ROUTES.TABS],
  TABS_DASHBOARD: [ROUTES.TABS_DASHBOARD],
  TABS_READINGS: [ROUTES.TABS_READINGS],
  TABS_APPOINTMENTS: [ROUTES.TABS_APPOINTMENTS],
  TABS_PROFILE: [ROUTES.TABS_PROFILE],
  APPOINTMENTS_CREATE: [
    '/',
    ROUTE_SEGMENTS.TABS,
    ROUTE_SEGMENTS.APPOINTMENTS,
    ROUTE_SEGMENTS.CREATE,
  ],
  SETTINGS: [ROUTES.SETTINGS],
  SETTINGS_ADVANCED: [ROUTES.SETTINGS_ADVANCED],
} as const;

/**
 * Helper to get appointment detail route array with ID
 */
export function appointmentDetailRouteArray(appointmentId: number | string): string[] {
  return [ROUTES.TABS_APPOINTMENTS, ROUTE_SEGMENTS.APPOINTMENT_DETAIL, String(appointmentId)];
}

export type RouteSegment = (typeof ROUTE_SEGMENTS)[keyof typeof ROUTE_SEGMENTS];
export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
