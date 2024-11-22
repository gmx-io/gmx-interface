type PauseableIntervalFunction<T> = (pausedParams: {
  wasPausedSinceLastCall: boolean;
  lastReturnedValue: Awaited<T> | undefined;
}) => T | Promise<T>;

export class PauseableInterval<T = undefined> {
  private intervalId: number;
  private wasPausedSinceLastCall = false;
  private lastReturnedValue: Awaited<T> | undefined;
  private state: "paused" | "running" = "running";

  constructor(
    private cb: PauseableIntervalFunction<T>,
    private interval: number
  ) {
    this.executeCallback();

    this.intervalId = window.setInterval(() => {
      this.executeCallback();
    }, interval);
  }

  pause() {
    if (this.state === "paused") {
      return;
    }

    window.clearInterval(this.intervalId);
    this.wasPausedSinceLastCall = true;
    this.state = "paused";
  }

  destroy() {
    window.clearInterval(this.intervalId);
  }

  resume() {
    if (this.state === "running") {
      return;
    }

    this.state = "running";

    this.executeCallback();

    this.intervalId = window.setInterval(() => {
      this.executeCallback();
    }, this.interval);
  }

  private async executeCallback() {
    const wasPausedBeforeCallback = this.wasPausedSinceLastCall;

    const result = await Promise.resolve(
      this.cb({
        wasPausedSinceLastCall: this.wasPausedSinceLastCall,
        lastReturnedValue: this.lastReturnedValue,
      })
    );
    this.lastReturnedValue = result;

    const wasPausedDuringCallback = this.wasPausedSinceLastCall;

    if (!wasPausedBeforeCallback && wasPausedDuringCallback) {
      this.wasPausedSinceLastCall = true;
    } else {
      this.wasPausedSinceLastCall = false;
    }
  }
}
