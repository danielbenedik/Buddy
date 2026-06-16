interface CacheEntry<T> {
  data: T;
  expires: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = { data, expires: Date.now() + ttl };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore quota / serialization errors — caching is best-effort.
  }
}
