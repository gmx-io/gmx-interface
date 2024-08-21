const STORAGE: { [key: string]: string } = {};

export function getStorageItem(key: string, fromLocalStorage = false): string | null {
  const value = fromLocalStorage ? localStorage.getItem(key) : STORAGE[key];
  console.log("sa", STORAGE);
  return value;
}

export function setStorageItem(key: string, value: string, toLocalStorage = false) {
  if (toLocalStorage) {
    localStorage.setItem(key, value);
  } else {
    console.log("bra");
    STORAGE[key] = value;
  }
}
