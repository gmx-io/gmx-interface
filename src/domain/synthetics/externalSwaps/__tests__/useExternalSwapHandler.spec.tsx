import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { selectGasPrice, selectRawSubaccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectExternalSwapInputs,
  selectExternalSwapQuote,
  selectExternalSwapRequestResult,
  selectSetExternalSwapRequestResult,
  selectSetShouldFallbackToInternalSwap,
  selectSetShouldForceExternalSwap,
  selectShouldFallbackToInternalSwap,
  selectShouldForceExternalSwap,
  selectShouldRequestExternalSwapQuote,
  selectTradeboxAllowedSlippage,
  selectTradeboxFromTokenAddress,
  selectTradeboxSelectSwapToToken,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { ARBITRUM } from "sdk/configs/chains";
import type { ExternalSwapQuote } from "sdk/utils/trade/types";

import type { ExternalSwapRequestResult } from "../types";
import { useExternalSwapHandler } from "../useExternalSwapHandler";
import { getExternalSwapRequestKey } from "../utils";

const { selectorValues, outputHook, inputHook } = vi.hoisted(() => ({
  selectorValues: new Map<unknown, unknown>(),
  outputHook: { current: {} as Record<string, unknown> },
  inputHook: { current: {} as Record<string, unknown> },
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (selector: unknown) => selectorValues.get(selector),
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({ orderStatuses: {} }),
}));

vi.mock("context/SyntheticsStateContext/hooks/settingsHooks", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useShowDebugValues: () => false,
}));

vi.mock("lib/chains", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useChainId: () => ({ chainId: ARBITRUM }),
}));

vi.mock("../useAutoSwitchGasTokenForRequiredExternalSwap", () => ({
  useAutoSwitchGasTokenForRequiredExternalSwap: () => undefined,
}));

vi.mock("../useExternalSwapOutputRequest", () => ({
  useExternalSwapOutputRequest: () => outputHook.current,
}));

vi.mock("../useExternalSwapInputRequest", () => ({
  useExternalSwapInputRequest: () => inputHook.current,
}));

const TOKEN_A = "0x000000000000000000000000000000000000aaaa";
const TOKEN_B = "0x000000000000000000000000000000000000bbbb";
const TOKEN_C = "0x000000000000000000000000000000000000cccc";
const SLIPPAGE = 100;
const INPUTS = { strategy: "byFromValue", amountIn: 1000n, desiredAmountOut: undefined };

const setRequestResult = vi.fn();

function makeQuote(txnData = "0xcalldata"): ExternalSwapQuote {
  return { slippage: SLIPPAGE, amountIn: 1000n, txnData: { data: txnData } } as unknown as ExternalSwapQuote;
}

function makeRequestKey(overrides?: { toTokenAddress?: string; slippage?: number; amountIn?: bigint }) {
  return getExternalSwapRequestKey({
    fromTokenAddress: TOKEN_A,
    toTokenAddress: overrides?.toTokenAddress ?? TOKEN_B,
    strategy: "byFromValue",
    amountIn: overrides?.amountIn ?? 1000n,
    desiredAmountOut: undefined,
    slippage: overrides?.slippage ?? SLIPPAGE,
  });
}

function setDefaults({ storedResult }: { storedResult?: ExternalSwapRequestResult } = {}) {
  selectorValues.clear();
  selectorValues.set(selectTradeboxFromTokenAddress, TOKEN_A);
  selectorValues.set(selectTradeboxSelectSwapToToken, { address: TOKEN_B });
  selectorValues.set(selectTradeboxAllowedSlippage, SLIPPAGE);
  selectorValues.set(selectExternalSwapRequestResult, storedResult);
  selectorValues.set(selectSetExternalSwapRequestResult, setRequestResult);
  selectorValues.set(selectGasPrice, 10n);
  selectorValues.set(selectExternalSwapInputs, INPUTS);
  selectorValues.set(selectExternalSwapQuote, undefined);
  selectorValues.set(selectShouldFallbackToInternalSwap, false);
  selectorValues.set(selectSetShouldFallbackToInternalSwap, vi.fn());
  selectorValues.set(selectShouldForceExternalSwap, false);
  selectorValues.set(selectSetShouldForceExternalSwap, vi.fn());
  selectorValues.set(selectRawSubaccount, undefined);
  selectorValues.set(selectExpressOrdersEnabled, true);
  selectorValues.set(selectShouldRequestExternalSwapQuote, true);
}

