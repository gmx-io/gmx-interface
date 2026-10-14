import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

import { getIsPaxosQuoteWorseThanShown, getTradeboxPaxosDecision } from "../tradeboxRoutes";

const amount = (value: number) => BigInt(Math.round(value * 1e6));
const usd = (value: number) => expandDecimals(value, USD_DECIMALS);
const quote = (amountOut: number, totalFees: number) => ({
  amountOut: amount(amountOut),
  totalFees: amount(totalFees),
});

type DecisionInput = Parameters<typeof getTradeboxPaxosDecision>[0];

const BASE: DecisionInput = {
  isPaxosAvailable: true,
  isWhitelisted: false,
  isStandardForced: false,
  isUsdcToUsdg: true,
  amountIn: amount(1_000),
  amountInUsd: usd(1_000),
  thresholdUsd: usd(250_000),
  zeroFeeCapacity: 0n,
  zeroFeeMinOrderSize: undefined,
  standardMinOrderSize: amount(35),
  zeroFee: { quote: undefined, isError: false, errorStatus: undefined },
  standard: { quote: undefined, isError: false },
  instantAmountOut: amount(999.9),
  isInstantLoading: false,
  zeroFeeEstimatedAmountOut: amount(1_000),
  minSavingAmount: amount(25),
  preference: "auto",
  walletBalance: amount(1_000_000),
  tokenIn: { symbol: "USDC", decimals: 6 },
  isAmountSettled: true,
  isConversionInProgress: false,
  step: "idle",
};

const sized = (value: number): Partial<DecisionInput> => ({
  amountIn: amount(value),
  amountInUsd: usd(value),
  zeroFeeEstimatedAmountOut: amount(value),
});

const WHITELISTED_250K: Partial<DecisionInput> = {
  ...sized(250_000),
  isWhitelisted: true,
  zeroFeeCapacity: amount(346_200),
  zeroFeeMinOrderSize: amount(35),
  zeroFee: { quote: quote(250_000, 0), isError: false, errorStatus: undefined },
  standard: { quote: quote(249_874, 126), isError: false },
  instantAmountOut: amount(249_917.5),
};

const WHITELISTED_400K_CAPACITY_SHORT: Partial<DecisionInput> = {
  ...WHITELISTED_250K,
  ...sized(400_000),
  zeroFee: { quote: undefined, isError: false, errorStatus: undefined },
  standard: { quote: quote(399_798, 202), isError: false },
  instantAmountOut: amount(399_600),
};

const NOT_WHITELISTED_300K: Partial<DecisionInput> = {
  ...sized(300_000),
  standard: { quote: quote(299_850, 150), isError: false },
  instantAmountOut: amount(299_700),
};

const GMX_FLOW = undefined;

