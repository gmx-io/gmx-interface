import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { useAccount, useConnect, WagmiProvider } from "wagmi";

import { ARBITRUM } from "config/chains";
import { getLeverageKey, getSyntheticsTradeOptionsKey, TRADEBOX_SIZE_DENOMINATION_KEY } from "config/localStorage";
import { ChainContextProvider } from "context/ChainContext/ChainContext";
import { ConnectModalProvider } from "context/ConnectModalContext/ConnectModalContext";
import { GlobalStateProvider } from "context/GlobalContext/GlobalContextProvider";
import { GmxAccountContextProvider } from "context/GmxAccountContext/GmxAccountContext";
import { PendingTxnsContextProvider } from "context/PendingTxnsContext/PendingTxnsContext";
import { SettingsContextProvider, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { SorterContextProvider } from "context/SorterContext/SorterContextProvider";
import { SubaccountContextProvider } from "context/SubaccountContext/SubaccountContextProvider";
import { TokenPermitsContextProvider } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { TokensBalancesContextProvider } from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { TokensFavoritesContextProvider } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { selectSetShouldFallbackToInternalSwap } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useExternalSwapHandler } from "domain/synthetics/externalSwaps/useExternalSwapHandler";
import type { MarketsInfoData } from "domain/synthetics/markets";
import type { PositionsInfoData } from "domain/synthetics/positions";
import type { TokensData } from "domain/synthetics/tokens";
import type { StoredTradeOptions } from "domain/synthetics/trade/useTradeboxState";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS, SECOND_ETH_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import {
  MOCK_ACCOUNT,
  mockQueryClient as queryClient,
  mockWagmiConfig as wagmiConfig,
} from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider, DEFAULT_MOCK_TOKENS_DATA } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, ETH_TOKEN, NATIVE_ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { TradeBox } from "../TradeBox";
import { TradeBoxHeaderTabs } from "../TradeBoxHeaderTabs";

const INITIAL_ENTRIES = ["/trade"];

function AutoConnect({ children }: { children: ReactNode }) {
  const { connect, connectors } = useConnect();
  const { status } = useAccount();

  useEffect(() => {
    if (status === "disconnected") {
      connect({ connector: connectors[0] });
    }
  }, [status, connect, connectors]);

  // mount children only when connected so effects don't run twice
  if (status !== "connected") {
    return null;
  }

  return <>{children}</>;
}

/** Mounts the external swap quote machinery, which lives in SyntheticsPage rather than TradeBox. */
function ExternalSwapHandlerHost() {
  useExternalSwapHandler();
  return null;
}

/** Test backdoor: arms the internal-swap fallback latch, which in prod is set by a failed external-swap order. */
function ExternalSwapLatchControl() {
  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);
  return (
    <button data-qa="test-external-swap-latch" onClick={() => setShouldFallbackToInternalSwap(true)}>
      arm external swap latch
    </button>
  );
}

/** Turns the "External swaps" setting off through the real settings context. */
function ExternalSwapsSettingOff({ children }: { children: ReactNode }) {
  const { externalSwapsEnabled, setExternalSwapsEnabled } = useSettings();

  useEffect(() => {
    if (externalSwapsEnabled) {
      setExternalSwapsEnabled(false);
    }
  }, [externalSwapsEnabled, setExternalSwapsEnabled]);

  if (externalSwapsEnabled) {
    return null;
  }

  return <>{children}</>;
}

/** Writes localStorage entries synchronously before children mount, so stateful hooks pick them up on init. */
function SeedLocalStorage({ entries, children }: { entries: Array<[string, string]>; children: ReactNode }) {
  // eslint-disable-next-line react/hook-use-state
  useState(() => {
    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
    }
    return true;
  });

  return <>{children}</>;
}

