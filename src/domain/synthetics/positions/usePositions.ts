import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { hashedPositionKey } from "config/dataStore";
import { ARBITRUM_SEPOLIA, ContractsChainId } from "config/static/chains";
import {
  PendingPositionUpdate,
  PositionDecreaseEvent,
  PositionIncreaseEvent,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import type { Position } from "domain/synthetics/positions/types";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { ContractMarketPrices, MarketsData } from "sdk/types/markets";
import type { PositionsData } from "sdk/types/positions";
import type { TokensData } from "sdk/types/tokens";
import { getContractMarketPrices } from "sdk/utils/markets";
import { getPositionKey, parsePositionKey } from "sdk/utils/positions";
import type { SyntheticsReader } from "typechain-types/SyntheticsReader";

const MAX_PENDING_UPDATE_AGE = 600 * 1000; // 10 minutes

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
  error?: Error;
};

// todo
// sometimes there is an issue with decoding from abi
// Multicall request failed: usePositionsData-multichain-421614 Error: Response error reader: positions: Bytes value "102,1,128,153,224,35,39,163,83,117,145" is not a valid boolean. The bytes array must contain a single byte of either a 0 or 1 value.;

export function usePositions(
  chainId: ContractsChainId,
  p: {
    marketsData?: MarketsData;
    tokensData?: TokensData;
    account: string | null | undefined;
  }
): PositionsResult {
  const { marketsData, tokensData, account } = p;
  const [disableBatching, setDisableBatching] = useState(true);

  const keysAndPrices = useKeysAndPricesParams({
    marketsData,
    tokensData,
    account,
  });

  // TODO: debug sometimes issues with decoding from abi
  const {
    data: positionsData,
    error: positionsError,
    isLoading,
  } = useMulticall(
    chainId,
    chainId === ARBITRUM_SEPOLIA ? `usePositionsData-multichain-${chainId}` : "usePositionsData",
    {
      key: account && keysAndPrices.marketsKeys.length ? [account, keysAndPrices.marketsKeys] : null,

      refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
      clearUnusedKeys: true,
      keepPreviousData: true,
      disableBatching,

      request: (requestChainId) => {
        return {
          reader: {
            contractAddress: getContract(requestChainId, "SyntheticsReader"),
            abiId: requestChainId === ARBITRUM_SEPOLIA ? "SyntheticsReaderArbitrumSepolia" : "SyntheticsReader",
            calls: {
              positions: {
                methodName: "getAccountPositionInfoList",
                params: [
                  getContract(requestChainId, "DataStore"),
                  getContract(requestChainId, "ReferralStorage"),
                  account!,
                  keysAndPrices.marketsKeys,
                  keysAndPrices.marketsPrices,
                  // uiFeeReceiver
                  ethers.ZeroAddress,
                  0,
                  1000,
                ] satisfies Parameters<SyntheticsReader["getAccountPositionInfoList"]>,
              },
            },
          },
        };
      },
      parseResponse: (res) => {
        const positions = res.data.reader.positions.returnValues;

        return positions.reduce((positionsMap: PositionsData, positionInfo) => {
          const { position, fees, basePnlUsd } = positionInfo;
          const { addresses, numbers, flags } = position;
          const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

          // Empty position
          if (numbers.increasedAtTime == 0n) {
            return positionsMap;
          }

          const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
          const contractPositionKey = hashedPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);

          positionsMap[positionKey] = {
            key: positionKey,
            contractKey: contractPositionKey,
            account,
            marketAddress,
            collateralTokenAddress,
            sizeInUsd: numbers.sizeInUsd,
            sizeInTokens: numbers.sizeInTokens,
            collateralAmount: numbers.collateralAmount,
            increasedAtTime: numbers.increasedAtTime,
            decreasedAtTime: numbers.decreasedAtTime,
            isLong: flags.isLong,
            pendingBorrowingFeesUsd: fees.borrowing.borrowingFeeUsd,
            fundingFeeAmount: fees.funding.fundingFeeAmount,
            claimableLongTokenAmount: fees.funding.claimableLongTokenAmount,
            claimableShortTokenAmount: fees.funding.claimableShortTokenAmount,
            pnl: basePnlUsd,
            positionFeeAmount: fees.positionFeeAmount,
            traderDiscountAmount: fees.referral.traderDiscountAmount,
            uiFeeAmount: fees.ui.uiFeeAmount,
            data: "",
          };

          return positionsMap;
        }, {} as PositionsData);
      },
    }
  );

  useEffect(() => {
    if (positionsData && disableBatching) {
      setDisableBatching(false);
    }
  }, [disableBatching, positionsData]);

  const optimisticPositionsData = useOptimisticPositions({
    positionsData: positionsData,
    allPositionsKeys: keysAndPrices?.allPositionsKeys,
    isLoading,
  });

  return {
    positionsData: optimisticPositionsData,
    error: positionsError,
  };
}

