export type CreateOverlayFn<TOverlay> = () => Promise<TOverlay>;

export interface CreateOverlaySafelyOptions {
  timeoutMs?: number;
}

export async function createOverlaySafely<TOverlay>(
  create: CreateOverlayFn<TOverlay>,
  options?: CreateOverlaySafelyOptions
): Promise<TOverlay | null> {
  const timeoutMs = options?.timeoutMs ?? 2500;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<null>(resolve => {
      timeoutId = setTimeout(() => resolve(null), timeoutMs);
    });

    return await Promise.race([create(), timeoutPromise]);
  } catch {
    return null;
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}
