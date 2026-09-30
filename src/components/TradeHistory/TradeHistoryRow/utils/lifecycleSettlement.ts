import { t } from "@lingui/macro";

import { isDecreaseOrderType, isIncreaseOrderType, isLiquidationOrderType } from "domain/synthetics/orders";
import type { TokenData } from "domain/synthetics/tokens";
import { convertToTokenAmount, convertToUsd, parseContractPrice } from "domain/synthetics/tokens";
import type { LifecycleSettlementData } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import { getSwapLegId } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import { calculateDisplayDecimals, formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";

import { getDecreasePayoutUsd, getFeesBreakdown, hasSecondaryOutputRisk } from "./position";
import { Line, TooltipString, TooltipValue, infoRow, lines, numberToState } from "./shared";

export type LifecycleTokenLeg = {
  token: TokenData;
  amount: bigint;
};

export type LifecycleCashflow = {
  legs: LifecycleTokenLeg[];
  usd: bigint;
};

/** `usdOnly` — a decrease could have paid out in two tokens at once; the split is unrecoverable from events. */
export type LifecycleTier = "sameToken" | "tokenLegs" | "usdOnly";

export type LifecycleAggregate = {
  tier: LifecycleTier;
  funded: LifecycleCashflow;
  receivedBeforeClose: LifecycleCashflow;
  receivedAtClose: LifecycleCashflow;
  totalReceived: LifecycleCashflow;
  netResult: LifecycleCashflow;
  lifecycleRpnlUsd: bigint;
  netFeesUsd: bigint;
  isMultichain: boolean;
};

export type LifecycleSettlementView =
  | { mode: "closeSideOnly"; isMultichain: boolean }
  | { mode: "compact"; openRow: PositionTradeAction; isMultichain: boolean }
  | { mode: "extended"; aggregate: LifecycleAggregate };

/** `srcChainId` is `0` for same-chain v2.2 orders and absent on pre-v2.2 ones. */
export function isMultichainRow(row: PositionTradeAction): boolean {
  return row.srcChainId !== undefined && row.srcChainId !== 0;
}

function getOpeningOrderKey(positionLifecycleId: string): string {
  return positionLifecycleId.slice(positionLifecycleId.indexOf(":") + 1);
}

/** Native and wrapped are one balance to the trader: a payout unwrapped to ETH nets against WETH margin. */
function getLegKey(token: TokenData): string {
  return token.wrappedAddress ?? token.address;
}

function addLeg(legs: LifecycleTokenLeg[], token: TokenData, amount: bigint): void {
  const existing = legs.find((leg) => getLegKey(leg.token) === getLegKey(token));

  if (existing) {
    existing.amount += amount;

    return;
  }

  legs.push({ token, amount });
}

function toCashflow(legs: LifecycleTokenLeg[], usd: bigint): LifecycleCashflow {
  return { legs, usd };
}

function subtractLegs(received: LifecycleTokenLeg[], funded: LifecycleTokenLeg[]): LifecycleTokenLeg[] {
  const netLegs: LifecycleTokenLeg[] = [];

  received.forEach((leg) => addLeg(netLegs, leg.token, leg.amount));
  funded.forEach((leg) => addLeg(netLegs, leg.token, -leg.amount));

  return netLegs;
}

export function getLifecycleSettlementView(
  closeRow: PositionTradeAction,
  data: LifecycleSettlementData
): LifecycleSettlementView {
  const { rows, ordersByKey, hasFundingSettlement, isTruncated } = data;

  // A mixed lifecycle stays labelled even when the close row itself is same-chain.
  const isMultichain = rows.some(isMultichainRow) || isMultichainRow(closeRow);
  const closeSideOnly: LifecycleSettlementView = { mode: "closeSideOnly", isMultichain };

  if (isTruncated || hasFundingSettlement || !closeRow.positionLifecycleId || rows.length === 0) {
    return closeSideOnly;
  }

  const openRow = rows[0];

  if (
    !isIncreaseOrderType(openRow.orderType) ||
    openRow.orderKey !== getOpeningOrderKey(closeRow.positionLifecycleId)
  ) {
    return closeSideOnly;
  }

  if (rows[rows.length - 1].id !== closeRow.id) {
    return closeSideOnly;
  }

  let runningSizeUsd = 0n;

  for (const row of rows) {
    if (isIncreaseOrderType(row.orderType)) {
      runningSizeUsd += row.sizeDeltaUsd;
    } else if (isDecreaseOrderType(row.orderType) || isLiquidationOrderType(row.orderType)) {
      runningSizeUsd -= row.sizeDeltaUsd;
    } else {
      return closeSideOnly;
    }

    if (row.positionSizeInUsd === undefined || row.positionSizeInUsd !== runningSizeUsd) {
      return closeSideOnly;
    }

    if (isIncreaseOrderType(row.orderType) && !ordersByKey[row.orderKey]) {
      return closeSideOnly;
    }
  }

  if (runningSizeUsd !== 0n) {
    return closeSideOnly;
  }

  // A settle drains collateral between the two rows without leaving a lifecycle row behind.
  if (rows.length === 2 && closeRow.initialCollateralDeltaAmount === openRow.initialCollateralDeltaAmount) {
    return { mode: "compact", openRow, isMultichain };
  }

  const aggregate = aggregateLifecycleSettlement(rows, data);

  return aggregate ? { mode: "extended", aggregate } : closeSideOnly;
}

export function aggregateLifecycleSettlement(
  rows: PositionTradeAction[],
  { ordersByKey, swapLegsById }: Pick<LifecycleSettlementData, "ordersByKey" | "swapLegsById">
): LifecycleAggregate | undefined {
  const fundedLegs: LifecycleTokenLeg[] = [];
  const receivedBeforeCloseLegs: LifecycleTokenLeg[] = [];
  const receivedAtCloseLegs: LifecycleTokenLeg[] = [];

  let fundedUsd = 0n;
  let receivedBeforeCloseUsd = 0n;
  let receivedAtCloseUsd = 0n;
  let lifecycleRpnlUsd = 0n;
  let netFeesUsd = 0n;
  let hasSecondaryOutput = false;

  const tokenAddresses = new Set<string>();
  const closeRow = rows[rows.length - 1];

  for (const row of rows) {
    netFeesUsd += getFeesBreakdown(row).totalUsd;

    const swapPath = row.swapPath ?? [];

    if (isIncreaseOrderType(row.orderType)) {
      const order = ordersByKey[row.orderKey];

      if (!order) {
        return undefined;
      }

      const fundedToken = row.initialCollateralToken;
      const fundedAmount = order.initialCollateralDeltaAmount;

      let fundedPrice = row.collateralTokenPriceMin;

      if (swapPath.length > 0) {
        const swapLeg = swapLegsById[getSwapLegId(row.orderKey, swapPath[0])];

        if (!swapLeg) {
          return undefined;
        }

        fundedPrice = parseContractPrice(swapLeg.tokenInPrice, fundedToken.decimals);
      }

      const legUsd = convertToUsd(fundedAmount, fundedToken.decimals, fundedPrice);

      if (legUsd === undefined) {
        return undefined;
      }

      addLeg(fundedLegs, fundedToken, fundedAmount);
      tokenAddresses.add(getLegKey(fundedToken));
      fundedUsd += legUsd;

      continue;
    }

    lifecycleRpnlUsd += row.basePnlUsd ?? 0n;

    const payoutUsd = getDecreasePayoutUsd(row);

    if (payoutUsd === undefined) {
      return undefined;
    }

    let payoutToken = row.initialCollateralToken;
    let payoutAmount: bigint | undefined;

    if (swapPath.length > 0) {
      const swapLeg = swapLegsById[getSwapLegId(row.orderKey, swapPath[swapPath.length - 1])];

      if (swapLeg) {
        payoutToken = row.targetCollateralToken;
        payoutAmount = swapLeg.amountOut;
      } else {
        hasSecondaryOutput = true;
      }
    } else {
      payoutAmount = convertToTokenAmount(payoutUsd, payoutToken.decimals, row.collateralTokenPriceMin);
    }

    if (hasSecondaryOutputRisk(row)) {
      hasSecondaryOutput = true;
    }

    if (payoutAmount !== undefined) {
      addLeg(row === closeRow ? receivedAtCloseLegs : receivedBeforeCloseLegs, payoutToken, payoutAmount);
      tokenAddresses.add(getLegKey(payoutToken));
    }

    if (row === closeRow) {
      receivedAtCloseUsd += payoutUsd;
    } else {
      receivedBeforeCloseUsd += payoutUsd;
    }
  }

  const hasSwapPath = rows.some((row) => (row.swapPath ?? []).length > 0);
  const tier: LifecycleTier = hasSecondaryOutput
    ? "usdOnly"
    : !hasSwapPath && tokenAddresses.size <= 1
      ? "sameToken"
      : "tokenLegs";

  const totalReceivedLegs: LifecycleTokenLeg[] = [];
  receivedBeforeCloseLegs.forEach((leg) => addLeg(totalReceivedLegs, leg.token, leg.amount));
  receivedAtCloseLegs.forEach((leg) => addLeg(totalReceivedLegs, leg.token, leg.amount));

  // A same-token lifecycle reads as one running balance, so every row needs the token even at zero.
  if (tier === "sameToken") {
    const token = fundedLegs[0]?.token ?? closeRow.initialCollateralToken;

    [fundedLegs, receivedBeforeCloseLegs, receivedAtCloseLegs, totalReceivedLegs].forEach((legs) => {
      if (legs.length === 0) {
        legs.push({ token, amount: 0n });
      }
    });
  }

  return {
    tier,
    funded: toCashflow(fundedLegs, fundedUsd),
    receivedBeforeClose: toCashflow(receivedBeforeCloseLegs, receivedBeforeCloseUsd),
    receivedAtClose: toCashflow(receivedAtCloseLegs, receivedAtCloseUsd),
    totalReceived: toCashflow(totalReceivedLegs, receivedBeforeCloseUsd + receivedAtCloseUsd),
    netResult: toCashflow(
      subtractLegs(totalReceivedLegs, fundedLegs),
      receivedBeforeCloseUsd + receivedAtCloseUsd - fundedUsd
    ),
    lifecycleRpnlUsd,
    netFeesUsd,
    isMultichain: rows.some(isMultichainRow),
  };
}

function formatLegAmount(leg: LifecycleTokenLeg): string | undefined {
  return formatTokenAmount(leg.amount, leg.token.decimals, leg.token.symbol, {
    useCommas: true,
    displayDecimals: calculateDisplayDecimals(leg.amount, leg.token.decimals, undefined, leg.token.isStable),
    isStable: leg.token.isStable,
  });
}

function getCashflowValue(cashflow: LifecycleCashflow, tier: LifecycleTier): TooltipValue {
  const approximateUsd = `~${formatUsd(cashflow.usd)}`;

  if (tier === "usdOnly" || cashflow.legs.length === 0) {
    return approximateUsd;
  }

  const spans: TooltipString[] = [];

  cashflow.legs.forEach((leg, index) => {
    if (index > 0) {
      spans.push(" + ");
    }

    spans.push(`~${formatLegAmount(leg)}`);
  });

  if (tier === "tokenLegs") {
    spans.push(" ", { text: `(${approximateUsd})`, state: "muted" });
  }

  return spans.length === 1 ? spans[0] : spans;
}

export function getLifecycleSettlementLines(aggregate: LifecycleAggregate): Line[] {
  const { tier, isMultichain } = aggregate;

  return lines(
    "",
    t`Lifecycle settlement`,
    "",
    infoRow(
      isMultichain ? t`Total margin funded (GMX balance)` : t`Total margin funded`,
      getCashflowValue(aggregate.funded, tier)
    ),
    infoRow(
      isMultichain ? t`Received before close (GMX balance)` : t`Wallet received before close`,
      getCashflowValue(aggregate.receivedBeforeClose, tier)
    ),
    infoRow(
      isMultichain ? t`Received at close (GMX balance)` : t`Wallet received at close`,
      getCashflowValue(aggregate.receivedAtClose, tier)
    ),
    infoRow(
      isMultichain ? t`Total received (GMX balance)` : t`Total wallet received`,
      getCashflowValue(aggregate.totalReceived, tier)
    ),
    infoRow(
      isMultichain ? t`Net result (GMX balance)` : t`Net wallet result`,
      getCashflowValue(aggregate.netResult, tier)
    ),
    "",
    infoRow(t`Lifecycle RPNL`, {
      text: formatDeltaUsd(aggregate.lifecycleRpnlUsd),
      state: numberToState(aggregate.lifecycleRpnlUsd),
    }),
    infoRow(t`Net lifecycle fees / impact`, {
      text: formatDeltaUsd(aggregate.netFeesUsd),
      state: numberToState(aggregate.netFeesUsd),
    }),
    "",
    ...getSettlementNotes(isMultichain)
  );
}

export function getSettlementNotes(isMultichain: boolean): Line[] {
  const notes: Line[] = [
    { text: t`Excludes claimed funding, price impact rebates and execution fees.`, state: "muted" as const },
  ];

  if (isMultichain) {
    notes.push({
      text: t`This position was funded from your GMX multichain balance; amounts are balance movements, not wallet transfers.`,
      state: "muted" as const,
    });
  }

  return notes;
}

export function getUnreconcilableLifecycleLines(): Line[] {
  return lines({
    text: t`Full lifecycle reconciliation is unavailable because part of this position's history could not be matched reliably.`,
    state: "muted" as const,
  });
}
