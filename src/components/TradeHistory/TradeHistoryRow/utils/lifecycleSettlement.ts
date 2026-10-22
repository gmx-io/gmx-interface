import { t } from "@lingui/macro";

import { isDecreaseOrderType, isIncreaseOrderType, isLiquidationOrderType } from "domain/synthetics/orders";
import type { TokenData } from "domain/synthetics/tokens";
import { convertToUsd, parseContractPrice } from "domain/synthetics/tokens";
import type { LifecycleSettlementData, LifecycleSwapLeg } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import { getSwapLegId } from "domain/synthetics/tradeHistory/useLifecycleSettlement";
import { formatDeltaUsdParts, formatUsdParts, numberParts } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";

import {
  SettlementSource,
  formatSettlementTokenAmount,
  getCollateralTokenPayout,
  getDecreasePayoutUsd,
  getDecreaseSwapPayout,
  getFeesBreakdown,
  hasSecondaryOutputRisk,
} from "./position";
import { Line, TooltipString, TooltipValue, infoRow, lines, numberToState, numericText } from "./shared";

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
  source: SettlementSource;
};

export type LifecycleSettlementView =
  | { mode: "closeSideOnly"; source: SettlementSource }
  | { mode: "compact"; openRow: PositionTradeAction; source: SettlementSource }
  | { mode: "extended"; aggregate: LifecycleAggregate };

/** `srcChainId` is `0` for same-chain v2.2 orders and absent on pre-v2.2 ones. */
export function isMultichainRow(row: PositionTradeAction): boolean {
  return row.srcChainId !== undefined && row.srcChainId !== 0;
}

export function getSettlementSource(rows: PositionTradeAction[]): SettlementSource {
  const gmxAccountRowsCount = rows.filter(isMultichainRow).length;

  if (gmxAccountRowsCount === 0) {
    return "wallet";
  }

  return gmxAccountRowsCount === rows.length ? "gmxAccount" : "mixed";
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

export function getLifecycleSettlementView({
  closeRow,
  data,
  chainId,
}: {
  closeRow: PositionTradeAction;
  data: LifecycleSettlementData;
  chainId: number;
}): LifecycleSettlementView {
  const { rows, ordersByKey, hasFundingSettlement, isTruncated } = data;

  const source = getSettlementSource([...rows, closeRow]);
  const closeSideOnly: LifecycleSettlementView = { mode: "closeSideOnly", source };

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
    return { mode: "compact", openRow, source };
  }

  const aggregate = aggregateLifecycleSettlement({ rows, data, chainId });

  return aggregate ? { mode: "extended", aggregate } : closeSideOnly;
}

export function aggregateLifecycleSettlement({
  rows,
  data: { ordersByKey, swapLegsById },
  chainId,
}: {
  rows: PositionTradeAction[];
  data: Pick<LifecycleSettlementData, "ordersByKey" | "swapLegsById">;
  chainId: number;
}): LifecycleAggregate | undefined {
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
      const swapPayout = getDecreaseSwapPayout({ tradeAction: row, payoutUsd, swapLegsById, chainId });

      if (swapPayout) {
        payoutToken = swapPayout.token;
        payoutAmount = swapPayout.amount;
      } else {
        hasSecondaryOutput = true;
      }
    } else {
      payoutAmount = getCollateralTokenPayout(row, payoutUsd)?.amount;
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
    source: getSettlementSource(rows),
  };
}

function formatLegAmount(leg: LifecycleTokenLeg): string | undefined {
  return formatSettlementTokenAmount(leg.token, leg.amount);
}

function getCashflowValue(cashflow: LifecycleCashflow, tier: LifecycleTier): TooltipValue {
  const approximateUsd = numericText("~", formatUsdParts(cashflow.usd));

  if (tier === "usdOnly" || cashflow.legs.length === 0) {
    return approximateUsd;
  }

  const spans: TooltipString[] = [];

  cashflow.legs.forEach((leg, index) => {
    if (index === 0) {
      spans.push(`~${formatLegAmount(leg)}`);

      return;
    }

    spans.push(leg.amount < 0n ? " - " : " + ", `~${formatLegAmount({ ...leg, amount: bigMath.abs(leg.amount) })}`);
  });

  if (tier === "tokenLegs") {
    spans.push(" ", { text: numberParts("(", approximateUsd.text, ")"), state: "muted" });
  }

  return spans.length === 1 ? spans[0] : spans;
}

