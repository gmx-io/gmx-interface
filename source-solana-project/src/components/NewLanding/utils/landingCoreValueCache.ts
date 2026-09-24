type CachedEntry<T> = {
  value: T;
  cachedAt: number;
};

export function readStaleLandingCoreValueCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CachedEntry<T>;
    return entry.value;
  } catch {
    return null;
  }
}

export function readLandingCoreValueCache<T>(
  key: string,
  ttlMs: number
): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CachedEntry<T>;
    if (Date.now() - entry.cachedAt > ttlMs) return null;

    return entry.value;
  } catch {
    return null;
  }
}

export function writeLandingCoreValueCache<T>(key: string, value: T): void {
  try {
    const entry: CachedEntry<T> = { value, cachedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode errors.
  }
}
