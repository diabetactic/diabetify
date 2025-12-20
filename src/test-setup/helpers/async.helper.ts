/**
 * Utilidades para tests asíncronos
 */

// Placeholder para futuras utilidades async
// Por ejemplo: flushAsync, waitFor, etc.

export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

export async function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
