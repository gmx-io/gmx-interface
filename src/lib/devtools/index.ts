import { isDevelopment } from "config/env";

const DEVTOOLS_STATE_KEY = "devToolsState";

type DevtoolsState = {
  debugRpcTracker?: boolean;
  rpcTrackerMockPrivateRpcCheck?: boolean;
};

type DevtoolsKey = keyof DevtoolsState;

class Devtools {
  state: DevtoolsState = {
    debugRpcTracker: false,
    rpcTrackerMockPrivateRpcCheck: false,
  };

  constructor() {
    this.loadState();
  }

  private getStorageKey(): string {
    return JSON.stringify(DEVTOOLS_STATE_KEY);
  }

  private loadState(): void {
    if (!isDevelopment()) {
      return;
    }

    try {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored) as Partial<DevtoolsState>;
        this.state = {
          ...parsed,
        };
      }
    } catch (_error) {
      return;
    }
  }

  private saveState(): void {
    if (!isDevelopment()) {
      return;
    }

    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.state));
    } catch (_error) {
      return;
    }
  }

  getFlag<K extends DevtoolsKey>(key: K): boolean {
    if (!isDevelopment()) {
      return false;
    }
    return (this.state[key] ?? false) as boolean;
  }

  setFlag<K extends DevtoolsKey>(key: K, value: boolean): void {
    if (!isDevelopment()) {
      return;
    }

    this.state[key] = value;
    this.saveState();
  }
}

export const devtools = new Devtools();
