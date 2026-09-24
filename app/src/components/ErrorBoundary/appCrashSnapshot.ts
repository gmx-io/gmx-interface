export type AppCrashSnapshot = {
  route: string;
  walletAddress: string | null;
};

let snapshot: AppCrashSnapshot = {
  route: '',
  walletAddress: null,
};

export function setAppCrashSnapshot(next: AppCrashSnapshot) {
  snapshot = next;
}

export function getAppCrashSnapshot(): AppCrashSnapshot {
  return snapshot;
}

export function getRouteFromWindowLocation(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}
