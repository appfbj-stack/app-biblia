class MemoryStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return this.data[key] !== undefined ? this.data[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.data);
    return keys[index] !== undefined ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = String(value);
  }
}

const fallbackLocalStorage = new MemoryStorage();
const fallbackSessionStorage = new MemoryStorage();

export const safeLocalStorage: Storage = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test actual readability/writability to be absolutely safe
      const testKey = '__storage_test_key__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    console.warn("localStorage is blocked or unavailable, falling back to memory storage.", e);
  }
  return fallbackLocalStorage;
})();

export const safeSessionStorage: Storage = (() => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const testKey = '__storage_test_key__';
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
      return window.sessionStorage;
    }
  } catch (e) {
    console.warn("sessionStorage is blocked or unavailable, falling back to memory storage.", e);
  }
  return fallbackSessionStorage;
})();
