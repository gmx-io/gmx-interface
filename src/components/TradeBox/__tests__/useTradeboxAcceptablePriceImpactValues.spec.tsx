import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { selectorValues } = vi.hoisted(() => ({
  selectorValues: new Map<string, unknown>(),
}));

// selectors are mocked to plain keys that useSelector reads from a test-controlled map
vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxDecreasePositionAmounts: "decreaseAmounts",
  selectTradeboxFromTokenAddress: "fromTokenAddress",
  selectTradeboxIncreasePositionAmounts: "increaseAmounts",
  selectTradeboxIsAcceptablePriceImpactCustomized: "isCustomized",
  selectTradeboxLeverage: "leverage",
  selectTradeboxMarketInfo: "marketInfo",
  selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps: "setDefaultBps",
  selectTradeboxSetIsAcceptablePriceImpactCustomized: "setIsCustomized",
  selectTradeboxSetSelectedAcceptablePriceImpactBps: "setSelectedBps",
  selectTradeboxToTokenAddress: "toTokenAddress",
  selectTradeboxTradeFlags: "tradeFlags",
  selectTradeboxTriggerPrice: "triggerPrice",
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: (key: string) => selectorValues.get(key),
}));

import { useTradeboxAcceptablePriceImpactValues } from "../hooks/useTradeboxAcceptablePriceImpactValues";

type AmountsWithRecommendation = {
  acceptablePrice: bigint;
  acceptablePriceDeltaBps: bigint;
  recommendedAcceptablePriceDeltaBps: bigint;
};

type TradeboxValues = {
  tradeFlags: { isLimit: boolean; isTrigger: boolean; isLong: boolean; isSwap: boolean };
  marketInfo: { indexTokenAddress: string } | undefined;
  leverage: bigint | undefined;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromTokenInputValue: string;
  toTokenInputValue: string;
  triggerPrice: bigint | undefined;
  increaseAmounts: AmountsWithRecommendation | undefined;
  decreaseAmounts: AmountsWithRecommendation | undefined;
};

const LIMIT_FLAGS = { isLimit: true, isTrigger: false, isLong: true, isSwap: false };
const TRIGGER_FLAGS = { isLimit: false, isTrigger: true, isLong: true, isSwap: false };
const MARKET_FLAGS = { isLimit: false, isTrigger: false, isLong: true, isSwap: false };

const ETH_MARKET = { indexTokenAddress: "0xeth" };

function increaseWithRecommendation(bps: bigint): AmountsWithRecommendation {
  return {
    acceptablePrice: 1900n * 10n ** 30n,
    acceptablePriceDeltaBps: -bps,
    recommendedAcceptablePriceDeltaBps: bps,
  };
}

const limitOrderValues: TradeboxValues = {
  tradeFlags: LIMIT_FLAGS,
  marketInfo: ETH_MARKET,
  leverage: 20000n,
  fromTokenAddress: "0xusdc",
  toTokenAddress: "0xeth",
  fromTokenInputValue: "1000",
  toTokenInputValue: "1.05",
  triggerPrice: 1900n * 10n ** 30n,
  increaseAmounts: increaseWithRecommendation(35n),
  decreaseAmounts: undefined,
};

let latestUserSetsImpact: (value: bigint) => void;

function Harness({ values }: { values: TradeboxValues }) {
  const [defaultBps, setDefaultBps] = useState<bigint>();
  const [selectedBps, setSelectedBps] = useState<bigint>();
  const [isCustomized, setIsCustomized] = useState(false);

  // mirrors setUserSelectedAcceptablePriceImpactBps from useTradeboxState
  latestUserSetsImpact = (value: bigint) => {
    setSelectedBps(value);
    setIsCustomized(value !== defaultBps);
  };

  for (const [key, value] of Object.entries(values)) {
    selectorValues.set(key, value);
  }
  selectorValues.set("defaultBps", defaultBps);
  selectorValues.set("selectedBps", selectedBps);
  selectorValues.set("isCustomized", isCustomized);
  selectorValues.set("setDefaultBps", setDefaultBps);
  selectorValues.set("setSelectedBps", setSelectedBps);
  selectorValues.set("setIsCustomized", setIsCustomized);

  useTradeboxAcceptablePriceImpactValues();

  return (
    <div>
      <span data-testid="default">{String(defaultBps)}</span>
      <span data-testid="selected">{String(selectedBps)}</span>
    </div>
  );
}

