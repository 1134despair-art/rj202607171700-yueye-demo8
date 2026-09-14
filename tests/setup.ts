import { beforeEach, vi } from 'vitest';
const storage = new Map<string, unknown>();
vi.stubGlobal('uni', {
  getStorageSync: (key: string) => storage.get(key) ?? '',
  setStorageSync: (key: string, value: unknown) => storage.set(key, JSON.parse(JSON.stringify(value))),
  removeStorageSync: (key: string) => storage.delete(key),
  setTabBarItem: vi.fn(), setTabBarStyle: vi.fn(), setBackgroundColor: vi.fn(),
});
beforeEach(() => storage.clear());
