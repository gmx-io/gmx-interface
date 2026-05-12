import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChangeEvent, ReactNode, useCallback, useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import {
  createMockSyntheticsState as createMockState,
  mockQueryClient as queryClient,
  mockWagmiConfig as wagmiConfig,
  noop,
} from "domain/testUtils/mockSyntheticsState";
import { BTC_ADDRESS, BTC_TOKEN, ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { TradeboxMarginFields } from "../TradeboxMarginFields";

function useDynamicTokensData(ethPrice: number) {
  const dynamicEthToken = useMemo(
    () =>
      ({
        ...ETH_TOKEN,
        prices: {
          minPrice: expandDecimals(ethPrice, 30),
          maxPrice: expandDecimals(ethPrice, 30),
        },
      }) as TokenData,
    [ethPrice]
  );

  const tokensData = useMemo(
    () => ({
      [USDC_ADDRESS]: USDC_TOKEN,
      [ETH_ADDRESS]: dynamicEthToken,
      [BTC_ADDRESS]: BTC_TOKEN,
    }),
    [dynamicEthToken]
  );

  return { dynamicEthToken, tokensData };
}

function TestProviders({ state, children }: { state: SyntheticsState; children: ReactNode }) {
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>
            <I18nProvider i18n={i18n}>
              <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
            </I18nProvider>
          </RainbowKitProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export type IntegrationStoryProps = {
  tradeMode?: TradeMode;
  tradeType?: TradeType;
  isLeverageSliderEnabled?: boolean;
  initialFromValue?: string;
  initialToValue?: string;
  initialTriggerPrice?: string;
  maxAvailableAmount?: bigint;
};

/**
 * Integration story that exposes internal state for testing.
 * Renders data attributes for focusedInput, toTokenInputValue, etc.
 */
export function IntegrationStory({
  tradeMode = TradeMode.Market,
  tradeType = TradeType.Long,
  isLeverageSliderEnabled = true,
  initialFromValue = "1000",
  initialToValue = "0.5",
  initialTriggerPrice,
  maxAvailableAmount = expandDecimals(10000, 6),
}: IntegrationStoryProps) {
  const [fromValue, setFromValue] = useState(initialFromValue);
  const [toValue, setToValue] = useState(initialToValue);
  const [focused, setFocused] = useState<"from" | "to">("from");
  const [triggerPrice, setTriggerPrice] = useState(initialTriggerPrice ?? "");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const state = useMemo(
    () =>
      createMockState({
        tradeMode,
        tradeType,
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        triggerPriceInputValue: triggerPrice,
        isLeverageSliderEnabled,
      }),
    [tradeMode, tradeType, fromValue, toValue, focused, triggerPrice, isLeverageSliderEnabled]
  );

  const isLimit = tradeMode === TradeMode.Limit || tradeMode === TradeMode.StopMarket;

  const handleTriggerPriceChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTriggerPrice(e.target.value);
  }, []);

  return (
    <TestProviders state={state}>
      {/* Debug output for test assertions */}
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
        <span data-testid="trigger-price">{triggerPrice}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={maxAvailableAmount}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
        triggerPriceInputValue={isLimit ? triggerPrice : undefined}
        onTriggerPriceInputChange={isLimit ? handleTriggerPriceChange : undefined}
        onMarkPriceClick={isLimit ? () => setTriggerPrice("2000") : undefined}
      />
    </TestProviders>
  );
}

export type PriceChangeStoryProps = {
  initialFromValue?: string;
  initialToValue?: string;
  ethPrice?: number;
  isLeverageSliderEnabled?: boolean;
  maxAvailableAmount?: bigint;
};

/**
 * Story with dynamic ETH price for testing field recalculation on price changes.
 * Uses ethPrice prop controlled via component.update() in tests.
 */
export function PriceChangeStory({
  initialFromValue = "1000",
  initialToValue = "1",
  ethPrice = 2000,
  isLeverageSliderEnabled = true,
  maxAvailableAmount = expandDecimals(10000, 6),
}: PriceChangeStoryProps) {
  const [fromValue, setFromValue] = useState(initialFromValue);
  const [toValue, setToValue] = useState(initialToValue);
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const { tokensData } = useDynamicTokensData(ethPrice);

  const state = useMemo(
    () =>
      createMockState({
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        isLeverageSliderEnabled,
        tokensData,
      }),
    [fromValue, toValue, focused, isLeverageSliderEnabled, tokensData]
  );

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
        <span data-testid="eth-price">{ethPrice}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={maxAvailableAmount}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
      />
    </TestProviders>
  );
}

