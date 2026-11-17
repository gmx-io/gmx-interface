import { t } from "@lingui/macro";

import { expandDecimals, formatAmount, formatBalanceAmount, roundUpDivision } from "lib/numbers";

import type { TransitSubmitStep } from "./submitTransitOrder";

export type PaxosSwapRoute = "paxosZeroFee" | "paxosStandard";

export type TradeboxSwapRoute = "instant" | PaxosSwapRoute;

export type TradeboxSwapRoutePreference = "auto" | TradeboxSwapRoute;

export type PaxosRouteState =
  | { status: "hidden" }
  | { status: "paused"; expectedReopenAt: number | undefined }
  | { status: "belowMinOrderSize"; minOrderSize: bigint }
  | { status: "capacityShort"; capacity: bigint }
  | { status: "quote" };

export type TradeboxSwapRouteUnavailableReason =
  | "loading"
  | "noRoute"
  | "paused"
  | "belowMinOrderSize"
  | "capacityShort"
  | "quoteError";

export type TradeboxSwapRouteOption = {
  route: TradeboxSwapRoute;
  amountOut: bigint | undefined;
  feeAmount: bigint | undefined;
  unavailableReason: TradeboxSwapRouteUnavailableReason | undefined;
};

export type PaxosQuoteState = {
  quote: { amountOut: bigint; totalFees: bigint } | undefined;
  isError: boolean;
};

export type TradeboxSwapRoutes = {
  options: TradeboxSwapRouteOption[];
  isPaxosOffered: boolean;
  isAutoPending: boolean;
  isPreferencePending: boolean;
  autoRoute: TradeboxSwapRoute | undefined;
  activeRoute: TradeboxSwapRoute | undefined;
};

export function getPaxosRouteStates(p: {
  isWhitelisted: boolean;
  isStandardForced: boolean;
  isUsdcToUsdg: boolean;
  amountIn: bigint;
  amountInUsd: bigint;
  thresholdUsd: bigint;
  isZeroFeeAvailable: boolean | undefined;
  zeroFeeExpectedReopenAt: number | undefined;
  zeroFeeCapacity: bigint | undefined;
  zeroFeeMinOrderSize: bigint | undefined;
  standardMinOrderSize: bigint | undefined;
}): Record<PaxosSwapRoute, PaxosRouteState> {
  if (p.amountIn <= 0n) {
    return { paxosZeroFee: { status: "hidden" }, paxosStandard: { status: "hidden" } };
  }

  return {
    paxosZeroFee: getZeroFeeRouteState(p),
    paxosStandard: getStandardRouteState(p),
  };
}

function getZeroFeeRouteState(p: {
  isWhitelisted: boolean;
  isUsdcToUsdg: boolean;
  amountIn: bigint;
  isZeroFeeAvailable: boolean | undefined;
  zeroFeeExpectedReopenAt: number | undefined;
  zeroFeeCapacity: bigint | undefined;
  zeroFeeMinOrderSize: bigint | undefined;
}): PaxosRouteState {
  if (!p.isWhitelisted || !p.isUsdcToUsdg) {
    return { status: "hidden" };
  }

  if (!p.isZeroFeeAvailable) {
    return { status: "paused", expectedReopenAt: p.zeroFeeExpectedReopenAt };
  }

  if (p.zeroFeeMinOrderSize !== undefined && p.amountIn < p.zeroFeeMinOrderSize) {
    return { status: "belowMinOrderSize", minOrderSize: p.zeroFeeMinOrderSize };
  }

  const capacity = p.zeroFeeCapacity ?? 0n;

  if (capacity < p.amountIn) {
    return { status: "capacityShort", capacity };
  }

  return { status: "quote" };
}

/** Below the threshold only whitelisted traders, or a forced debug run, see the standard route */
export function getIsStandardPaxosRouteShown(p: {
  isWhitelisted: boolean;
  isStandardForced: boolean;
  amountInUsd: bigint;
  thresholdUsd: bigint;
}): boolean {
  return p.isWhitelisted || p.isStandardForced || p.amountInUsd >= p.thresholdUsd;
}

