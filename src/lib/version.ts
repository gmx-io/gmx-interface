export function getAppVersion() {
  return import.meta.env.VITE_APP_VERSION;
}

(window as any).getAppVersion = getAppVersion;
