import { ReactNode, useMemo } from "react";

import { ARBITRUM } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { latestStateRef, StateCtx } from "context/SyntheticsStateContext/utils";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { useInitExternalSwapState } from "domain/synthetics/externalSwaps/useInitExternalSwapState";
import type { MarketsInfoData } from "domain/synthetics/markets";
import type { OrdersInfoData } from "domain/synthetics/orders";
import { useOrderEditorState } from "domain/synthetics/orders/useOrderEditorState";
import type { PositionsInfoData } from "domain/synthetics/positions";
import type { TokensData } from "domain/synthetics/tokens";
import { useConfirmationBoxState } from "domain/synthetics/trade/useConfirmationBoxState";
import { usePositionEditorState } from "domain/synthetics/trade/usePositionEditorState";
import { usePositionSellerState } from "domain/synthetics/trade/usePositionSellerState";
import { useTradeboxState } from "domain/synthetics/trade/useTradeboxState";
import useWallet from "lib/wallets/useWallet";

import { MOCK_GAS_LIMITS, MOCK_GAS_PRICE, MOCK_POSITIONS_CONSTANTS } from "./mockChainData";
import { createMockMarketInfo, createMockMarketsData, MOCK_MARKET_ADDRESS } from "./mockMarketInfo";
import { noop } from "./mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, NATIVE_ETH_ADDRESS, NATIVE_ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "./mockTokens";

export const DEFAULT_MOCK_TOKENS_DATA: TokensData = {
  [USDC_ADDRESS]: USDC_TOKEN,
  [ETH_ADDRESS]: ETH_TOKEN,
  [NATIVE_ETH_ADDRESS]: NATIVE_ETH_TOKEN,
};

export const DEFAULT_MOCK_MARKETS_INFO_DATA: MarketsInfoData = {
  [MOCK_MARKET_ADDRESS]: createMockMarketInfo(),
};

const EMPTY_POSITIONS_INFO_DATA: PositionsInfoData = {};
const EMPTY_ORDERS_INFO_DATA: OrdersInfoData = {};

export type MockSyntheticsStateProviderProps = {
  children: ReactNode;
  tokensData?: TokensData;
  marketsInfoData?: MarketsInfoData;
  positionsInfoData?: PositionsInfoData;
  ordersInfoData?: OrdersInfoData;
  uiFeeFactor?: bigint;
  isFirstOrder?: boolean;
};

/**
 * Prod-like SyntheticsState for component tests: chain data is static mock data,
 * interactive parts come from the real hooks, so derived selectors compute through
 * the production pipeline. Requires the app provider stack (see TradeBox.ct.stories.tsx).
 */
export function MockSyntheticsStateProvider({
  children,
  tokensData = DEFAULT_MOCK_TOKENS_DATA,
  marketsInfoData = DEFAULT_MOCK_MARKETS_INFO_DATA,
  positionsInfoData = EMPTY_POSITIONS_INFO_DATA,
  ordersInfoData = EMPTY_ORDERS_INFO_DATA,
  uiFeeFactor = 0n,
  isFirstOrder = false,
}: MockSyntheticsStateProviderProps) {
  const chainId = ARBITRUM;
  const { account, signer } = useWallet();
  const settings = useSettings();
  const subaccountState = useSubaccountContext();
  const tokenPermitsState = useTokenPermitsContext();
  const externalSwapState = useInitExternalSwapState();
  const orderEditorState = useOrderEditorState(ordersInfoData);
  const positionSellerState = usePositionSellerState(chainId, undefined, undefined);
  const positionEditorState = usePositionEditorState(chainId, undefined);
  const confirmationBoxState = useConfirmationBoxState();

  const marketsData = useMemo(() => createMockMarketsData(Object.values(marketsInfoData)), [marketsInfoData]);

  const tradeboxState = useTradeboxState(chainId, true, {
    marketsData,
    marketsInfoData,
    tokensData,
    positionsInfoData,
    ordersInfoData,
    srcChainId: undefined,
    jitLiquidityMap: undefined,
  });

  const state = useMemo(() => {
    const s: SyntheticsState = {
      pageType: "trade",
      globals: {
        chainId,
        srcChainId: undefined,
        account,
        signer,
        markets: { marketsData, marketsAddresses: Object.keys(marketsData) },
        marketsInfo: { marketsInfoData, isLoading: false },
        positionsInfo: { isLoading: false, positionsInfoData },
        tokensDataResult: {
          tokensData,
          pricesUpdatedAt: undefined,
          isGmxAccountBalancesLoaded: true,
          isWalletBalancesLoaded: true,
          isBalancesLoaded: true,
          error: undefined,
        },
        ordersInfo: { ordersInfoData, count: Object.keys(ordersInfoData).length, isLoading: false },
        positionsConstants: MOCK_POSITIONS_CONSTANTS,
        uiFeeFactor,
        userReferralInfo: undefined,
        depositMarketTokensData: undefined,
        progressiveDepositMarketTokensData: undefined,
        multichainMarketTokensBalancesResult: { tokenBalances: {}, isLoading: false },
        glvInfo: { glvs: undefined, glvData: undefined, isLoading: false },

        closingPositionKey: undefined,
        setClosingPositionKey: noop,
        closingPositionOrderOption: undefined,

        keepLeverage: true,
        setKeepLeverage: noop,

        missedCoinsModalPlace: undefined,
        setMissedCoinsModalPlace: noop,

        gasLimits: MOCK_GAS_LIMITS,
        gasPrice: MOCK_GAS_PRICE,

        lastWeekAccountStats: undefined,
        lastMonthAccountStats: undefined,
        accountStats: undefined,
        isCandlesLoaded: false,
        setIsCandlesLoaded: noop,
        isLargeAccount: false,
        isFirstOrder,
        blockTimestampData: undefined,

        oracleSettings: undefined,

        jitLiquidityData: { jitLiquidityMap: undefined },
      },
      claims: { accruedPositionPriceImpactFees: [], claimablePositionPriceImpactFees: [] },
      // page-scoped, unrelated to trading widgets
      leaderboard: {} as SyntheticsState["leaderboard"],
      settings,
      subaccountState,
      tradebox: tradeboxState,
      externalSwap: externalSwapState,
      tokenPermitsState,
      orderEditor: orderEditorState,
      positionSeller: positionSellerState,
      positionEditor: positionEditorState,
      confirmationBox: confirmationBoxState,
      poolsDetails: undefined,
      // populate if the component under test grows feature-gated or oracle-based behavior
      features: undefined,
      uiFlags: undefined,
      sponsoredCallBalanceData: undefined,
      gasPaymentTokenAllowance: undefined,
      l1ExpressOrderGasReference: undefined,
    };

    return s;
  }, [
    chainId,
    account,
    signer,
    marketsData,
    marketsInfoData,
    tokensData,
    positionsInfoData,
    ordersInfoData,
    uiFeeFactor,
    isFirstOrder,
    settings,
    subaccountState,
    tokenPermitsState,
    tradeboxState,
    externalSwapState,
    orderEditorState,
    positionSellerState,
    positionEditorState,
    confirmationBoxState,
  ]);

  latestStateRef.current = state;

  return <StateCtx.Provider value={state}>{children}</StateCtx.Provider>;
}
