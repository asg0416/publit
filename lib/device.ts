const STORAGE_KEY = 'publit_device_id';

export function normalizeDeviceId(value: string): string {
  return value.trim();
}

export function createRandomDeviceId(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateDeviceId(storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage): string {
  const current = storage.getItem(STORAGE_KEY);
  if (current) return normalizeDeviceId(current);

  const next = createRandomDeviceId();
  storage.setItem(STORAGE_KEY, next);
  return next;
}

export async function createDeviceHash(deviceId: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeDeviceId(deviceId));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceHash(storage?: Pick<Storage, 'getItem' | 'setItem'>): Promise<string> {
  return createDeviceHash(getOrCreateDeviceId(storage));
}
