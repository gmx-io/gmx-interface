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
import { BigNumber, ethers } from "ethers";
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
              ethers.constants.AddressZero,
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
        if (BigNumber.from(numbers.increasedAtBlock).eq(0)) {
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
          sizeInUsd: BigNumber.from(numbers.sizeInUsd),
          sizeInTokens: BigNumber.from(numbers.sizeInTokens),
          collateralAmount: BigNumber.from(numbers.collateralAmount),
          increasedAtBlock: BigNumber.from(numbers.increasedAtBlock),
          decreasedAtBlock: BigNumber.from(numbers.decreasedAtBlock),
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: BigNumber.from(fees.borrowing.borrowingFeeUsd),
          fundingFeeAmount: BigNumber.from(fees.funding.fundingFeeAmount),
          claimableLongTokenAmount: BigNumber.from(fees.funding.claimableLongTokenAmount),
          claimableShortTokenAmount: BigNumber.from(fees.funding.claimableShortTokenAmount),
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

      const lastIncreaseEvent = positionIncreaseEvents.filter((e) => e.positionKey === key).pop();
      const lastDecreaseEvent = positionDecreaseEvents.filter((e) => e.positionKey === key).pop();

      const pendingUpdate =
        pendingPositionsUpdates[key] && pendingPositionsUpdates[key]!.updatedAt + MAX_PENDING_UPDATE_AGE > now
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
        lastIncreaseEvent.increasedAtBlock.gt(position.increasedAtBlock) &&
        lastIncreaseEvent.increasedAtBlock.gt(lastDecreaseEvent?.decreasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastIncreaseEvent);
      } else if (
        lastDecreaseEvent &&
        lastDecreaseEvent.decreasedAtBlock.gt(position.decreasedAtBlock) &&
        lastDecreaseEvent.decreasedAtBlock.gt(lastIncreaseEvent?.increasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastDecreaseEvent);
      }

      if (
        pendingUpdate &&
        ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock.gt(position.increasedAtBlock)) ||
          (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock.gt(position.decreasedAtBlock)))
      ) {
        position.pendingUpdate = pendingUpdate;
      }

      if (position.sizeInUsd.gt(0)) {
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
  nextPosition.pendingBorrowingFeesUsd = BigNumber.from(0);
  nextPosition.fundingFeeAmount = BigNumber.from(0);
  nextPosition.claimableLongTokenAmount = BigNumber.from(0);
  nextPosition.claimableShortTokenAmount = BigNumber.from(0);
  nextPosition.pendingUpdate = undefined;
  nextPosition.isOpening = false;

  if ((event as PositionIncreaseEvent).increasedAtBlock) {
    nextPosition.increasedAtBlock = (event as PositionIncreaseEvent).increasedAtBlock;
  }

  if ((event as PositionDecreaseEvent).decreasedAtBlock) {
    nextPosition.decreasedAtBlock = (event as PositionDecreaseEvent).decreasedAtBlock;
  }

  return nextPosition;
}

function getPendingMockPosition(pendingUpdate: PendingPositionUpdate): Position {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);

  return {
    key: pendingUpdate.positionKey,
    contractKey: hashedPositionKey(account, marketAddress, collateralAddress, isLong),
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    isLong,
    sizeInUsd: pendingUpdate.sizeDeltaUsd || BigNumber.from(0),
    collateralAmount: pendingUpdate.collateralDeltaAmount || BigNumber.from(0),
    sizeInTokens: pendingUpdate.sizeDeltaInTokens || BigNumber.from(0),
    increasedAtBlock: pendingUpdate.updatedAtBlock,
    decreasedAtBlock: BigNumber.from(0),
    pendingBorrowingFeesUsd: BigNumber.from(0),
    fundingFeeAmount: BigNumber.from(0),
    claimableLongTokenAmount: BigNumber.from(0),
    claimableShortTokenAmount: BigNumber.from(0),
    data: "0x",

    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}
