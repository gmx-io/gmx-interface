export class NetworkStatusObserver {
  trackerStates: {
    [trackerKey: string]: {
      trackingFailed: boolean;
      isActive: boolean;
    };
  } = {};

  static _instance: NetworkStatusObserver | undefined;

  static getInstance(): NetworkStatusObserver {
    if (!this._instance) {
      this._instance = new NetworkStatusObserver();
    }
    return this._instance;
  }

  setTrackingFailed(trackerKey: string, trackingFailed: boolean) {
    if (!this.trackerStates[trackerKey]) {
      this.trackerStates[trackerKey] = {
        trackingFailed,
        isActive: false,
      };
    } else {
      this.trackerStates[trackerKey].trackingFailed = trackingFailed;
    }
  }

  setActive(trackerKey: string, isActive: boolean) {
    if (!this.trackerStates[trackerKey]) {
      this.trackerStates[trackerKey] = {
        trackingFailed: false,
        isActive,
      };
    } else {
      this.trackerStates[trackerKey].isActive = isActive;
    }
  }

  getTrackingFailed(trackerKey: string): boolean {
    return this.trackerStates[trackerKey]?.trackingFailed ?? false;
  }

  getIsActive(trackerKey: string): boolean {
    return this.trackerStates[trackerKey]?.isActive ?? false;
  }

  getIsGlobalNetworkDown(): boolean {
    const activeTrackers = Object.values(this.trackerStates).filter((state) => state.isActive);
    if (activeTrackers.length === 0) {
      return false; // No active trackers means we can't determine if network is down
    }
    return activeTrackers.every((state) => state.trackingFailed);
  }

  getAllTrackerStates(): Record<string, { trackingFailed: boolean; isActive: boolean }> {
    return { ...this.trackerStates };
  }
}