function getStandardRouteState(p: {
  isWhitelisted: boolean;
  isStandardForced: boolean;
  amountIn: bigint;
  amountInUsd: bigint;
  thresholdUsd: bigint;
  standardMinOrderSize: bigint | undefined;
}): PaxosRouteState {
  const isAlwaysOffered = p.isWhitelisted || p.isStandardForced;

  if (!getIsStandardPaxosRouteShown(p)) {
    return { status: "hidden" };
  }

  if (p.standardMinOrderSize !== undefined && p.amountIn < p.standardMinOrderSize) {
    return isAlwaysOffered
      ? { status: "belowMinOrderSize", minOrderSize: p.standardMinOrderSize }
      : { status: "hidden" };
  }

  return { status: "quote" };
}

export function getTradeboxSwapRoutes(p: {
  paxosRouteStates: Record<PaxosSwapRoute, PaxosRouteState>;
  zeroFee: PaxosQuoteState;
  standard: PaxosQuoteState;
  isWhitelisted: boolean;
  isStandardForced: boolean;
  instantAmountOut: bigint | undefined;
  isInstantLoading: boolean;
  minSavingAmount: bigint;
  preference: TradeboxSwapRoutePreference;
}): TradeboxSwapRoutes {
  const zeroFeeOption = getZeroFeeOption(p);
  const standardOption = getStandardOption(p);
  const paxosOptions = [zeroFeeOption, standardOption].filter(
    (option): option is TradeboxSwapRouteOption => option !== undefined
  );
  const isPaxosOffered = paxosOptions.length > 0;

  const isStandardQuoteLoading =
    p.paxosRouteStates.paxosStandard.status === "quote" && !p.standard.quote && !p.standard.isError;
  const isAutoPending =
    zeroFeeOption?.unavailableReason === "loading" || isStandardQuoteLoading || (isPaxosOffered && p.isInstantLoading);

  const instantOption: TradeboxSwapRouteOption = {
    route: "instant",
    amountOut: p.instantAmountOut,
    feeAmount: undefined,
    unavailableReason: p.instantAmountOut === undefined ? (p.isInstantLoading ? "loading" : "noRoute") : undefined,
  };
  const options = isPaxosOffered ? [...paxosOptions, instantOption] : [];

  const autoCandidates = paxosOptions.filter((option) => option.unavailableReason === undefined);
  const bestPaxos = autoCandidates.reduce<TradeboxSwapRouteOption | undefined>(
    (best, option) => (best === undefined || option.amountOut! > best.amountOut! ? option : best),
    undefined
  );
  const autoRoute = getAutoRoute({
    bestPaxos,
    instantAmountOut: p.instantAmountOut,
    minSavingAmount: p.minSavingAmount,
  });

  const isPreferenceOffered = p.preference !== "auto" && options.some((option) => option.route === p.preference);
  const isPreferencePending = p.preference !== "auto" && !isPreferenceOffered && isAutoPending;

  let activeRoute: TradeboxSwapRoute | undefined = autoRoute;

  if (isPreferenceOffered) {
    activeRoute = p.preference as TradeboxSwapRoute;
  } else if (isPreferencePending) {
    activeRoute = undefined;
  }

  return {
    options,
    isPaxosOffered,
    isAutoPending,
    isPreferencePending,
    autoRoute,
    activeRoute,
  };
}

function getZeroFeeOption(p: {
  paxosRouteStates: Record<PaxosSwapRoute, PaxosRouteState>;
  zeroFee: PaxosQuoteState;
}): TradeboxSwapRouteOption | undefined {
  const state = p.paxosRouteStates.paxosZeroFee;

  if (state.status === "hidden") {
    return undefined;
  }

  if (state.status !== "quote") {
    return { route: "paxosZeroFee", amountOut: undefined, feeAmount: undefined, unavailableReason: state.status };
  }

  return getQuotedOption("paxosZeroFee", p.zeroFee);
}