export type LeverageOffStoryProps = {
  initialFromValue?: string;
  initialToValue?: string;
  ethPrice?: number;
  maxAvailableAmount?: bigint;
};

/**
 * Story with isLeverageSliderEnabled=false and marketInfo provided,
 * so the slider drives size (not margin) and maxSizeByMarginInTokens is computed.
 */
export function LeverageOffStory({
  initialFromValue = "1000",
  initialToValue = "",
  ethPrice = 2000,
  maxAvailableAmount = expandDecimals(10000, 6),
}: LeverageOffStoryProps) {
  const [fromValue, setFromValue] = useState(initialFromValue);
  const [toValue, setToValue] = useState(initialToValue);
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const { dynamicEthToken, tokensData } = useDynamicTokensData(ethPrice);
  const marketInfo = useMemo(() => createMockMarketInfo(dynamicEthToken), [dynamicEthToken]);

  const state = useMemo(
    () =>
      createMockState({
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        isLeverageSliderEnabled: false,
        tokensData,
        marketInfo,
      }),
    [fromValue, toValue, focused, tokensData, marketInfo]
  );

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
        <span data-testid="eth-price">{ethPrice}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={maxAvailableAmount}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
      />
    </TestProviders>
  );
}

export type EthMarginPriceChangeStoryProps = {
  initialFromValue?: string;
  initialToValue?: string;
  ethPrice?: number;
  maxAvailableAmount?: bigint;
};

/**
 * Story with ETH as pay token (margin ≠ collateral) and dynamic price.
 */
export function EthMarginPriceChangeStory({
  initialFromValue = "5",
  initialToValue = "1",
  ethPrice = 2000,
  maxAvailableAmount = expandDecimals(10, 18),
}: EthMarginPriceChangeStoryProps) {
  const [fromValue, setFromValue] = useState(initialFromValue);
  const [toValue, setToValue] = useState(initialToValue);
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const { tokensData } = useDynamicTokensData(ethPrice);

  const state = useMemo(
    () =>
      createMockState({
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        tokensData,
        fromTokenAddress: ETH_ADDRESS,
      }),
    [fromValue, toValue, focused, tokensData]
  );

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
        <span data-testid="eth-price">{ethPrice}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={maxAvailableAmount}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
      />
    </TestProviders>
  );
}

/**
 * Story with no onTriggerPriceInputChange to test that PriceField is not rendered.
 */
export function IntegrationNoTriggerCallbackStory() {
  const [fromValue, setFromValue] = useState("1000");
  const [toValue, setToValue] = useState("0.5");
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const state = useMemo(
    () =>
      createMockState({
        tradeMode: TradeMode.Limit,
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        triggerPriceInputValue: "2000",
      }),
    [fromValue, toValue, focused]
  );

  return (
    <TestProviders state={state}>
      <TradeboxMarginFields
        maxAvailableAmount={expandDecimals(10000, 6)}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
        triggerPriceInputValue={undefined}
        onTriggerPriceInputChange={undefined}
      />
    </TestProviders>
  );
}

/**
 * Story for maxAvailableAmount divergence test.
 * Balance is 10000 USDC but maxAvailableAmount is only 5000 USDC.
 */
export function MaxAvailableDivergenceStory() {
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const state = useMemo(
    () =>
      createMockState({
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        isLeverageSliderEnabled: true,
      }),
    [fromValue, toValue, focused]
  );

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={expandDecimals(5000, 6)}
        onSelectFromTokenAddress={noop}
        onDepositTokenAddress={noop}
        fromTokenInputValue={fromValue}
        setFromTokenInputValue={(value) => setFromValue(value)}
        setFocusedInput={setFocused}
        toTokenInputValue={toValue}
        setToTokenInputValue={setToValueWithReset}
      />
    </TestProviders>
  );
}
