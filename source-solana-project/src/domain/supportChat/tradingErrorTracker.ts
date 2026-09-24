export type TradingErrorInfo = {
  actionName: string;
  errorData?: unknown;
  collateral?: string;
  market?: string;
  signatures?: string[];
  errorId?: string;
};

export type SupportChatContext = {
  walletAddress?: string;
  walletProvider?: string;
  network?: string;
};

export type SupportError = TradingErrorInfo &
  SupportChatContext & {
    timestamp: number;
  };

const ERROR_WINDOW_MS = 2 * 60 * 1000;

export function isUserRejectedError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    const data =
      typeof current === 'object'
        ? (current as Record<string, unknown>)
        : undefined;
    if (data?.code === 4001 || data?.isUserRejectedError === true) return true;
    const message = typeof current === 'string' ? current : data?.message;
    if (
      typeof message === 'string' &&
      /user (rejected|denied|cancelled|canceled)|(rejected|denied|cancelled|canceled) by (the )?user/i.test(
        message
      )
    ) {
      return true;
    }
    current = data?.cause ?? data?.error;
  }
  return false;
}

export class TradingErrorTracker {
  private errors: SupportError[] = [];
  private context: SupportChatContext = {};

  setContext(context: SupportChatContext) {
    this.context = { ...context };
  }

  reportError(info: TradingErrorInfo): SupportError | undefined {
    if (isUserRejectedError(info.errorData)) return undefined;
    this.prune();
    // Nested handlers and pending status polling can report the same failure again.
    const existing = this.errors.find(
      (error) =>
        (info.errorId && error.errorId === info.errorId) ||
        (typeof info.errorData === 'object' &&
          info.errorData !== null &&
          error.errorData === info.errorData)
    );
    if (existing) return existing;
    const error = { ...this.context, ...info, timestamp: Date.now() };
    this.errors.push(error);
    return error;
  }

  shouldSuggestSupport() {
    this.prune();
    return this.errors.length >= 2;
  }

  private prune() {
    const cutoff = Date.now() - ERROR_WINDOW_MS;
    this.errors = this.errors.filter((error) => error.timestamp > cutoff);
  }
}

export const tradingErrorTracker = new TradingErrorTracker();
