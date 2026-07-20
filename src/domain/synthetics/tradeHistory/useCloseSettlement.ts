import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";

export type SettlementPositionChange = {
  positionKey: string;
  block: number;
  type: "increase" | "decrease";
  sizeInUsd: bigint;
  sizeDeltaUsd: bigint;
  collateralAmount: bigint;
  collateralDeltaAmount: bigint;
  feesAmount: bigint;
};

export type CloseSettlementData = {
  isFullClose: boolean;
  closeChange?: SettlementPositionChange;
  openChange?: SettlementPositionChange;
};

type RawPositionChange = {
  positionKey: string;
  block: number;
  type: "increase" | "decrease";
  sizeInUsd: string;
  sizeDeltaUsd: string;
  collateralAmount: string;
  collateralDeltaAmount: string;
  feesAmount: string;
};

const POSITION_CHANGE_FIELDS = `
  positionKey
  block
  type
  sizeInUsd
  sizeDeltaUsd
  collateralAmount
  collateralDeltaAmount
  feesAmount
`;

const CLOSE_CHANGE_QUERY = gql`
  query CloseSettlementCloseChange($orderKey: String!) {
    positionChanges(limit: 1, where: { orderKey_eq: $orderKey, type_eq: decrease }) {
      ${POSITION_CHANGE_FIELDS}
    }
  }
`;

const PREV_CHANGE_QUERY = gql`
  query CloseSettlementPrevChange($positionKey: String!, $block: Int!) {
    positionChanges(limit: 1, orderBy: block_DESC, where: { positionKey_eq: $positionKey, block_lt: $block }) {
      ${POSITION_CHANGE_FIELDS}
    }
  }
`;

function parsePositionChange(raw: RawPositionChange): SettlementPositionChange {
  return {
    positionKey: raw.positionKey,
    block: raw.block,
    type: raw.type,
    sizeInUsd: BigInt(raw.sizeInUsd),
    sizeDeltaUsd: BigInt(raw.sizeDeltaUsd),
    collateralAmount: BigInt(raw.collateralAmount),
    collateralDeltaAmount: BigInt(raw.collateralDeltaAmount),
    feesAmount: BigInt(raw.feesAmount),
  };
}

function isOpeningChangeForClose(prev: SettlementPositionChange, close: SettlementPositionChange): boolean {
  return (
    prev.type === "increase" &&
    prev.sizeInUsd === prev.sizeDeltaUsd &&
    prev.sizeInUsd === close.sizeDeltaUsd &&
    prev.collateralAmount === close.collateralDeltaAmount
  );
}

export function useCloseSettlement(chainId: number, tradeAction: PositionTradeAction | undefined) {
  const key = tradeAction ? ["useCloseSettlement", chainId, tradeAction.orderKey] : null;

  const { data, isLoading } = useSWR<CloseSettlementData>(key, {
    fetcher: async () => {
      const client = getSubsquidGraphClient(chainId);

      const closeResult = await client?.query({
        query: CLOSE_CHANGE_QUERY,
        variables: { orderKey: tradeAction!.orderKey },
        fetchPolicy: "no-cache",
      });

      const rawCloseChange = closeResult?.data?.positionChanges?.[0] as RawPositionChange | undefined;

      if (!rawCloseChange) {
        return { isFullClose: false };
      }

      const closeChange = parsePositionChange(rawCloseChange);

      if (closeChange.sizeInUsd !== 0n) {
        return { isFullClose: false };
      }

      const prevResult = await client?.query({
        query: PREV_CHANGE_QUERY,
        variables: { positionKey: closeChange.positionKey, block: closeChange.block },
        fetchPolicy: "no-cache",
      });

      const rawPrevChange = prevResult?.data?.positionChanges?.[0] as RawPositionChange | undefined;
      const prevChange = rawPrevChange ? parsePositionChange(rawPrevChange) : undefined;

      const openChange = prevChange && isOpeningChangeForClose(prevChange, closeChange) ? prevChange : undefined;

      return { isFullClose: true, closeChange, openChange };
    },
  });

  return { settlement: data, isLoading };
}
