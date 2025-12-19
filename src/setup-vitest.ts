/**
 * Setup principal de Vitest - wrapper delgado que importa desde test-setup/
 * Mantiene compatibilidad con vitest.config.ts mientras usa la estructura modular
 */

// Re-exportar todo desde la estructura modular
export * from './test-setup';
