import { bigMath } from "sdk/utils/bigmath";

import type { PositionInfo } from "./types";

export type LifecycleFeeTotals = {
  borrowingFeeUsd: bigint;
  fundingFeePaidUsd: bigint;
  fundingFeeReceivedUsd: bigint;
  lastTradeTimestamp: number;
};

export type PositionsLifecycleFees = {
  indexedUntilTimestamp: number;
  isWaitingForIndexer: boolean;
  positions: Partial<Record<string, { totals: LifecycleFeeTotals | undefined }>>;
};

export type PositionLifetimeFees =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "loaded"; borrowingFeeUsd: bigint; fundingFeePaidUsd: bigint; fundingFeeReceivedUsd: bigint };

type LifetimeFeesPosition = Pick<
  PositionInfo,
  | "contractKey"
  | "increasedAtTime"
  | "decreasedAtTime"
  | "isOpening"
  | "pendingBorrowingFeesUsd"
  | "pendingFundingFeesUsd"
  | "pendingClaimableFundingFeesUsd"
>;

const LOADING: PositionLifetimeFees = { status: "loading" };

export function getPositionLastTradeTimestamp(position: Pick<PositionInfo, "increasedAtTime" | "decreasedAtTime">) {
  return Number(bigMath.max(position.increasedAtTime, position.decreasedAtTime));
}

export function getIsWaitingForIndexer({
  totals,
  indexedUntilTimestamp,
  lastTradeTimestamp,
}: {
  totals: LifecycleFeeTotals | undefined;
  indexedUntilTimestamp: number;
  lastTradeTimestamp: number;
}) {
  return totals?.lastTradeTimestamp !== lastTradeTimestamp && indexedUntilTimestamp <= lastTradeTimestamp;
}

export function getPositionLifetimeFees(
  position: LifetimeFeesPosition,
  lifecycleFees: PositionsLifecycleFees | undefined
): PositionLifetimeFees {
  const entry = lifecycleFees?.positions[position.contractKey];

  if (!lifecycleFees || !entry || position.isOpening) {
    return LOADING;
  }

  const { totals } = entry;
  const lastTradeTimestamp = getPositionLastTradeTimestamp(position);

  if (
    (totals && totals.lastTradeTimestamp > lastTradeTimestamp) ||
    getIsWaitingForIndexer({ totals, indexedUntilTimestamp: lifecycleFees.indexedUntilTimestamp, lastTradeTimestamp })
  ) {
    return LOADING;
  }

  if (!totals) {
    return { status: "unavailable" };
  }

  return {
    status: "loaded",
    borrowingFeeUsd: totals.borrowingFeeUsd + position.pendingBorrowingFeesUsd,
    fundingFeePaidUsd: totals.fundingFeePaidUsd + position.pendingFundingFeesUsd,
    fundingFeeReceivedUsd: totals.fundingFeeReceivedUsd + position.pendingClaimableFundingFeesUsd,
  };
}