/** Turns the leverage slider setting off through the real settings context. */
function ManualLeverageMode({ children }: { children: ReactNode }) {
  const { isLeverageSliderEnabled, setIsLeverageSliderEnabled } = useSettings();

  useEffect(() => {
    if (isLeverageSliderEnabled) {
      setIsLeverageSliderEnabled(false);
    }
  }, [isLeverageSliderEnabled, setIsLeverageSliderEnabled]);

  if (isLeverageSliderEnabled) {
    return null;
  }

  return <>{children}</>;
}

/** Enables the "set acceptable price impact" setting through the real settings context. */
function AcceptablePriceImpactSetting({ children }: { children: ReactNode }) {
  const { isSetAcceptablePriceImpactEnabled, setIsSetAcceptablePriceImpactEnabled } = useSettings();

  useEffect(() => {
    if (!isSetAcceptablePriceImpactEnabled) {
      setIsSetAcceptablePriceImpactEnabled(true);
    }
  }, [isSetAcceptablePriceImpactEnabled, setIsSetAcceptablePriceImpactEnabled]);

  if (!isSetAcceptablePriceImpactEnabled) {
    return null;
  }

  return <>{children}</>;
}

export type TradeBoxStoryProps = {
  /** Connect the wagmi mock account before mounting */
  connected?: boolean;
  /** Seed an existing 2x ETH/USD long (1 ETH, 1000 USDC collateral); implies connected */
  withPosition?: boolean;
  /** Turn the leverage slider setting off: margin and size become independent inputs */
  manualLeverage?: boolean;
  /** Enable the "set acceptable price impact" setting (off by default) */
  acceptableImpactSetting?: boolean;
  /**
   * Market fixture variant: capped long open interest ($1500); a drained ETH side (no internal USDC->ETH swap
   * liquidity -> external route required); an expensive internal swap (~30bps fees -> external route optional);
   * or expensive + partial ETH side (internal route exists but can't fill $1000 -> external route rescues it)
   */
  marketScenario?: "cappedLongOI" | "drainedEthPool" | "expensiveInternalSwap" | "expensivePartialEthPool";
  /** Mount useExternalSwapHandler (lives in SyntheticsPage, not TradeBox), enabling external swap quoting */
  withExternalSwapHandler?: boolean;
  /** Render a test button that arms the internal-swap fallback latch (prod sets it on a failed external-swap order) */
  withExternalSwapLatchControl?: boolean;
  /** Turn the "External swaps" setting off (on by default) */
  externalSwapsSettingOff?: boolean;
  /** Add a second ETH/USD pool (WETH-WETH, cheaper fees) next to the default one */
  withSecondEthPool?: boolean;
  /** Seed an existing long that uses WETH collateral (selected default is USDC); implies connected */
  withWethCollateralPosition?: boolean;
  /** Zero out all wallet balances */
  zeroBalances?: boolean;
  /** Seed the stored trade mode */
  seedTradeMode?: TradeMode;
  /** Seed stored trade options with native ETH as the pay token (Long/Market) */
  seedPayNativeEth?: boolean;
  /** Seed stored trade options with a native ETH -> WETH swap (wrap) */
  seedSwapWrap?: boolean;
  /** Seed the stored leverage option (e.g. 150 to test clamping) */
  seedLeverageOption?: number;
  /** Seed the persisted size display denomination */
  seedSizeDisplayMode?: "token" | "usd";
};

/**
 * Mounts the trade widget (header tabs + TradeBox, as in TradeBoxResponsiveContainer)
 * with the production provider stack over mock fixtures.
 */
