import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { arbitrum } from "wagmi/chains";

import { ARBITRUM } from "config/chains";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { DeepPartial } from "lib/types";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "./mockTokens";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export type MockSyntheticsStateOverrides = {
  tradeMode?: TradeMode;
  tradeType?: TradeType;
  fromTokenInputValue?: string;
  toTokenInputValue?: string;
  focusedInput?: "from" | "to";
  triggerPriceInputValue?: string;
  isLeverageSliderEnabled?: boolean;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tokensData?: Record<string, TokenData>;
  marketInfo?: MarketInfo;
};

/**
 * Builds a minimal SyntheticsState for tests that only need tradebox/globals fields.
 * Extend the overrides type if your test needs broader coverage.
 */
export function createMockSyntheticsState(overrides: MockSyntheticsStateOverrides = {}): SyntheticsState {
  const {
    tradeMode = TradeMode.Market,
    tradeType = TradeType.Long,
    fromTokenInputValue = "1000",
    toTokenInputValue = "0.5",
    focusedInput = "from",
    triggerPriceInputValue = "",
    isLeverageSliderEnabled = true,
    fromTokenAddress = USDC_ADDRESS,
    toTokenAddress = ETH_ADDRESS,
    marketAddress,
    tokensData = { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: ETH_TOKEN },
    marketInfo,
  } = overrides;

  const state: DeepPartial<SyntheticsState> = {
    pageType: "trade",
    globals: {
      chainId: ARBITRUM,
      srcChainId: undefined,
      tokensDataResult: { tokensData },
      marketsInfo: {
        marketsInfoData: marketInfo ? { [marketInfo.marketTokenAddress]: marketInfo } : {},
      },
      positionsInfo: { positionsInfoData: {} },
      ordersInfo: { ordersInfoData: {} },
      uiFeeFactor: 0n,
      jitLiquidityData: {},
      isFirstOrder: false,
      account: undefined,
    },
    externalSwap: {
      baseOutput: undefined,
      setBaseOutput: () => undefined,
      shouldFallbackToInternalSwap: false,
      setShouldFallbackToInternalSwap: () => undefined,
    },
    claims: {
      accruedPositionPriceImpactFees: [],
      claimablePositionPriceImpactFees: [],
    },
    tradebox: {
      tradeType,
      tradeMode,
      fromTokenAddress,
      toTokenAddress,
      marketAddress: marketInfo ? marketInfo.marketTokenAddress : marketAddress,
      marketInfo: marketInfo ?? undefined,
      collateralAddress: fromTokenAddress,
      collateralToken: tokensData[fromTokenAddress] ?? USDC_TOKEN,
      focusedInput,
      fromTokenInputValue,
      toTokenInputValue,
      triggerPriceInputValue,
      isFromTokenGmxAccount: false,
      leverageOption: 20000,
      availableTokensOptions: {
        swapTokens: Object.values(tokensData),
        infoTokens: tokensData,
        sortedLongAndShortTokens: [toTokenAddress],
      },
    },
    settings: {
      isLeverageSliderEnabled,
    },
  };

  return state as SyntheticsState;
}

export const mockQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

export const mockWagmiConfig = createConfig({
  chains: [arbitrum],
  transports: { [arbitrum.id]: http() },
});
