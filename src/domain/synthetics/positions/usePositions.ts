import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { accountPositionListKey, hashedPositionKey } from "config/dataStore";
import {
  PendingPositionUpdate,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { ethers } from "ethers";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { useMemo } from "react";
import { ContractMarketPrices, MarketsData, getContractMarketPrices } from "../markets";
import { TokensData } from "../tokens";
import { Position, PositionsData } from "./types";
import { getPositionKey, parsePositionKey } from "./utils";

const MAX_PENDING_UPDATE_AGE = 600 * 1000; // 10 minutes

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
};

export function usePositions(
  chainId: number,
  p: {
    marketsInfoData?: MarketsData;
    tokensData?: TokensData;
    pricesUpdatedAt?: number;
    account: string | null | undefined;
  }
): PositionsResult {
  const { marketsInfoData, tokensData, pricesUpdatedAt, account } = p;

  const { data: existingPositionsKeysSet } = useMulticall(chainId, "usePositions-keys", {
    key: account ? [account, pricesUpdatedAt] : null,

    // Refresh on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          keys: {
            methodName: "getBytes32ValuesAt",
            params: [accountPositionListKey(account!), 0, 1000],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return new Set(res.data.dataStore.keys.returnValues as string[]);
    },
  });

  const keysAndPrices = useKeysAndPricesParams({
    marketsInfoData,
    tokensData,
    account,
    existingPositionsKeysSet,
  });

  const { data: positionsData } = useMulticall(chainId, "usePositionsData", {
    key: keysAndPrices.contractPositionsKeys.length
      ? [keysAndPrices.contractPositionsKeys.join("-"), pricesUpdatedAt]
      : null,

    // Refresh on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [
              getContract(chainId, "DataStore"),
              getContract(chainId, "ReferralStorage"),
              keysAndPrices!.contractPositionsKeys,
              keysAndPrices!.marketsPrices,
              // uiFeeReceiver
              ethers.ZeroAddress,
            ],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const positions = res.data.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo, i) => {
        const { position, fees } = positionInfo;
        const { addresses, numbers, flags, data } = position;
        const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

        // Empty position
        if (BigInt(numbers.increasedAtBlock) == 0n) {
          return positionsMap;
        }

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
        const contractPositionKey = keysAndPrices!.contractPositionsKeys[i];

        positionsMap[positionKey] = {
          key: positionKey,
          contractKey: contractPositionKey,
          account,
          marketAddress,
          collateralTokenAddress,
          sizeInUsd: numbers.sizeInUsd,
          sizeInTokens: numbers.sizeInTokens,
          collateralAmount: numbers.collateralAmount,
          increasedAtBlock: numbers.increasedAtBlock,
          decreasedAtBlock: numbers.decreasedAtBlock,
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: fees.borrowing.borrowingFeeUsd,
          fundingFeeAmount: fees.funding.fundingFeeAmount,
          claimableLongTokenAmount: fees.funding.claimableLongTokenAmount,
          claimableShortTokenAmount: fees.funding.claimableShortTokenAmount,
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    },
  });

  const optimisticPositionsData = useOptimisticPositions({
    positionsData: positionsData,
    allPositionsKeys: keysAndPrices?.allPositionsKeys,
  });

  return {
    positionsData: optimisticPositionsData,
  };
}

function useKeysAndPricesParams(p: {
  account: string | null | undefined;
  marketsInfoData: MarketsData | undefined;
  tokensData: TokensData | undefined;
  existingPositionsKeysSet: Set<string> | undefined;
}) {
  const { account, marketsInfoData, tokensData, existingPositionsKeysSet } = p;

  return useMemo(() => {
    const values = {
      allPositionsKeys: [] as string[],
      contractPositionsKeys: [] as string[],
      marketsPrices: [] as ContractMarketPrices[],
    };

    if (!account || !marketsInfoData || !tokensData) {
      return values;
    }

    const markets = Object.values(marketsInfoData);

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices) {
        continue;
      }

      const collaterals = market.isSameCollaterals
        ? [market.longTokenAddress]
        : [market.longTokenAddress, market.shortTokenAddress];

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const positionKey = getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);
          values.allPositionsKeys.push(positionKey);

          const contractPositionKey = hashedPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);

          if (existingPositionsKeysSet?.has(contractPositionKey)) {
            values.contractPositionsKeys.push(contractPositionKey);
            values.marketsPrices.push(marketPrices);
          }
        }
      }
    }

    return values;
  }, [account, existingPositionsKeysSet, marketsInfoData, tokensData]);
}

