export function getAppVersion() {
  return process.env.REACT_APP_VERSION;
}

(window as any).getAppVersion = getAppVersion;
