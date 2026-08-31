import { ReactNode, useEffect, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { getLeverageKey, getSyntheticsTradeOptionsKey, TRADEBOX_SIZE_DENOMINATION_KEY } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectSetShouldFallbackToInternalSwap } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useExternalSwapHandler } from "domain/synthetics/externalSwaps/useExternalSwapHandler";
import type { MarketsInfoData } from "domain/synthetics/markets";
import type { PositionsInfoData } from "domain/synthetics/positions";
import type { TokensData } from "domain/synthetics/tokens";
import type { StoredTradeOptions } from "domain/synthetics/trade/useTradeboxState";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS, SECOND_ETH_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { createMockSubaccount } from "domain/testUtils/mockSubaccount";
import { MOCK_ACCOUNT, mockWagmiConfig as wagmiConfig } from "domain/testUtils/mockSyntheticsState";
import { MockSyntheticsStateProvider, DEFAULT_MOCK_TOKENS_DATA } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, ETH_TOKEN, NATIVE_ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { TradeBox } from "../TradeBox";
import { TradeBoxHeaderTabs } from "../TradeBoxHeaderTabs";

const EXPRESS_ON_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const EXPRESS_ON_SPONSORED_CALL = { isSponsoredCallAllowed: true };

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

/** Test backdoor: switches the gas payment token back to USDC (the conflicting one in gas-conflict scenarios). */
function SetConflictingGasTokenControl() {
  const { setGasPaymentTokenAddress } = useSettings();
  return (
    <button data-qa="test-set-conflicting-gas-token" onClick={() => setGasPaymentTokenAddress(USDC_ADDRESS)}>
      set conflicting gas token
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
  /** Make the seeded position a short instead of a long */
  positionIsShort?: boolean;
  /** Override the seeded position's liquidation price, in USD (default: ~1050 long / ~2950 short) */
  positionLiqPriceUsd?: number;
  /** Turn the leverage slider setting off: margin and size become independent inputs */
  manualLeverage?: boolean;
  /** Enable the "set acceptable price impact" setting (off by default) */
  acceptableImpactSetting?: boolean;
  /**
   * Market fixture variant: capped long open interest ($1500); a drained ETH side (no internal USDC->ETH swap
   * liquidity -> external route required); an expensive internal swap (~30bps fees -> external route optional);
   * or expensive + partial ETH side (internal route exists but can't fill $1000 -> external route rescues it)
   */
  marketScenario?:
    | "cappedLongOI"
    | "drainedEthPool"
    | "drainedUsdcPool"
    | "expensiveInternalSwap"
    | "expensivePartialEthPool";
  /** Mount useExternalSwapHandler (lives in SyntheticsPage, not TradeBox), enabling external swap quoting */
  withExternalSwapHandler?: boolean;
  /** Render a test button that arms the internal-swap fallback latch (prod sets it on a failed external-swap order) */
  withExternalSwapLatchControl?: boolean;
  /** Turn the "External swaps" setting off (on by default) */
  externalSwapsSettingOff?: boolean;
  /** Make express trading available: enables the relay-router features and Gelato sponsored calls */
  expressOn?: boolean;
  /** Activate One-Click Trading via a mock subaccount (implies nothing else — combine with expressOn) */
  withOneClickSubaccount?: boolean;
  /** Render a test button that switches the gas payment token back to conflicting USDC */
  withGasTokenControl?: boolean;
  /** Seed stored trade options with a Swap of the given pair (token addresses) */
  seedSwapPair?: { from: string; to: string };
  /** Seed a Long/Market position paying WETH with USDC collateral: the increase needs a WETH->USDC collateral swap */
  seedIncreaseCollateralSwap?: boolean;
  /** Zero out only the WETH balance (e.g. to leave no viable gas-token candidate) */
  zeroWethBalance?: boolean;
  /**
   * Blow up gas-token balances so the standard out-of-balance gas switcher never fires. The mock token
   * prices use a 30-dec-per-whole-token convention, which skews the express fee estimate (in token units)
   * by orders of magnitude — with realistic balances it would silently switch the gas token mid-test.
   */
  hugeGasTokenBalances?: boolean;
  /** Add a second ETH/USD pool (WETH-WETH, cheaper fees) next to the default one */
  withSecondEthPool?: boolean;
  /** Seed an existing long that uses WETH collateral (selected default is USDC); implies connected */
  withWethCollateralPosition?: boolean;
  /** Zero out all wallet balances */
  zeroBalances?: boolean;
  /** Seed the stored trade mode */
  seedTradeMode?: TradeMode;
  /** Seed a remembered explicit pool pick (the second ETH pool) for both directions */
  seedUserSelectedSecondEthPool?: boolean;
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
  positionIsShort = false,
  positionLiqPriceUsd,
  manualLeverage = false,
  acceptableImpactSetting = false,
  marketScenario,
  withExternalSwapHandler = false,
  withExternalSwapLatchControl = false,
  externalSwapsSettingOff = false,
  expressOn = false,
  withOneClickSubaccount = false,
  withGasTokenControl = false,
  seedSwapPair,
  seedIncreaseCollateralSwap = false,
  zeroWethBalance = false,
  hugeGasTokenBalances = false,
  withSecondEthPool = false,
  withWethCollateralPosition = false,
  zeroBalances = false,
  seedPayNativeEth = false,
  seedSwapWrap = false,
  seedLeverageOption,
  seedSizeDisplayMode,
  seedTradeMode,
  seedUserSelectedSecondEthPool = false,
}: TradeBoxStoryProps) {
  const isConnected = connected || withPosition || withWethCollateralPosition;

  const positionMarketInfo = useMemo(() => {
    if (!withPosition && !withWethCollateralPosition) {
      return undefined;
    }

    return createMockMarketInfo(
      undefined,
      positionIsShort
        ? { shortInterestUsd: expandDecimals(2000, 30), shortInterestInTokens: expandDecimals(1, 18) }
        : { longInterestUsd: expandDecimals(2000, 30), longInterestInTokens: expandDecimals(1, 18) }
    );
  }, [positionIsShort, withPosition, withWethCollateralPosition]);

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

    if (marketScenario === "drainedUsdcPool") {
      // No USDC in the pool: the internal WETH->USDC swap route can't fill anything -> external route is required.
      const data: MarketsInfoData = {
        [MOCK_MARKET_ADDRESS]: { ...primaryMarket, shortPoolAmount: 0n },
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
    if (zeroBalances) {
      return Object.fromEntries(
        Object.entries(DEFAULT_MOCK_TOKENS_DATA).map(([address, token]) => [
          address,
          { ...token, balance: 0n, walletBalance: 0n },
        ])
      );
    }

    if (zeroWethBalance) {
      return {
        ...DEFAULT_MOCK_TOKENS_DATA,
        [ETH_ADDRESS]: { ...DEFAULT_MOCK_TOKENS_DATA[ETH_ADDRESS], balance: 0n, walletBalance: 0n },
      };
    }

    if (hugeGasTokenBalances) {
      const huge = expandDecimals(1, 30);
      return Object.fromEntries(
        Object.entries(DEFAULT_MOCK_TOKENS_DATA).map(([address, token]) => [
          address,
          { ...token, balance: huge, walletBalance: huge },
        ])
      );
    }

    return undefined;
  }, [zeroBalances, zeroWethBalance, hugeGasTokenBalances]);

  const positionsInfoData: PositionsInfoData | undefined = useMemo(() => {
    if (!withPosition && !withWethCollateralPosition) {
      return undefined;
    }
    const position = createMockPositionInfo({
      account: MOCK_ACCOUNT,
      marketInfo: positionMarketInfo,
      collateralToken: withWethCollateralPosition ? ETH_TOKEN : undefined,
      isLong: !positionIsShort,
      liquidationPrice: positionLiqPriceUsd === undefined ? undefined : expandDecimals(positionLiqPriceUsd, 30),
    });
    return { [position.key]: position };
  }, [positionIsShort, positionLiqPriceUsd, positionMarketInfo, withPosition, withWethCollateralPosition]);

  const mockSubaccount = useMemo(
    () => (withOneClickSubaccount ? createMockSubaccount() : undefined),
    [withOneClickSubaccount]
  );

  const seedEntries = useMemo(() => {
    const entries: Array<[string, string]> = [];

    if (seedSwapPair) {
      const storedOptions: StoredTradeOptions = {
        tradeType: TradeType.Swap,
        tradeMode: TradeMode.Market,
        tokens: {
          fromTokenAddress: seedSwapPair.from,
          swapToTokenAddress: seedSwapPair.to,
          indexTokenAddress: ETH_ADDRESS,
        },
        markets: { [ETH_ADDRESS]: { long: MOCK_MARKET_ADDRESS, short: MOCK_MARKET_ADDRESS } },
        collaterals: {},
        isFromTokenGmxAccount: false,
      };
      entries.push([JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM)), JSON.stringify(storedOptions)]);
    }

    if (seedIncreaseCollateralSwap) {
      const storedOptions: StoredTradeOptions = {
        tradeType: TradeType.Long,
        tradeMode: TradeMode.Market,
        tokens: { fromTokenAddress: ETH_ADDRESS, indexTokenAddress: ETH_ADDRESS },
        markets: { [ETH_ADDRESS]: { long: MOCK_MARKET_ADDRESS, short: MOCK_MARKET_ADDRESS } },
        collaterals: { [MOCK_MARKET_ADDRESS]: { long: USDC_ADDRESS } },
        isFromTokenGmxAccount: false,
      };
      entries.push([JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM)), JSON.stringify(storedOptions)]);
    }

    if (seedPayNativeEth || seedSwapWrap || seedTradeMode !== undefined || seedUserSelectedSecondEthPool) {
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

      if (seedUserSelectedSecondEthPool) {
        storedOptions.userSelectedMarkets = {
          [ETH_ADDRESS]: { long: SECOND_ETH_MARKET_ADDRESS, short: SECOND_ETH_MARKET_ADDRESS },
        };
      }

      entries.push([JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM)), JSON.stringify(storedOptions)]);
    }

    if (seedLeverageOption !== undefined) {
      entries.push([JSON.stringify(getLeverageKey(ARBITRUM)), JSON.stringify(seedLeverageOption)]);
    }

    if (seedSizeDisplayMode !== undefined) {
      entries.push([JSON.stringify(TRADEBOX_SIZE_DENOMINATION_KEY), JSON.stringify(seedSizeDisplayMode)]);
    }

    return entries;
  }, [
    seedSwapPair,
    seedIncreaseCollateralSwap,
    seedPayNativeEth,
    seedSwapWrap,
    seedLeverageOption,
    seedSizeDisplayMode,
    seedTradeMode,
    seedUserSelectedSecondEthPool,
  ]);

  let content = (
    <MockSyntheticsStateProvider
      positionsInfoData={positionsInfoData}
      marketsInfoData={marketsInfoData}
      tokensData={tokensData}
      features={expressOn ? EXPRESS_ON_FEATURES : undefined}
      subaccount={mockSubaccount}
    >
      {withExternalSwapHandler && <ExternalSwapHandlerHost />}
      {withExternalSwapLatchControl && <ExternalSwapLatchControl />}
      {withGasTokenControl && <SetConflictingGasTokenControl />}
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

  return (
    <CtAppProviders wagmiConfig={wagmiConfig} autoConnect={isConnected}>
      {content}
    </CtAppProviders>
  );
}
