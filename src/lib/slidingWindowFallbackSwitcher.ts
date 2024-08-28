type SlidingWindowFallbackSwitcherOptions = {
  fallbackTimeout: number;
  restoreTimeout: number;
  eventsThreshold: number;
  onFallback?: () => void;
  onRestore?: () => void;
};

export class SlidingWindowFallbackSwitcher {
  private fallbackTimeout: number;
  private restoreTimeout: number;
  private eventsThreshold: number;
  private onFallback?: () => void;
  private onRestore?: () => void;

  private eventTimestamps: number[] = [];

  public isFallbackMode = false;

  private fallbackTimerId: NodeJS.Timeout | null = null;
  private restoreTimerId: NodeJS.Timeout | null = null;

  constructor(options: SlidingWindowFallbackSwitcherOptions) {
    this.fallbackTimeout = options.fallbackTimeout;
    this.restoreTimeout = options.restoreTimeout;
    this.eventsThreshold = options.eventsThreshold;

    this.onFallback = options.onFallback;
    this.onRestore = options.onRestore;
  }

  public trigger(): void {
    const now = Date.now();
    this.eventTimestamps.push(now);
    this.cleanupOldEvents();

    if (!this.isFallbackMode && this.eventTimestamps.length >= this.eventsThreshold) {
      this.switchToFallback();
    }
  }

  private cleanupOldEvents(): void {
    const windowStart = Date.now() - this.fallbackTimeout;
    this.eventTimestamps = this.eventTimestamps.filter((timestamp) => timestamp >= windowStart);
  }

  private switchToFallback(): void {
    this.onFallback?.();
    this.isFallbackMode = true;

    if (this.restoreTimerId) {
      clearTimeout(this.restoreTimerId);
    }

    this.fallbackTimerId = setTimeout(() => this.switchToMain(), this.restoreTimeout);
  }

  private switchToMain(): void {
    this.onRestore?.();
    this.isFallbackMode = false;

    if (this.fallbackTimerId) {
      clearTimeout(this.fallbackTimerId);
    }
  }
}