export function TradeBoxStory({
  connected = false,
  withPosition = false,
  manualLeverage = false,
  acceptableImpactSetting = false,
  marketScenario,
  withExternalSwapHandler = false,
  withExternalSwapLatchControl = false,
  externalSwapsSettingOff = false,
  withSecondEthPool = false,
  withWethCollateralPosition = false,
  zeroBalances = false,
  seedPayNativeEth = false,
  seedSwapWrap = false,
  seedLeverageOption,
  seedSizeDisplayMode,
  seedTradeMode,
}: TradeBoxStoryProps) {
  const isConnected = connected || withPosition || withWethCollateralPosition;

  const positionMarketInfo = useMemo(() => {
    if (!withPosition && !withWethCollateralPosition) {
      return undefined;
    }

    return createMockMarketInfo(undefined, {
      longInterestUsd: expandDecimals(2000, 30),
      longInterestInTokens: expandDecimals(1, 18),
    });
  }, [withPosition, withWethCollateralPosition]);

  const marketsInfoData = useMemo<MarketsInfoData | undefined>(() => {
    const primaryMarket = positionMarketInfo ?? createMockMarketInfo();

    if (marketScenario === "cappedLongOI") {
      const data: MarketsInfoData = {
        [MOCK_MARKET_ADDRESS]: { ...primaryMarket, maxOpenInterestLong: expandDecimals(1500, 30) },
      };
      return data;
    }

    if (marketScenario === "drainedEthPool") {
      // No ETH in the pool: the internal USDC->ETH swap route can't fill anything -> external route is required.
      const data: MarketsInfoData = {
        [MOCK_MARKET_ADDRESS]: { ...primaryMarket, longPoolAmount: 0n },
      };
      return data;
    }

    if (marketScenario === "expensiveInternalSwap" || marketScenario === "expensivePartialEthPool") {
      // ~30bps swap fee: the internal route's total fees breach the -15bps external-swap
      // threshold, so the external route becomes "optional" (used when it quotes better).
      const expensiveFees = {
        swapFeeFactorForBalanceWasImproved: expandDecimals(3, 27),
        swapFeeFactorForBalanceWasNotImproved: expandDecimals(3, 27),
      };
      const data: MarketsInfoData = {
        [MOCK_MARKET_ADDRESS]: {
          ...primaryMarket,
          ...expensiveFees,
          // Partial variant: 0.2 ETH in the pool can't fill a $1000 swap -> only the external route can.
          ...(marketScenario === "expensivePartialEthPool" ? { longPoolAmount: expandDecimals(2, 17) } : {}),
        },
      };
      return data;
    }

    if (withSecondEthPool) {
      const secondPool = createMockMarketInfo(undefined, {
        marketTokenAddress: SECOND_ETH_MARKET_ADDRESS,
        shortTokenAddress: ETH_ADDRESS,
        shortToken: ETH_TOKEN,
        isSameCollaterals: true,
        name: "ETH/USD [WETH-WETH]",
        shortPoolAmount: expandDecimals(1000, 18),
        maxShortPoolAmount: expandDecimals(10000, 18),
        // cheaper than the default pool
        positionFeeFactorForBalanceWasImproved: expandDecimals(1, 25),
        positionFeeFactorForBalanceWasNotImproved: expandDecimals(2, 25),
        positionImpactFactorNegative: 0n,
        swapImpactFactorNegative: 0n,
      });
      const data: MarketsInfoData = {
        [MOCK_MARKET_ADDRESS]: primaryMarket,
        [SECOND_ETH_MARKET_ADDRESS]: secondPool,
      };
      return data;
    }

    if (positionMarketInfo) {
      return { [MOCK_MARKET_ADDRESS]: positionMarketInfo };
    }

    return undefined;
  }, [marketScenario, positionMarketInfo, withSecondEthPool]);

  const tokensData: TokensData | undefined = useMemo(() => {
    if (!zeroBalances) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(DEFAULT_MOCK_TOKENS_DATA).map(([address, token]) => [
        address,
        { ...token, balance: 0n, walletBalance: 0n },
      ])
    );
  }, [zeroBalances]);

  const positionsInfoData: PositionsInfoData | undefined = useMemo(() => {
    if (!withPosition && !withWethCollateralPosition) {
      return undefined;
    }
    const position = createMockPositionInfo({
      account: MOCK_ACCOUNT,
      marketInfo: positionMarketInfo,
      collateralToken: withWethCollateralPosition ? ETH_TOKEN : undefined,
    });
    return { [position.key]: position };
  }, [positionMarketInfo, withPosition, withWethCollateralPosition]);

  const seedEntries = useMemo(() => {
    const entries: Array<[string, string]> = [];

    if (seedPayNativeEth || seedSwapWrap || seedTradeMode !== undefined) {
      const fromTokenAddress = seedPayNativeEth || seedSwapWrap ? NATIVE_ETH_ADDRESS : USDC_ADDRESS;
      const storedOptions: StoredTradeOptions = {
        tradeType: seedSwapWrap ? TradeType.Swap : TradeType.Long,
        tradeMode: seedTradeMode ?? TradeMode.Market,
        tokens: seedSwapWrap
          ? { fromTokenAddress: NATIVE_ETH_ADDRESS, swapToTokenAddress: ETH_ADDRESS, indexTokenAddress: ETH_ADDRESS }
          : { fromTokenAddress, indexTokenAddress: ETH_ADDRESS },
        markets: { [ETH_ADDRESS]: { long: MOCK_MARKET_ADDRESS, short: MOCK_MARKET_ADDRESS } },
        collaterals: {},
        isFromTokenGmxAccount: false,
      };
      entries.push([JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM)), JSON.stringify(storedOptions)]);
    }

    if (seedLeverageOption !== undefined) {
      entries.push([JSON.stringify(getLeverageKey(ARBITRUM)), JSON.stringify(seedLeverageOption)]);
    }

    if (seedSizeDisplayMode !== undefined) {
      entries.push([JSON.stringify(TRADEBOX_SIZE_DENOMINATION_KEY), JSON.stringify(seedSizeDisplayMode)]);
    }

    return entries;
  }, [seedPayNativeEth, seedSwapWrap, seedLeverageOption, seedSizeDisplayMode, seedTradeMode]);

  let content = (
    <MockSyntheticsStateProvider
      positionsInfoData={positionsInfoData}
      marketsInfoData={marketsInfoData}
      tokensData={tokensData}
    >
      {withExternalSwapHandler && <ExternalSwapHandlerHost />}
      {withExternalSwapLatchControl && <ExternalSwapLatchControl />}
      <div className="text-body-medium flex flex-col rounded-8">
        <TradeBoxHeaderTabs />
        <TradeBox isMobile={false} />
      </div>
    </MockSyntheticsStateProvider>
  );

  if (seedEntries.length > 0) {
    content = <SeedLocalStorage entries={seedEntries}>{content}</SeedLocalStorage>;
  }

  if (manualLeverage) {
    content = <ManualLeverageMode>{content}</ManualLeverageMode>;
  }

  if (externalSwapsSettingOff) {
    content = <ExternalSwapsSettingOff>{content}</ExternalSwapsSettingOff>;
  }

  if (acceptableImpactSetting) {
    content = <AcceptablePriceImpactSetting>{content}</AcceptablePriceImpactSetting>;
  }

  if (isConnected) {
    content = <AutoConnect>{content}</AutoConnect>;
  }

  return (
    <MemoryRouter initialEntries={INITIAL_ENTRIES}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <GmxAccountContextProvider>
            <ChainContextProvider>
              <GlobalStateProvider>
                <SettingsContextProvider>
                  <PendingTxnsContextProvider>
                    <I18nProvider i18n={i18n}>
                      <ConnectModalProvider>
                        <TokensBalancesContextProvider>
                          <TokenPermitsContextProvider>
                            <SubaccountContextProvider>
                              <TokensFavoritesContextProvider>
                                <SorterContextProvider>{content}</SorterContextProvider>
                              </TokensFavoritesContextProvider>
                            </SubaccountContextProvider>
                          </TokenPermitsContextProvider>
                        </TokensBalancesContextProvider>
                      </ConnectModalProvider>
                    </I18nProvider>
                  </PendingTxnsContextProvider>
                </SettingsContextProvider>
              </GlobalStateProvider>
            </ChainContextProvider>
          </GmxAccountContextProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
