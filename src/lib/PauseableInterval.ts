type PauseableIntervalFunction<T> = (pausedParams: {
  wasPausedSinceLastCall: boolean;
  lastReturnedValue: Awaited<T> | undefined;
}) => T | Promise<T>;

export class PauseableInterval<T = undefined> {
  private timerId: number | undefined;
  private wasPausedSinceLastCall = false;
  private lastReturnedValue: Awaited<T> | undefined;
  private state: "paused" | "running" | "destroyed" = "running";
  private loopId = 0;

  constructor(
    private cb: PauseableIntervalFunction<T>,
    private interval: number
  ) {
    this.scheduleNextExecution(0);
  }

  pause() {
    if (this.state !== "running") {
      return;
    }

    window.clearTimeout(this.timerId);
    this.timerId = undefined;
    this.loopId += 1;
    this.wasPausedSinceLastCall = true;
    this.state = "paused";
  }

  destroy() {
    window.clearTimeout(this.timerId);
    this.timerId = undefined;
    this.loopId += 1;
    this.state = "destroyed";
  }

  resume() {
    if (this.state !== "paused") {
      return;
    }

    this.state = "running";

    this.scheduleNextExecution(0);
  }

  private async executeCallback() {
    const result = await this.cb({
      wasPausedSinceLastCall: this.wasPausedSinceLastCall,
      lastReturnedValue: this.lastReturnedValue,
    });
    this.lastReturnedValue = result;
  }

  private scheduleNextExecution(delay: number) {
    const loopId = this.loopId;
    this.timerId = window.setTimeout(async () => {
      const start = Date.now();
      const wasPausedBeforeCallback = this.wasPausedSinceLastCall;

      await this.executeCallback();

      const isPausedAfterCallback = this.wasPausedSinceLastCall;

      if (!wasPausedBeforeCallback && isPausedAfterCallback) {
        this.wasPausedSinceLastCall = true;
      } else {
        this.wasPausedSinceLastCall = false;
      }

      if (this.loopId !== loopId) {
        return;
      }

      const end = Date.now();
      const nextDelay = Math.max(this.interval - (end - start), 0);
      this.scheduleNextExecution(nextDelay);
    }, delay);
  }
}
