const ERROR_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const ERROR_THRESHOLD = 2;

export type TradingActionName =
  | "Open Position"
  | "Close Position"
  | "Swap"
  | "Edit Collateral"
  | "GM Deposit"
  | "GM Withdrawal"
  | "Multichain Withdrawal"
  | "Bridge Deposit"
  | "Bridge Withdrawal"
  | "Stake"
  | "Unstake"
  | "Cancel Order"
  | "Update Order"
  | "Express Order"
  | "Pending Transaction"
  | "Settle Funding Fee"
  | "Add TP/SL";

export type TradingErrorInfo = {
  actionName: TradingActionName;
  collateral?: string;
  errorData?: unknown;
  requestId?: string;
  metricId?: string;
};

type TrackedError = {
  info: TradingErrorInfo;
  timestamp: number;
};

type SupportChatContext = {
  walletAddress?: string;
  walletProvider?: string;
  network?: string;
};

class TradingErrorTracker {
  private errors: TrackedError[] = [];
  private supportChatContext: SupportChatContext = {};

  private pruneOldErrors() {
    const cutoff = Date.now() - ERROR_WINDOW_MS;
    this.errors = this.errors.filter((e) => e.timestamp > cutoff);
  }

  reportError(info: TradingErrorInfo) {
    this.pruneOldErrors();
    this.errors.push({ info, timestamp: Date.now() });
  }

  shouldSuggestSupport(): boolean {
    this.pruneOldErrors();
    return this.errors.length >= ERROR_THRESHOLD;
  }

  getLatestError(): (TradingErrorInfo & SupportChatContext) | undefined {
    if (this.errors.length === 0) return undefined;

    const latest = this.errors[this.errors.length - 1];
    return {
      ...latest.info,
      ...this.supportChatContext,
    };
  }

  setSupportChatContext(ctx: SupportChatContext) {
    this.supportChatContext = ctx;
  }
}

export const tradingErrorTracker = new TradingErrorTracker();
