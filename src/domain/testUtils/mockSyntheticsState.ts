import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { arbitrum, base } from "wagmi/chains";
import { mock } from "wagmi/connectors";

import { ARBITRUM } from "config/chains";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { EditingOrderState } from "domain/synthetics/orders/types";
import type { PositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import type { DeepPartial } from "lib/types";
import type { MarketInfo } from "sdk/utils/markets/types";
import type { OrdersInfoData } from "sdk/utils/orders/types";
import type { PositionsInfoData } from "sdk/utils/positions/types";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { MOCK_POSITIONS_CONSTANTS } from "./mockChainData";
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
  leverageOption?: number;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  tokensData?: Record<string, TokenData>;
  marketInfo?: MarketInfo;
  collateralAddress?: string;
  uiFeeFactor?: bigint;
  positionsConstants?: PositionsConstants;
  proDiscountFactor?: bigint;
  account?: string;
  positionsInfoData?: PositionsInfoData;
  isPositionsLoading?: boolean;
  ordersInfoData?: OrdersInfoData;
  orderEditor?: {
    editingOrderState?: EditingOrderState;
    sizeInputValue?: string;
    triggerPriceInputValue?: string;
  };
  isPnlInLeverage?: boolean;
  isSetAcceptablePriceImpactEnabled?: boolean;
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
    leverageOption = 20000,
    fromTokenAddress = USDC_ADDRESS,
    toTokenAddress = ETH_ADDRESS,
    marketAddress,
    tokensData = { [USDC_ADDRESS]: USDC_TOKEN, [ETH_ADDRESS]: ETH_TOKEN },
    marketInfo,
    collateralAddress = fromTokenAddress,
    uiFeeFactor = 0n,
    positionsConstants = "positionsConstants" in overrides ? overrides.positionsConstants : MOCK_POSITIONS_CONSTANTS,
    proDiscountFactor = "proDiscountFactor" in overrides ? overrides.proDiscountFactor : 0n,
    account,
    positionsInfoData = "positionsInfoData" in overrides ? overrides.positionsInfoData : {},
    isPositionsLoading = false,
    ordersInfoData = {},
    orderEditor,
    isPnlInLeverage = false,
    isSetAcceptablePriceImpactEnabled = false,
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
      positionsInfo: { positionsInfoData, isLoading: isPositionsLoading },
      ordersInfo: { ordersInfoData },
      uiFeeFactor,
      proDiscountFactor,
      jitLiquidityData: {},
      isFirstOrder: false,
      account,
      positionsConstants,
    },
    externalSwap: {
      requestResult: undefined,
      setRequestResult: () => undefined,
      shouldFallbackToInternalSwap: false,
      setShouldFallbackToInternalSwap: () => undefined,
      shouldForceExternalSwap: false,
      setShouldForceExternalSwap: () => undefined,
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
      collateralAddress,
      collateralToken: tokensData[collateralAddress] ?? USDC_TOKEN,
      focusedInput,
      fromTokenInputValue,
      toTokenInputValue,
      triggerPriceInputValue,
      isFromTokenGmxAccount: false,
      leverageOption,
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      availableTokensOptions: {
        swapTokens: Object.values(tokensData),
        infoTokens: tokensData,
        sortedLongAndShortTokens: [toTokenAddress],
      },
    },
    settings: {
      isLeverageSliderEnabled,
      isPnlInLeverage,
      isSetAcceptablePriceImpactEnabled,
      savedAllowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
    },
    orderEditor: {
      editingOrderState: undefined,
      sizeInputValue: "",
      triggerPriceInputValue: "",
      ...orderEditor,
    },
  };

  return state as SyntheticsState;
}

export const mockQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

export const MOCK_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export const mockWagmiConfig = createConfig({
  chains: [arbitrum],
  transports: { [arbitrum.id]: http() },
  connectors: [mock({ accounts: [MOCK_ACCOUNT] })],
});

export const mockMultichainWagmiConfig = createConfig({
  chains: [arbitrum, base],
  transports: { [arbitrum.id]: http(), [base.id]: http() },
  connectors: [mock({ accounts: [MOCK_ACCOUNT] })],
});