function getStandardOption(p: {
  paxosRouteStates: Record<PaxosSwapRoute, PaxosRouteState>;
  standard: PaxosQuoteState;
  isWhitelisted: boolean;
  isStandardForced: boolean;
  instantAmountOut: bigint | undefined;
}): TradeboxSwapRouteOption | undefined {
  const state = p.paxosRouteStates.paxosStandard;

  if (state.status === "hidden") {
    return undefined;
  }

  if (state.status !== "quote") {
    return { route: "paxosStandard", amountOut: undefined, feeAmount: undefined, unavailableReason: state.status };
  }

  if (!p.isWhitelisted && !p.isStandardForced) {
    const quote = p.standard.quote;
    const isCheaper = quote !== undefined && (p.instantAmountOut === undefined || quote.amountOut > p.instantAmountOut);

    return isCheaper ? getQuotedOption("paxosStandard", p.standard) : undefined;
  }

  return getQuotedOption("paxosStandard", p.standard);
}

function getQuotedOption(route: PaxosSwapRoute, state: PaxosQuoteState): TradeboxSwapRouteOption {
  if (state.quote) {
    return {
      route,
      amountOut: state.quote.amountOut,
      feeAmount: state.quote.totalFees,
      unavailableReason: undefined,
    };
  }

  return {
    route,
    amountOut: undefined,
    feeAmount: undefined,
    unavailableReason: state.isError ? "quoteError" : "loading",
  };
}

function getAutoRoute(p: {
  bestPaxos: TradeboxSwapRouteOption | undefined;
  instantAmountOut: bigint | undefined;
  minSavingAmount: bigint;
}): TradeboxSwapRoute | undefined {
  if (p.bestPaxos === undefined) {
    return p.instantAmountOut === undefined ? undefined : "instant";
  }

  const isPaxosBetter = getIsSavingWorthWaiting({
    paxosAmountOut: p.bestPaxos.amountOut!,
    instantAmountOut: p.instantAmountOut,
    minSavingAmount: p.minSavingAmount,
  });

  return isPaxosBetter ? p.bestPaxos.route : "instant";
}

function getIsSavingWorthWaiting(p: {
  paxosAmountOut: bigint;
  instantAmountOut: bigint | undefined;
  minSavingAmount: bigint;
}): boolean {
  if (p.instantAmountOut === undefined) {
    return true;
  }

  const saving = p.paxosAmountOut - p.instantAmountOut;

  return saving > 0n && saving >= p.minSavingAmount;
}

export function formatPaxosMinOrderSize(minOrderSize: bigint, decimals: number): string {
  const step = expandDecimals(1, Math.max(decimals - 2, 0));

  return formatAmount(roundUpDivision(minOrderSize, step) * step, decimals, 2, true);
}

export type PaxosSubmitStep = "idle" | TransitSubmitStep;

export type TradeboxPaxosButtonState = {
  text: string;
  disabled: boolean;
};