describe("getTradeboxPaxosDecision", () => {
  it.each<
    [string, Partial<DecisionInput>, { offered: boolean; route: string | undefined; button: string | undefined }]
  >([
    ["not whitelisted under $250K looks as today", {}, { offered: false, route: "instant", button: GMX_FLOW }],
    [
      "not whitelisted from $250K gets Paxos standard when it is cheaper",
      NOT_WHITELISTED_300K,
      { offered: true, route: "paxosStandard", button: "Convert with Paxos · fee 150.00 USDC" },
    ],
    [
      "not whitelisted from $250K does not see Paxos standard when it is not cheaper",
      { ...NOT_WHITELISTED_300K, standard: { quote: quote(299_600, 400), isError: false } },
      { offered: false, route: "instant", button: GMX_FLOW },
    ],
    [
      "Auto keeps the instant route for a saving under the minimum",
      { ...NOT_WHITELISTED_300K, standard: { quote: quote(299_710, 290), isError: false } },
      { offered: true, route: "instant", button: GMX_FLOW },
    ],
    [
      "not whitelisted from $250K waits for the standard quote",
      { ...NOT_WHITELISTED_300K, standard: { quote: undefined, isError: false } },
      { offered: false, route: "instant", button: "Loading routes…" },
    ],
    [
      "not whitelisted from $250K looks as today when the standard quote fails",
      { ...NOT_WHITELISTED_300K, standard: { quote: undefined, isError: true } },
      { offered: false, route: "instant", button: GMX_FLOW },
    ],
    [
      "not whitelisted from $250K without an instant route gets Paxos standard",
      { ...NOT_WHITELISTED_300K, instantAmountOut: undefined },
      { offered: true, route: "paxosStandard", button: "Convert with Paxos · fee 150.00 USDC" },
    ],
    [
      "whitelisted with capacity gets zero-fee from Auto",
      WHITELISTED_250K,
      { offered: true, route: "paxosZeroFee", button: "Convert with Paxos" },
    ],
    [
      "whitelisted Auto keeps the instant route for a trivial saving",
      {
        ...WHITELISTED_250K,
        ...sized(1_000),
        zeroFee: { quote: quote(1_000, 0), isError: false, errorStatus: undefined },
        standard: { quote: quote(999.5, 0.5), isError: false },
        instantAmountOut: amount(999.9),
      },
      { offered: true, route: "instant", button: GMX_FLOW },
    ],
    [
      "whitelisted can pick zero-fee over Auto",
      {
        ...WHITELISTED_250K,
        ...sized(1_000),
        zeroFee: { quote: quote(1_000, 0), isError: false, errorStatus: undefined },
        standard: { quote: quote(999.5, 0.5), isError: false },
        instantAmountOut: amount(999.9),
        preference: "paxosZeroFee",
      },
      { offered: true, route: "paxosZeroFee", button: "Convert with Paxos" },
    ],
    [
      "short zero-fee capacity picks no route and never falls back to a paid quote",
      WHITELISTED_400K_CAPACITY_SHORT,
      { offered: true, route: undefined, button: "Not enough zero-fee capacity" },
    ],
    [
      "short zero-fee capacity allows Paxos standard picked by the user",
      { ...WHITELISTED_400K_CAPACITY_SHORT, preference: "paxosStandard" },
      { offered: true, route: "paxosStandard", button: "Convert with Paxos · fee 202.00 USDC" },
    ],
    [
      "short zero-fee capacity allows the instant route picked by the user",
      { ...WHITELISTED_400K_CAPACITY_SHORT, preference: "instant" },
      { offered: true, route: "instant", button: GMX_FLOW },
    ],
    [
      "short zero-fee capacity keeps a zero-fee pick and says why",
      { ...WHITELISTED_400K_CAPACITY_SHORT, preference: "paxosZeroFee" },
      { offered: true, route: "paxosZeroFee", button: "Not enough zero-fee capacity" },
    ],
    [
      "short zero-fee capacity does not stop a swap that zero-fee would barely improve",
      {
        ...WHITELISTED_250K,
        ...sized(10_000),
        zeroFeeCapacity: amount(5_000),
        standard: { quote: quote(9_995, 5), isError: false },
        instantAmountOut: amount(9_999),
      },
      { offered: true, route: "instant", button: GMX_FLOW },
    ],
    [
      "zero-fee capacity rejected by the gateway (409) counts as short",
      { ...WHITELISTED_250K, zeroFee: { quote: undefined, isError: true, errorStatus: 409 } },
      { offered: true, route: undefined, button: "Not enough zero-fee capacity" },
    ],
    [
      "whitelisted below the zero-fee minimum does not get Paxos standard from Auto",
      {
        ...WHITELISTED_250K,
        ...sized(2_000),
        isUsdcToUsdg: false,
        zeroFeeMinOrderSize: amount(2_845.8),
        standardMinOrderSize: amount(181.65),
        zeroFee: { quote: undefined, isError: false, errorStatus: undefined },
        standard: { quote: quote(1_999.9, 0.1), isError: false },
        instantAmountOut: amount(1_999.5),
      },
      { offered: true, route: "instant", button: GMX_FLOW },
    ],
    [
      "USDG to USDC ignores zero-fee capacity",
      {
        ...WHITELISTED_250K,
        ...sized(500_000),
        isUsdcToUsdg: false,
        zeroFeeCapacity: 0n,
        zeroFee: { quote: quote(500_000, 0), isError: false, errorStatus: undefined },
        standard: { quote: quote(499_748, 252), isError: false },
        instantAmountOut: amount(499_615),
      },
      { offered: true, route: "paxosZeroFee", button: "Convert with Paxos" },
    ],
    [
      "whitelisted without an instant route gets zero-fee for any saving",
      {
        ...WHITELISTED_250K,
        ...sized(1_000),
        zeroFee: { quote: quote(1_000, 0), isError: false, errorStatus: undefined },
        standard: { quote: quote(999.5, 0.5), isError: false },
        instantAmountOut: undefined,
      },
      { offered: true, route: "paxosZeroFee", button: "Convert with Paxos" },
    ],
    [
      "whitelisted waits while the zero-fee quote loads",
      { ...WHITELISTED_250K, zeroFee: { quote: undefined, isError: false, errorStatus: undefined } },
      { offered: true, route: "instant", button: "Loading routes…" },
    ],
    [
      "one Paxos conversion at a time",
      { ...WHITELISTED_250K, isConversionInProgress: true },
      { offered: true, route: "paxosZeroFee", button: "Paxos conversion in progress" },
    ],
    [
      "Paxos checks the wallet balance",
      { ...WHITELISTED_250K, walletBalance: amount(100_000) },
      { offered: true, route: "paxosZeroFee", button: "Insufficient USDC balance" },
    ],
    [
      "Paxos waits for the wallet balance",
      { ...WHITELISTED_250K, walletBalance: undefined },
      { offered: true, route: "paxosZeroFee", button: "Loading routes…" },
    ],
    [
      "a picked route below its minimum shows the minimum rounded up to cents",
      { ...sized(100), isStandardForced: true, standardMinOrderSize: amount(189.720445), preference: "paxosStandard" },
      { offered: true, route: "paxosStandard", button: "Minimum conversion is 189.73 USDC" },
    ],
    [
      "no Paxos when the receive amount is typed",
      { ...WHITELISTED_250K, isPaxosAvailable: false },
      { offered: false, route: "instant", button: GMX_FLOW },
    ],
  ])("%s", (_name, overrides, expected) => {
    const { routes, buttonState } = getTradeboxPaxosDecision({ ...BASE, ...overrides });

    const button = buttonState?.text.replace(/\s+/g, " ");

    expect({ offered: routes.isPaxosOffered, route: routes.activeRoute, button }).toEqual(expected);
  });
});

// The gateway fee drifts by a few wei between quotes: only a change in the shown fee or amount needs a new confirmation
describe("getIsPaxosQuoteWorseThanShown", () => {
  const SHOWN = quote(199.046269, 0.953731);
  const USDC = { decimals: 6 };

  it.each<[string, { amountOut: bigint; totalFees: bigint }, { amountOut: bigint; totalFees: bigint }, boolean]>([
    ["a fee drift of a few wei goes through", SHOWN, quote(199.046267, 0.953733), false],
    ["a lower fee goes through", SHOWN, quote(199.05, 0.95), false],
    ["a higher shown fee needs a new confirmation", SHOWN, quote(199.036269, 0.963731), true],
    ["a lower shown amount needs a new confirmation", SHOWN, quote(199.036269, 0.953731), true],
    ["any fee on a zero-fee quote needs a new confirmation", quote(1_000, 0), quote(999.999999, 0.000001), true],
  ])("%s", (_name, shownQuote, nextQuote, expected) => {
    expect(getIsPaxosQuoteWorseThanShown({ shownQuote, quote: nextQuote, tokenIn: USDC, tokenOut: USDC })).toBe(
      expected
    );
  });
});
