import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Token } from "sdk/utils/tokens/types";
import { TradeMode } from "sdk/utils/trade/types";

const { openAtPrice, selectorValues } = vi.hoisted(() => ({
  openAtPrice: vi.fn(),
  selectorValues: new Map<string, unknown>(),
}));

// selectors are mocked to plain keys that useSelector reads from a test-controlled map
vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxFromToken: "fromToken",
  selectTradeboxFromTokenAmount: "fromTokenAmount",
  selectTradeboxFromTokenInputValue: "fromTokenInputValue",
  selectTradeboxSelectedPosition: "selectedPosition",
  selectTradeboxSelectedPositionKey: "selectedPositionKey",
  selectTradeboxTradeFlags: "tradeFlags",
  selectTradeboxTradeMode: "tradeMode",
  selectTradeboxTriggerPrice: "triggerPrice",
  selectTradeboxTriggerPriceInputValue: "triggerPriceInputValue",
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: (key: string) => selectorValues.get(key),
}));

vi.mock("context/SyntheticsStateContext/hooks/positionEditorHooks", () => ({
  usePositionEditorOpenAtPrice: () => openAtPrice,
}));

import { MarginDepositSuggestionCard } from "../MarginDepositSuggestionCard";

const WETH: Token = {
  name: "Wrapped Ethereum",
  symbol: "WETH",
  decimals: 18,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  isWrapped: true,
  baseSymbol: "ETH",
};

const USDC: Token = {
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  isStable: true,
};

const POSITION_KEY = "0xaccount:0xmarket:0xcollateral:true";

const CARD_TEXT = "Want to add margin without increasing your position size?";
const ACTION_TEXT = "Deposit margin at price";

type State = {
  tradeMode: TradeMode;
  tradeFlags: { isPosition: boolean; isIncrease: boolean; isTwap: boolean };
  selectedPosition: { collateralToken: Token } | undefined;
  selectedPositionKey: string | undefined;
  fromToken: Token | undefined;
  fromTokenInputValue: string;
  fromTokenAmount: bigint | undefined;
  triggerPriceInputValue: string;
  triggerPrice: bigint | undefined;
};

const eligibleState: State = {
  tradeMode: TradeMode.Limit,
  tradeFlags: { isPosition: true, isIncrease: true, isTwap: false },
  selectedPosition: { collateralToken: WETH },
  selectedPositionKey: POSITION_KEY,
  fromToken: WETH,
  fromTokenInputValue: "1.5",
  fromTokenAmount: 15n * 10n ** 17n,
  triggerPriceInputValue: "3000",
  triggerPrice: 3000n * 10n ** 30n,
};

function renderCard(state: Partial<State> = {}, onClose = vi.fn()) {
  for (const [key, value] of Object.entries({ ...eligibleState, ...state })) {
    selectorValues.set(key, value);
  }

  return render(
    <I18nProvider i18n={i18n}>
      <MarginDepositSuggestionCard onClose={onClose} />
    </I18nProvider>
  );
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

beforeEach(() => {
  openAtPrice.mockClear();
  selectorValues.clear();
});

afterEach(cleanup);

describe("MarginDepositSuggestionCard — eligibility", () => {
  it("suggests the margin deposit for a limit increase on an existing position", () => {
    const { getByText } = renderCard();

    expect(getByText(CARD_TEXT)).toBeTruthy();
    expect(getByText(ACTION_TEXT)).toBeTruthy();
  });

  it("stays visible whatever the pay amount is", () => {
    const payAmounts = [
      { fromTokenInputValue: "1.5", fromTokenAmount: 15n * 10n ** 17n },
      { fromTokenInputValue: "", fromTokenAmount: undefined },
      { fromTokenInputValue: "0", fromTokenAmount: 0n },
    ];

    for (const payAmount of payAmounts) {
      const { queryByText } = renderCard(payAmount);

      expect(queryByText(CARD_TEXT)).toBeTruthy();

      cleanup();
    }
  });

  it("stays visible whatever the trigger price is", () => {
    const { queryByText } = renderCard({ triggerPriceInputValue: "", triggerPrice: undefined });

    expect(queryByText(CARD_TEXT)).toBeTruthy();
  });

  it("hides when there is no position to add margin to", () => {
    const { queryByText } = renderCard({ selectedPosition: undefined, selectedPositionKey: undefined });

    expect(queryByText(CARD_TEXT)).toBeNull();
  });

  it("hides for stop market orders, which share the limit trade flags", () => {
    const { queryByText } = renderCard({ tradeMode: TradeMode.StopMarket });

    expect(queryByText(CARD_TEXT)).toBeNull();
  });

  it("hides for market orders, twaps and decreases", () => {
    const ineligible: Partial<State>[] = [
      { tradeMode: TradeMode.Market },
      { tradeMode: TradeMode.Twap, tradeFlags: { isPosition: true, isIncrease: true, isTwap: true } },
      { tradeFlags: { isPosition: true, isIncrease: false, isTwap: false } },
      { tradeFlags: { isPosition: false, isIncrease: false, isTwap: false } },
    ];

    for (const state of ineligible) {
      const { queryByText } = renderCard(state);

      expect(queryByText(CARD_TEXT)).toBeNull();

      cleanup();
    }
  });
});

describe("MarginDepositSuggestionCard — handoff", () => {
  it("opens the position editor with the position key and both prefilled inputs", () => {
    const { getByText } = renderCard();

    fireEvent.click(getByText(ACTION_TEXT));

    expect(openAtPrice).toHaveBeenCalledTimes(1);
    expect(openAtPrice).toHaveBeenCalledWith({
      positionKey: POSITION_KEY,
      collateralInputValue: "1.5",
      triggerPriceInputValue: "3000",
    });
  });

  it("drops the amount but keeps the trigger when the pay token is not the position collateral token", () => {
    const { getByText } = renderCard({
      fromToken: USDC,
      fromTokenInputValue: "1000",
      fromTokenAmount: 1000n * 10n ** 6n,
    });

    fireEvent.click(getByText(ACTION_TEXT));

    expect(openAtPrice).toHaveBeenCalledWith({
      positionKey: POSITION_KEY,
      collateralInputValue: undefined,
      triggerPriceInputValue: "3000",
    });
  });

  it("hands over an empty form when neither input is usable", () => {
    const { getByText } = renderCard({
      fromTokenInputValue: "",
      fromTokenAmount: undefined,
      triggerPriceInputValue: "",
      triggerPrice: undefined,
    });

    fireEvent.click(getByText(ACTION_TEXT));

    expect(openAtPrice).toHaveBeenCalledWith({
      positionKey: POSITION_KEY,
      collateralInputValue: undefined,
      triggerPriceInputValue: undefined,
    });
  });
});

describe("MarginDepositSuggestionCard — dismissal", () => {
  it("reports the dismissal to the owner instead of only hiding itself", () => {
    const onClose = vi.fn();
    const { container, getAllByRole } = renderCard({}, onClose);

    // the close button is the unlabelled one
    const closeButton = getAllByRole("button").find((button) => button.textContent === "");

    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(CARD_TEXT);
  });
});