export function useOptimisticPositions(p: {
  positionsData: PositionsData | undefined;
  allPositionsKeys: string[] | undefined;
}): PositionsData | undefined {
  const { positionsData, allPositionsKeys } = p;
  const { positionDecreaseEvents, positionIncreaseEvents, pendingPositionsUpdates } = useSyntheticsEvents();

  return useMemo(() => {
    if (!allPositionsKeys) {
      return undefined;
    }

    return allPositionsKeys.reduce((acc, key) => {
      const now = Date.now();

      const lastIncreaseEvent = positionIncreaseEvents
        ? positionIncreaseEvents.filter((e) => e.positionKey === key).pop()
        : undefined;
      const lastDecreaseEvent = positionDecreaseEvents
        ? positionDecreaseEvents.filter((e) => e.positionKey === key).pop()
        : undefined;

      const pendingUpdate =
        pendingPositionsUpdates?.[key] && (pendingPositionsUpdates[key]?.updatedAt ?? 0) + MAX_PENDING_UPDATE_AGE > now
          ? pendingPositionsUpdates[key]
          : undefined;

      let position: Position;

      if (getByKey(positionsData, key)) {
        position = { ...getByKey(positionsData, key)! };
      } else if (pendingUpdate && pendingUpdate.isIncrease) {
        position = getPendingMockPosition(pendingUpdate);
      } else {
        return acc;
      }

      if (
        lastIncreaseEvent &&
        lastIncreaseEvent.increasedAtBlock > position.increasedAtBlock &&
        lastIncreaseEvent.increasedAtBlock > (lastDecreaseEvent?.decreasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastIncreaseEvent);
      } else if (
        lastDecreaseEvent &&
        lastDecreaseEvent.decreasedAtBlock > position.decreasedAtBlock &&
        lastDecreaseEvent.decreasedAtBlock > (lastIncreaseEvent?.increasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastDecreaseEvent);
      }

      if (
        pendingUpdate &&
        ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.increasedAtBlock) ||
          (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.decreasedAtBlock))
      ) {
        position.pendingUpdate = pendingUpdate;
      }

      if (position.sizeInUsd > 0) {
        acc[key] = position;
      }

      return acc;
    }, {} as PositionsData);
  }, [allPositionsKeys, pendingPositionsUpdates, positionDecreaseEvents, positionIncreaseEvents, positionsData]);
}

function applyEventChanges(position: Position, event: PositionIncreaseEvent | PositionDecreaseEvent) {
  const nextPosition = { ...position };

  nextPosition.sizeInUsd = event.sizeInUsd;
  nextPosition.sizeInTokens = event.sizeInTokens;
  nextPosition.collateralAmount = event.collateralAmount;
  nextPosition.pendingBorrowingFeesUsd = 0n;
  nextPosition.fundingFeeAmount = 0n;
  nextPosition.claimableLongTokenAmount = 0n;
  nextPosition.claimableShortTokenAmount = 0n;
  nextPosition.pendingUpdate = undefined;
  nextPosition.isOpening = false;

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionIncreaseEvent).increasedAtBlock) {
    nextPosition.increasedAtBlock = (event as PositionIncreaseEvent).increasedAtBlock;
  }

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionDecreaseEvent).decreasedAtBlock) {
    nextPosition.decreasedAtBlock = (event as PositionDecreaseEvent).decreasedAtBlock;
  }

  return nextPosition;
}

export function getPendingMockPosition(pendingUpdate: PendingPositionUpdate): Position {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);

  return {
    key: pendingUpdate.positionKey,
    contractKey: hashedPositionKey(account, marketAddress, collateralAddress, isLong),
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    isLong,
    sizeInUsd: pendingUpdate.sizeDeltaUsd ?? 0n,
    collateralAmount: pendingUpdate.collateralDeltaAmount ?? 0n,
    sizeInTokens: pendingUpdate.sizeDeltaInTokens ?? 0n,
    increasedAtBlock: pendingUpdate.updatedAtBlock,
    decreasedAtBlock: 0n,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    data: "0x",

    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}