function renderHook(values: TradeboxValues) {
  const utils = render(<Harness values={values} />);

  const read = () => ({
    defaultBps: utils.getByTestId("default").textContent,
    selectedBps: utils.getByTestId("selected").textContent,
  });

  const update = (next: Partial<TradeboxValues>) => {
    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
    values = { ...values, ...next };
    utils.rerender(<Harness values={values} />);
  };

  return { read, update };
}

function userSetsImpact(bps: bigint) {
  act(() => {
    latestUserSetsImpact(bps);
  });
}

describe("useTradeboxAcceptablePriceImpactValues", () => {
  beforeEach(() => {
    selectorValues.clear();
  });

  afterEach(cleanup);

  it("initializes both values from the recommended impact of a limit order", () => {
    const { read } = renderHook(limitOrderValues);

    expect(read()).toEqual({ defaultBps: "35", selectedBps: "35" });
  });

  it("initializes both values from the recommended impact of a trigger order", () => {
    const { read } = renderHook({
      ...limitOrderValues,
      tradeFlags: TRIGGER_FLAGS,
      increaseAmounts: undefined,
      decreaseAmounts: {
        acceptablePrice: 1800n * 10n ** 30n,
        acceptablePriceDeltaBps: -42n,
        recommendedAcceptablePriceDeltaBps: -42n,
      },
    });

    expect(read()).toEqual({ defaultBps: "42", selectedBps: "42" });
  });

  it("leaves the values empty when there is no recommendation", () => {
    const { read } = renderHook({ ...limitOrderValues, tradeFlags: MARKET_FLAGS });

    expect(read()).toEqual({ defaultBps: "undefined", selectedBps: "undefined" });
  });

  it("follows the recommended impact on market data updates while the user has not set a value", () => {
    const { read, update } = renderHook(limitOrderValues);

    update({ increaseAmounts: increaseWithRecommendation(40n), toTokenInputValue: "1.0501" });

    expect(read()).toEqual({ defaultBps: "40", selectedBps: "40" });
  });

  it("keeps the user's value and refreshes only the recommended impact on market data updates", () => {
    const { read, update } = renderHook(limitOrderValues);

    userSetsImpact(100n);
    update({ increaseAmounts: increaseWithRecommendation(40n), toTokenInputValue: "1.0501" });
    update({ increaseAmounts: increaseWithRecommendation(38n), fromTokenInputValue: "1000.1" });

    expect(read()).toEqual({ defaultBps: "38", selectedBps: "100" });
  });

  it("keeps the user's value when the recommended impact drifts onto it and past it", () => {
    const { read, update } = renderHook(limitOrderValues);

    userSetsImpact(40n);
    update({ increaseAmounts: increaseWithRecommendation(40n) });
    update({ increaseAmounts: increaseWithRecommendation(45n) });

    expect(read()).toEqual({ defaultBps: "45", selectedBps: "40" });
  });

  it("re-applies the recommended impact when the user changes the limit price", () => {
    const { read, update } = renderHook(limitOrderValues);

    userSetsImpact(100n);
    update({ triggerPrice: 1850n * 10n ** 30n, increaseAmounts: increaseWithRecommendation(40n) });

    expect(read()).toEqual({ defaultBps: "40", selectedBps: "40" });
  });

  it("re-applies the recommended impact when the user changes the market", () => {
    const { read, update } = renderHook(limitOrderValues);

    userSetsImpact(100n);
    update({
      marketInfo: { indexTokenAddress: "0xbtc" },
      toTokenAddress: "0xbtc",
      increaseAmounts: increaseWithRecommendation(31n),
    });

    expect(read()).toEqual({ defaultBps: "31", selectedBps: "31" });
  });

  it("resumes following the recommended impact after the user picks it again", () => {
    const { read, update } = renderHook(limitOrderValues);

    userSetsImpact(100n);
    update({ increaseAmounts: increaseWithRecommendation(40n) });
    userSetsImpact(40n);
    update({ increaseAmounts: increaseWithRecommendation(45n) });

    expect(read()).toEqual({ defaultBps: "45", selectedBps: "45" });
  });
});
