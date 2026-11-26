import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FallbackWaitEnd } from "lib/metrics/types";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  isWalletInitializing: false,
  outcomes: {} as Record<string, FallbackWaitEnd | "waiting">,
}));

vi.mock("lib/wallets/useWallet", () => ({ default: () => ({ account: mocks.account }) }));
vi.mock("lib/wallets/useIsWalletInitializing", () => ({ useIsWalletInitializing: () => mocks.isWalletInitializing }));
vi.mock("context/ConnectModalContext/ConnectModalContext", () => ({
  useConnectModal: () => ({ connectModalOpen: false }),
}));
vi.mock("lib/metrics/utils", () => ({ getRequestId: () => "request" }));
vi.mock("lib/metrics/deferLoadFailure", () => ({
  deferLoadFailure: ({ event }: { event: string }, onFinish?: () => void) => {
    const finish = (end: FallbackWaitEnd) => {
      mocks.outcomes[event] = end;
      onFinish?.();
    };
    mocks.outcomes[event] = "waiting";

    return { onLoaded: () => finish("loaded"), finish };
  },
}));

function getProps(isMarketDataLoaded: boolean) {
  return {
    tokensDataResult: {
      tokensData: isMarketDataLoaded ? {} : undefined,
      pricesUpdatedAt: isMarketDataLoaded ? 1 : undefined,
      isBalancesLoaded: false,
    },
    marketsInfo: isMarketDataLoaded
      ? { marketsInfoData: {}, isLoading: false }
      : { error: new Error("Failed to fetch"), isLoading: true },
    isCandlesLoaded: isMarketDataLoaded,
    positionsInfoData: undefined,
    positionsInfoDataSource: undefined,
    positionsInfoError: undefined,
    positionsInfoFailedDataSource: undefined,
    isPositionsInfoLoading: false,
    pageType: "trade",
  };
}

describe("useCollectSyntheticsMetrics", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.outcomes = {};
  });

  afterEach(cleanup);

  it.each([
    { name: "without a wallet", account: undefined, isWalletInitializing: false, isAccountDataAwaited: false },
    {
      name: "with a wallet",
      account: "0x1111111111111111111111111111111111111111",
      isWalletInitializing: false,
      isAccountDataAwaited: true,
    },
    { name: "while the wallet reconnects", account: undefined, isWalletInitializing: true, isAccountDataAwaited: true },
  ])(
    "reports a failed markets load as loaded by the fallback once the page has its data TRD-33: $name",
    async ({ account, isWalletInitializing, isAccountDataAwaited }) => {
      mocks.account = account;
      mocks.isWalletInitializing = isWalletInitializing;
      const { useCollectSyntheticsMetrics } = await import("./useCollectSyntheticsMetrics");
      const TestComponent = ({ isMarketDataLoaded }: { isMarketDataLoaded: boolean }) => {
        useCollectSyntheticsMetrics(getProps(isMarketDataLoaded) as Parameters<typeof useCollectSyntheticsMetrics>[0]);
        return null;
      };

      const { rerender } = render(<TestComponent isMarketDataLoaded={false} />);
      rerender(<TestComponent isMarketDataLoaded />);

      const accountDataOutcome = isAccountDataAwaited ? "waiting" : "loaded";
      expect(mocks.outcomes).toEqual({
        "marketsInfoLoad.failed": "loaded",
        "tradingDataLoad.failed": accountDataOutcome,
        "positionsListLoad.failed": accountDataOutcome,
      });
    },
    60_000
  );
});
