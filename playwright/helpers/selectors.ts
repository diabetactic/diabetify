/**
 * Centralized Selectors for Playwright Tests
 *
 * Provides reusable selectors with bilingual support (Spanish/English)
 * and data-testid based selection for improved test reliability.
 */

import { Page, Locator } from '@playwright/test';

/**
 * Bilingual text patterns for common UI elements
 */
export const BilingualText = {
  // Authentication
  signIn: /Iniciar|Sign In/i,
  login: /Iniciar sesión|Login/i,
  logout: /Cerrar sesión|Logout|Salir/i,
  register: /Registrarse|Register|Sign Up/i,

  // Appointments
  appointments: /Citas|Appointments/i,
  requestAppointment: /Solicitar cita|Request Appointment|Solicitar/i,
  pending: /Pendiente|Pending|En revisión|Under review|Esperando|Waiting/i,
  accepted: /Aceptada|Accepted/i,
  denied: /Rechazada|Denied|Denegada|No aprobada/i,
  created: /Creada|Created|Programada|Scheduled|Tu cita/i,
  complete: /Completar|Complete/i,
  fillForm: /Llenar formulario|Fill form/i,
  queueClosed: /Cola cerrada|Queue closed|No disponible|Not available|Cupos agotados/i,
  noAppointments: /No tienes citas|No appointments|Solicita tu primera/i,

  // Readings
  readings: /Lecturas|Readings/i,
  addReading: /Añadir lectura|Add Reading|Nueva lectura/i,
  glucoseLevel: /Nivel de glucosa|Glucose Level/i,
  save: /Guardar|Save/i,
  cancel: /Cancelar|Cancel/i,
  delete: /Eliminar|Delete/i,

  // Profile
  profile: /Perfil|Profile/i,
  settings: /Configuración|Settings/i,
  editProfile: /Editar perfil|Edit Profile/i,

  // Network states
  offline: /Sin conexión|Offline|No internet|Desconectado/i,
  online: /Conectado|Connected|Online/i,
  syncing: /Sincronizando|Syncing/i,
  synced: /Sincronizado|Synced/i,
  unsynced: /Pendiente|Pending|Sin sincronizar|Unsynced|Offline/i,

  // Common actions
  submit: /Enviar|Submit/i,
  confirm: /Confirmar|Confirm/i,
  yes: /Sí|Yes/i,
  no: /No/i,
  close: /Cerrar|Close/i,
  back: /Volver|Back/i,
  next: /Siguiente|Next/i,
  previous: /Anterior|Previous/i,

  // Status messages
  success: /Éxito|Success|Exitoso|Successful/i,
  error: /Error/i,
  warning: /Advertencia|Warning|Alerta|Alert/i,
  info: /Información|Information|Info/i,

  // Appointment details
  date: /Fecha|Date/i,
  time: /Hora|Time/i,
  doctor: /Doctor|Médico/i,
  specialty: /Especialidad|Specialty/i,

  // Theme
  theme: /Tema|Theme/i,
  light: /Claro|Light/i,
  dark: /Oscuro|Dark/i,

  // Language
  language: /Idioma|Language/i,
  spanish: /Español|Spanish/i,
  english: /Inglés|English/i,
} as const;

/**
 * Data-testid based selectors
 */
export const DataTestId = {
  // Tabs
  tabDashboard: '[data-testid="tab-dashboard"]',
  tabReadings: '[data-testid="tab-readings"]',
  tabAppointments: '[data-testid="tab-appointments"]',
  tabProfile: '[data-testid="tab-profile"]',

  // Readings
  fabAddReading: '[data-testid="fab-add-reading"]',
  addReadingSaveBtn: '[data-testid="add-reading-save-btn"]',
  addReadingCancelBtn: '[data-testid="add-reading-cancel-btn"]',

  // Profile
  editProfileBtn: '[data-testid="edit-profile-btn"]',
  saveProfileBtn: '[data-testid="save-profile-btn"]',

  // Settings
  themeToggle: '[data-testid="theme-toggle"]',
  languageSelect: '[data-testid="language-select"]',
} as const;