function setOutputHook(value: {
  quote?: ExternalSwapQuote;
  requestKey?: ReturnType<typeof makeRequestKey>;
  error?: unknown;
  isDataUpToDate: boolean;
}) {
  outputHook.current = value;
}

function Harness() {
  useExternalSwapHandler();
  return null;
}

describe("useExternalSwapHandler — syncRequestResultEff", () => {
  beforeEach(() => {
    setRequestResult.mockClear();
    setDefaults();
    setOutputHook({ isDataUpToDate: true });
    inputHook.current = { isDataUpToDate: true };
  });

  afterEach(cleanup);

  it("stores a success result when the quote's sealed request key matches the current inputs", () => {
    const quote = makeQuote();
    setOutputHook({ quote, requestKey: makeRequestKey(), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith({ status: "success", key: makeRequestKey(), quote });
  });

  it("does NOT store a quote whose sealed request key is for another token pair", () => {
    setOutputHook({
      quote: makeQuote(),
      requestKey: makeRequestKey({ toTokenAddress: TOKEN_C }),
      isDataUpToDate: true,
    });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("does NOT store a quote whose sealed request key is for another slippage", () => {
    setOutputHook({ quote: makeQuote(), requestKey: makeRequestKey({ slippage: 50 }), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("does NOT store a quote without a sealed request key", () => {
    setOutputHook({ quote: makeQuote(), requestKey: undefined, isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("requires an exact amount match for manual strategies (30bps drift is rejected)", () => {
    setOutputHook({ quote: makeQuote(), requestKey: makeRequestKey({ amountIn: 1002n }), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("does nothing while the debounced request data lags the inputs (isDataUpToDate=false)", () => {
    setOutputHook({ quote: makeQuote(), requestKey: makeRequestKey(), isDataUpToDate: false });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("ignores AbortError — an aborted request says nothing about the route", () => {
    const abortError = new DOMException("Aborted", "AbortError");
    setOutputHook({ error: abortError, isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("stores a failed result for a real request error", () => {
    setOutputHook({ error: new Error("no route"), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith({ status: "failed", key: makeRequestKey() });
  });

  it("does not re-store an identical failed result", () => {
    setDefaults({ storedResult: { status: "failed", key: makeRequestKey()! } });
    setOutputHook({ error: new Error("no route"), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("does not re-store a success result with identical txn data", () => {
    const quote = makeQuote();
    setDefaults({ storedResult: { status: "success", key: makeRequestKey()!, quote } });
    setOutputHook({ quote, requestKey: makeRequestKey(), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("re-stores a success result when the txn data changes", () => {
    const oldQuote = makeQuote("0xold");
    const newQuote = makeQuote("0xnew");
    setDefaults({ storedResult: { status: "success", key: makeRequestKey()!, quote: oldQuote } });
    setOutputHook({ quote: newQuote, requestKey: makeRequestKey(), isDataUpToDate: true });

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith({ status: "success", key: makeRequestKey(), quote: newQuote });
  });

  it("clears the stored result when quoting becomes disabled", () => {
    setDefaults({ storedResult: { status: "failed", key: makeRequestKey()! } });
    selectorValues.set(selectShouldRequestExternalSwapQuote, false);

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith(undefined);
  });

  it("clears the stored result when the amount is emptied", () => {
    setDefaults({ storedResult: { status: "failed", key: makeRequestKey()! } });
    selectorValues.set(selectExternalSwapInputs, { ...INPUTS, amountIn: 0n });

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith(undefined);
  });

  it("does not clear when there is nothing stored", () => {
    selectorValues.set(selectShouldRequestExternalSwapQuote, false);

    render(<Harness />);

    expect(setRequestResult).not.toHaveBeenCalled();
  });

  it("uses the input-request hook for the byToValue strategy", () => {
    selectorValues.set(selectExternalSwapInputs, { strategy: "byToValue", amountIn: 1000n, desiredAmountOut: 500n });
    const key = getExternalSwapRequestKey({
      fromTokenAddress: TOKEN_A,
      toTokenAddress: TOKEN_B,
      strategy: "byToValue",
      amountIn: 1000n,
      desiredAmountOut: 500n,
      slippage: SLIPPAGE,
    });
    const quote = makeQuote();
    inputHook.current = { quote, requestKey: key, isDataUpToDate: true };
    setOutputHook({ isDataUpToDate: false });

    render(<Harness />);

    expect(setRequestResult).toHaveBeenCalledWith({ status: "success", key, quote });
  });
});
