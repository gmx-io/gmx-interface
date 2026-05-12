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
import { expandDecimals } from "lib/numbers";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

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

export type StoryProps = {
  tradeMode?: TradeMode;
  tradeType?: TradeType;
  isLeverageSliderEnabled?: boolean;
  initialFromValue?: string;
  initialToValue?: string;
  initialTriggerPrice?: string;
  maxAvailableAmount?: bigint;
};

export function TradeboxMarginFieldsStory({
  tradeMode = TradeMode.Market,
  tradeType = TradeType.Long,
  isLeverageSliderEnabled = true,
  initialFromValue = "1000",
  initialToValue = "0.5",
  initialTriggerPrice,
  maxAvailableAmount = expandDecimals(10000, 6),
}: StoryProps) {
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
