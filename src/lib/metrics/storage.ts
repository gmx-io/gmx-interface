const STORAGE: { [key: string]: string } = {};

export function getStorageItem(key: string, fromLocalStorage = true): string | null {
  const value = fromLocalStorage ? localStorage.getItem(key) : STORAGE[key];

  return value;
}

export function setStorageItem(key: string, value: string, toLocalStorage = true) {
  if (toLocalStorage) {
    localStorage.setItem(key, value);
  } else {
    STORAGE[key] = value;
  }
}