/**
 * Ionic component selectors
 */
export const IonicComponents = {
  // Structure
  app: 'ion-app',
  appHydrated: 'ion-app.hydrated',
  content: 'ion-content',
  header: 'ion-header',
  toolbar: 'ion-toolbar',
  title: 'ion-title',
  footer: 'ion-footer',

  // Navigation
  tabs: 'ion-tabs',
  tabBar: 'ion-tab-bar',
  tabButton: 'ion-tab-button',

  // Buttons & Actions
  button: 'ion-button',
  fab: 'ion-fab',
  fabButton: 'ion-fab-button',

  // Forms
  input: 'ion-input',
  inputNative: 'ion-input input',
  textarea: 'ion-textarea',
  select: 'ion-select',
  checkbox: 'ion-checkbox',
  radio: 'ion-radio',
  toggle: 'ion-toggle',

  // Lists
  list: 'ion-list',
  item: 'ion-item',
  itemSliding: 'ion-item-sliding',
  itemOptions: 'ion-item-options',

  // Cards
  card: 'ion-card',
  cardHeader: 'ion-card-header',
  cardContent: 'ion-card-content',

  // Overlays
  modal: 'ion-modal',
  alert: 'ion-alert',
  toast: 'ion-toast',
  loading: 'ion-loading',

  // Other
  badge: 'ion-badge',
  chip: 'ion-chip',
  icon: 'ion-icon',
  spinner: 'ion-spinner',
} as const;

/**
 * Composite selectors for common patterns
 */
export class Selectors {
  /**
   * Get tab button by name (with fallback to data-testid)
   */
  static tabButton(
    page: Page,
    tab: 'dashboard' | 'readings' | 'appointments' | 'profile'
  ): Locator {
    return page.locator(`[data-testid="tab-${tab}"], ion-tab-button[tab="${tab}"]`);
  }

  /**
   * Get button by bilingual text
   */
  static buttonByText(page: Page, pattern: RegExp): Locator {
    return page.locator(
      `ion-button:has-text("${pattern.source}"), button:has-text("${pattern.source}")`
    );
  }

  /**
   * Get Ionic input by placeholder (bilingual)
   */
  static inputByPlaceholder(page: Page, pattern: RegExp): Locator {
    return page.locator(
      `ion-input[placeholder*="${pattern.source}"] input, input[placeholder*="${pattern.source}"]`
    );
  }

  /**
   * Get form by any visible form element
   */
  static form(page: Page): Locator {
    return page.locator('form');
  }

  /**
   * Get reading item (card or custom class)
   */
  static readingItem(page: Page): Locator {
    return page.locator('ion-card, .reading-item');
  }

  /**
   * Get appointment item
   */
  static appointmentItem(page: Page): Locator {
    return page.locator('ion-card, .appointment-item');
  }

  /**
   * Get FAB button for adding reading
   */
  static fabAddReading(page: Page): Locator {
    return page.locator('[data-testid="fab-add-reading"], ion-fab-button');
  }

  /**
   * Get any indicator by text pattern
   */
  static indicator(page: Page, pattern: RegExp): Locator {
    return page.locator(`text=/${pattern.source}/i`);
  }

  /**
   * Get password input
   */
  static passwordInput(page: Page): Locator {
    return page.locator('input[type="password"]');
  }

  /**
   * Get username/email input
   */
  static usernameInput(page: Page): Locator {
    return page.locator(
      'input[placeholder*="DNI"], input[placeholder*="email"], input[type="text"]'
    );
  }
}

/**
 * Helper to combine multiple selector strategies
 */
export function multiSelector(page: Page, ...selectors: string[]): Locator {
  return page.locator(selectors.join(', '));
}

/**
 * Helper to create bilingual text selector
 */
export function bilingualText(spanish: string, english: string): RegExp {
  return new RegExp(`${spanish}|${english}`, 'i');
}
