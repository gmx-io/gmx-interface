import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChangeEvent, ReactNode, useCallback, useMemo, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { StateCtx } from "context/SyntheticsStateContext/utils";
import {
  createMockSyntheticsState as createMockState,
  mockQueryClient as queryClient,
  mockWagmiConfig as wagmiConfig,
  noop,
} from "domain/testUtils/mockSyntheticsState";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import type { TokenData } from "sdk/utils/tokens/types";
import { TradeMode } from "sdk/utils/trade/types";

import { TradeboxMarginFields } from "../TradeboxMarginFields";

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

export type EdgeCaseStoryProps = {
  initialFromValue?: string;
  initialToValue?: string;
  maxAvailableAmount?: bigint;
  tradeMode?: TradeMode;
  initialTriggerPrice?: string;
  ethPrice?: number;
};

/**
 * Standard edge case story — same as main but for specific edge case configs.
 */
export function EdgeCaseStory({
  initialFromValue = "",
  initialToValue = "",
  maxAvailableAmount = expandDecimals(10000, 6),
  tradeMode = TradeMode.Market,
  initialTriggerPrice,
  ethPrice = 2000,
}: EdgeCaseStoryProps) {
  const [fromValue, setFromValue] = useState(initialFromValue);
  const [toValue, setToValue] = useState(initialToValue);
  const [focused, setFocused] = useState<"from" | "to">("from");
  const [triggerPrice, setTriggerPrice] = useState(initialTriggerPrice ?? "");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

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
    }),
    [dynamicEthToken]
  );

  const state = useMemo(
    () =>
      createMockState({
        tradeMode,
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
        triggerPriceInputValue: triggerPrice,
        tokensData,
      }),
    [tradeMode, fromValue, toValue, focused, triggerPrice, tokensData]
  );

  const isLimit = tradeMode === TradeMode.Limit || tradeMode === TradeMode.StopMarket;

  const handleTriggerPriceChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTriggerPrice(e.target.value);
  }, []);

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="focused-input">{focused}</span>
        <span data-testid="from-value">{fromValue}</span>
        <span data-testid="to-value">{toValue}</span>
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

/**
 * Story with undefined toToken (toTokenAddress points to non-existent token).
 */
export function UndefinedToTokenStory() {
  const [fromValue, setFromValue] = useState("1000");
  const [toValue, setToValue] = useState("0.5");
  const [focused, setFocused] = useState<"from" | "to">("from");

  const setToValueWithReset = useCallback((value: string, _resetPriceImpact: boolean) => {
    setToValue(value);
  }, []);

  const state = useMemo(
    () =>
      createMockState({
        toTokenAddress: "0x0000000000000000000000000000000000000000",
        fromTokenInputValue: fromValue,
        toTokenInputValue: toValue,
        focusedInput: focused,
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
      />
    </TestProviders>
  );
}

/**
 * Story for rapid input changes test.
 */
export function RapidInputStory() {
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
      }),
    [fromValue, toValue, focused]
  );

  return (
    <TestProviders state={state}>
      <div data-testid="debug-state" className="hidden">
        <span data-testid="to-value">{toValue}</span>
      </div>

      <TradeboxMarginFields
        maxAvailableAmount={expandDecimals(10000, 6)}
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
 * Story for very large values.
 */
export function LargeValuesStory() {
  const [fromValue, setFromValue] = useState("999999999");
  const [toValue, setToValue] = useState("500000");
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
      }),
    [fromValue, toValue, focused]
  );

  return (
    <TestProviders state={state}>
      <TradeboxMarginFields
        maxAvailableAmount={expandDecimals(999999999, 6)}
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
 * Story for dust/tiny amounts.
 */
export function DustAmountsStory() {
  const [fromValue, setFromValue] = useState("0.000001");
  const [toValue, setToValue] = useState("0.000000001");
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
      />
    </TestProviders>
  );
}