function getLifecycleCashflowLabels(source: SettlementSource) {
  if (source === "gmxAccount") {
    return {
      funded: t`Total margin funded (GMX balance)`,
      receivedBeforeClose: t`Received before close (GMX balance)`,
      receivedAtClose: t`Received at close (GMX balance)`,
      totalReceived: t`Total received (GMX balance)`,
      netResult: t`Net result (GMX balance)`,
    };
  }

  if (source === "mixed") {
    return {
      funded: t`Total margin funded`,
      receivedBeforeClose: t`Received before close`,
      receivedAtClose: t`Received at close`,
      totalReceived: t`Total received`,
      netResult: t`Net result`,
    };
  }

  return {
    funded: t`Total margin funded`,
    receivedBeforeClose: t`Wallet received before close`,
    receivedAtClose: t`Wallet received at close`,
    totalReceived: t`Total wallet received`,
    netResult: t`Net wallet result`,
  };
}

export function getLifecycleSettlementLines(aggregate: LifecycleAggregate): Line[] {
  const { tier, source } = aggregate;
  const labels = getLifecycleCashflowLabels(source);

  return lines(
    "",
    t`Lifecycle settlement`,
    "",
    infoRow(labels.funded, getCashflowValue(aggregate.funded, tier)),
    infoRow(labels.receivedBeforeClose, getCashflowValue(aggregate.receivedBeforeClose, tier)),
    infoRow(labels.receivedAtClose, getCashflowValue(aggregate.receivedAtClose, tier)),
    infoRow(labels.totalReceived, getCashflowValue(aggregate.totalReceived, tier)),
    infoRow(labels.netResult, getCashflowValue(aggregate.netResult, tier)),
    "",
    infoRow(t`Lifecycle RPNL`, {
      text: formatDeltaUsdParts(aggregate.lifecycleRpnlUsd),
      state: numberToState(aggregate.lifecycleRpnlUsd),
    }),
    infoRow(t`Net lifecycle fees / impact`, {
      text: formatDeltaUsdParts(aggregate.netFeesUsd),
      state: numberToState(aggregate.netFeesUsd),
    }),
    "",
    ...getSettlementNotes(source)
  );
}

export function getSettlementNotes(source: SettlementSource): Line[] {
  const notes: Line[] = [
    { text: t`Excludes claimed funding, price impact rebates and execution fees`, state: "muted" as const },
  ];

  if (source === "gmxAccount") {
    notes.push({
      text: t`This position was funded from your GMX multichain balance; amounts are balance movements, not wallet transfers.`,
      state: "muted" as const,
    });
  }

  return notes;
}

/** Partial closes have no settlement block, so a USDG one that swapped gets just the received line */
export function getUsdgPartialClosePayoutLines({
  tradeAction,
  swapLegsById,
  chainId,
}: {
  tradeAction: PositionTradeAction;
  swapLegsById: Record<string, LifecycleSwapLeg>;
  chainId: number;
}): Line[] {
  const payoutUsd = getDecreasePayoutUsd(tradeAction);
  const payout =
    payoutUsd === undefined
      ? undefined
      : tradeAction.swapPath.length === 0
        ? getCollateralTokenPayout(tradeAction, payoutUsd)
        : getDecreaseSwapPayout({ tradeAction, payoutUsd, swapLegsById, chainId });
  const formatted = payout && formatSettlementTokenAmount(payout.token, payout.amount);

  if (formatted === undefined) {
    return [];
  }

  return lines(
    "",
    infoRow(
      isMultichainRow(tradeAction) ? t`Received at close (GMX balance)` : t`Wallet received`,
      numericText("~", formatted)
    )
  );
}

export function getUnreconcilableLifecycleLines(): Line[] {
  return lines({
    text: t`Full lifecycle reconciliation is unavailable because part of this position's history could not be matched reliably`,
    state: "muted" as const,
  });
}
