export function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
