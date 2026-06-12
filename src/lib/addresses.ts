export function isSameAddress(a: string | undefined, b: string | undefined) {
  return a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();
}

export function isSameAddressArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((address, index) => isSameAddress(address, b[index]));
}