export function getTradeboxPaxosButtonState(p: {
  routes: TradeboxSwapRoutes;
  paxosRouteStates: Record<PaxosSwapRoute, PaxosRouteState>;
  preference: TradeboxSwapRoutePreference;
  amountIn: bigint;
  walletBalance: bigint | undefined;
  tokenIn: { symbol: string; decimals: number };
  isAmountSettled: boolean;
  isConversionInProgress: boolean;
  step: PaxosSubmitStep;
}): TradeboxPaxosButtonState | undefined {
  const { routes, tokenIn } = p;
  const loading = { text: t`Loading routes…`, disabled: true };

  if (p.step === "approving") {
    return { text: t`Approving ${tokenIn.symbol}...`, disabled: true };
  }

  if (p.step === "submitting") {
    return { text: t`Sending conversion...`, disabled: true };
  }

  const isRouteWaiting = (p.preference === "auto" && routes.isAutoPending) || routes.isPreferencePending;
  const activeRoute = routes.activeRoute;

  if (activeRoute === undefined || activeRoute === "instant") {
    return isRouteWaiting ? loading : undefined;
  }

  if (isRouteWaiting) {
    return loading;
  }

  if (p.isConversionInProgress) {
    return { text: t`Paxos conversion in progress`, disabled: true };
  }

  if (p.walletBalance === undefined) {
    return loading;
  }

  if (p.amountIn > p.walletBalance) {
    return { text: t`Insufficient ${tokenIn.symbol} balance`, disabled: true };
  }

  const option = routes.options.find((routeOption) => routeOption.route === activeRoute);
  const routeState = p.paxosRouteStates[activeRoute];

  if (routeState.status === "paused") {
    return { text: t`Paxos zero-fee is paused`, disabled: true };
  }

  if (routeState.status === "belowMinOrderSize") {
    const minOrderSize = formatPaxosMinOrderSize(routeState.minOrderSize, tokenIn.decimals);

    return { text: t`Minimum conversion is ${minOrderSize} ${tokenIn.symbol}`, disabled: true };
  }

  if (routeState.status === "capacityShort") {
    return { text: t`Not enough zero-fee capacity`, disabled: true };
  }

  if (option?.unavailableReason === "quoteError") {
    return { text: t`Paxos quote is unavailable`, disabled: true };
  }

  if (!option || option.feeAmount === undefined || !p.isAmountSettled) {
    return loading;
  }

  if (option.feeAmount > 0n) {
    const fee = formatBalanceAmount(option.feeAmount, tokenIn.decimals, tokenIn.symbol, { isStable: true });

    return { text: t`Convert with Paxos · fee ${fee}`, disabled: false };
  }

  return { text: t`Convert with Paxos`, disabled: false };
}

export function getTradeboxPaxosDecision(p: {
  isPaxosAvailable: boolean;
  isWhitelisted: boolean;
  isStandardForced: boolean;
  isUsdcToUsdg: boolean;
  amountIn: bigint;
  amountInUsd: bigint;
  thresholdUsd: bigint;
  isZeroFeeAvailable: boolean | undefined;
  zeroFeeExpectedReopenAt: number | undefined;
  zeroFeeCapacity: bigint | undefined;
  zeroFeeMinOrderSize: bigint | undefined;
  standardMinOrderSize: bigint | undefined;
  zeroFee: PaxosQuoteState;
  standard: PaxosQuoteState;
  instantAmountOut: bigint | undefined;
  isInstantLoading: boolean;
  minSavingAmount: bigint;
  preference: TradeboxSwapRoutePreference;
  walletBalance: bigint | undefined;
  tokenIn: { symbol: string; decimals: number };
  isAmountSettled: boolean;
  isConversionInProgress: boolean;
  step: PaxosSubmitStep;
}) {
  const paxosRouteStates = getPaxosRouteStates({
    ...p,
    amountIn: p.isPaxosAvailable ? p.amountIn : 0n,
  });

  const routes = getTradeboxSwapRoutes({ ...p, paxosRouteStates });
  const buttonState = getTradeboxPaxosButtonState({ ...p, routes, paxosRouteStates });

  return { paxosRouteStates, routes, buttonState };
}

export function getIsPaxosQuoteWorseThanShown(p: {
  shownQuote: { amountOut: bigint; totalFees: bigint };
  quote: { amountOut: bigint; totalFees: bigint };
  tokenIn: { decimals: number };
  tokenOut: { decimals: number };
}): boolean {
  const formatFee = (fee: bigint) => formatBalanceAmount(fee, p.tokenIn.decimals, undefined, { isStable: true });
  const formatAmountOut = (amountOut: bigint) =>
    formatBalanceAmount(amountOut, p.tokenOut.decimals, undefined, { isStable: true });

  const isFeeHigher =
    p.quote.totalFees > p.shownQuote.totalFees &&
    (p.shownQuote.totalFees === 0n || formatFee(p.quote.totalFees) !== formatFee(p.shownQuote.totalFees));
  const isAmountOutLower =
    p.quote.amountOut < p.shownQuote.amountOut &&
    formatAmountOut(p.quote.amountOut) !== formatAmountOut(p.shownQuote.amountOut);

  return isFeeHigher || isAmountOutLower;
}