function useKeysAndPricesParams(p: {
  account: string | null | undefined;
  marketsData: MarketsData | undefined;
  tokensData: TokensData | undefined;
}) {
  const { account, marketsData, tokensData } = p;

  return useMemo(() => {
    const values = {
      allPositionsKeys: [] as string[],
      marketsPrices: [] as ContractMarketPrices[],
      marketsKeys: [] as string[],
    };

    if (!account || !marketsData || !tokensData) {
      return values;
    }

    const markets = Object.values(marketsData);

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices || market.isSpotOnly) {
        continue;
      }

      values.marketsKeys.push(market.marketTokenAddress);
      values.marketsPrices.push(marketPrices);

      const collaterals = market.isSameCollaterals
        ? [market.longTokenAddress]
        : [market.longTokenAddress, market.shortTokenAddress];

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const positionKey = getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);
          values.allPositionsKeys.push(positionKey);
        }
      }
    }

    return values;
  }, [account, marketsData, tokensData]);
}

export function useOptimisticPositions(p: {
  positionsData: PositionsData | undefined;
  allPositionsKeys: string[] | undefined;
  isLoading: boolean;
}): PositionsData | undefined {
  const { positionsData, allPositionsKeys, isLoading } = p;
  const { positionDecreaseEvents, positionIncreaseEvents, pendingPositionsUpdates } = useSyntheticsEvents();

  return useMemo(() => {
    if (!allPositionsKeys || isLoading) {
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
        lastIncreaseEvent.increasedAtTime > position.increasedAtTime &&
        lastIncreaseEvent.increasedAtTime > (lastDecreaseEvent?.decreasedAtTime || 0)
      ) {
        position = applyEventChanges(position, lastIncreaseEvent);
      } else if (
        lastDecreaseEvent &&
        lastDecreaseEvent.decreasedAtTime > position.decreasedAtTime &&
        lastDecreaseEvent.decreasedAtTime > (lastIncreaseEvent?.increasedAtTime || 0)
      ) {
        position = applyEventChanges(position, lastDecreaseEvent);
      }

      if (
        pendingUpdate &&
        ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.increasedAtTime) ||
          (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.decreasedAtTime))
      ) {
        position.pendingUpdate = pendingUpdate;
      }

      if (position.sizeInUsd > 0) {
        acc[key] = position;
      }

      return acc;
    }, {} as PositionsData);
  }, [
    allPositionsKeys,
    isLoading,
    pendingPositionsUpdates,
    positionDecreaseEvents,
    positionIncreaseEvents,
    positionsData,
  ]);
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
  if ((event as PositionIncreaseEvent).increasedAtTime) {
    nextPosition.increasedAtTime = (event as PositionIncreaseEvent).increasedAtTime;
  }

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionDecreaseEvent).decreasedAtTime) {
    nextPosition.decreasedAtTime = (event as PositionDecreaseEvent).decreasedAtTime;
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
    increasedAtTime: pendingUpdate.updatedAtBlock,
    decreasedAtTime: 0n,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    positionFeeAmount: 0n,
    uiFeeAmount: 0n,
    pnl: 0n,
    traderDiscountAmount: 0n,
    pendingImpactAmount: 0n,
    pendingImpactUsd: 0n,
    borrowingFactor: 0n,
    fundingFeeAmountPerSize: 0n,
    longTokenClaimableFundingAmountPerSize: 0n,
    shortTokenClaimableFundingAmountPerSize: 0n,
    data: "0x",
    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}
