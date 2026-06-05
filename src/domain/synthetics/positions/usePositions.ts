import { useEffect, useMemo, useState } from "react";
import { ContractFunctionParameters, zeroAddress } from "viem";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { hashedPositionKey } from "config/dataStore";
import { FreshnessMetricId, metrics, MissedMarketPricesCounter } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { executeMulticall, useMulticall } from "lib/multicall";
import { serializeMulticallErrors } from "lib/multicall/utils";
import { getByKey } from "lib/objects";
import { sleep } from "lib/sleep";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import { abis } from "sdk/abis";
import { getContractMarketPrices } from "sdk/utils/markets";
import type { ContractMarketPrices, MarketsData } from "sdk/utils/markets/types";
import { getPositionKey } from "sdk/utils/positions";
import type { PositionsData } from "sdk/utils/positions/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { useOptimisticPositions } from "./useOptimisticPositions";

export { getPendingMockPosition } from "./useOptimisticPositions";

const MAX_POSITIONS_COUNT = 1000n;
const RAW_POSITIONS_TIMEOUT = 60_000;

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
  error?: Error;
};

type RawPositionResult = {
  addresses: { account: string; market: string; collateralToken: string };
  flags: { isLong: boolean };
};

type PositionInfoResult = {
  position: {
    addresses: { account: string; market: string; collateralToken: string };
    numbers: {
      sizeInUsd: bigint;
      sizeInTokens: bigint;
      collateralAmount: bigint;
      increasedAtTime: bigint;
      decreasedAtTime: bigint;
      pendingImpactAmount: bigint;
    };
    flags: { isLong: boolean };
  };
  fees: {
    borrowing: { borrowingFeeUsd: bigint };
    funding: {
      fundingFeeAmount: bigint;
      claimableLongTokenAmount: bigint;
      claimableShortTokenAmount: bigint;
    };
    referral: { traderDiscountAmount: bigint };
    ui: { uiFeeAmount: bigint };
    positionFeeAmount: bigint;
  };
  basePnlUsd: bigint;
};

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

  const positionsKey = useMemo(
    () => (account && keysAndPrices.marketsKeys.length ? [account, keysAndPrices.marketsKeys] : null),
    [account, keysAndPrices.marketsKeys]
  );

  const {
    data: positionsData,
    error: positionsError,
    isLoading,
  } = useMulticall(chainId, "usePositionsData", {
    key: positionsKey,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,
    disableBatching,

    request: async (requestChainId) => {
      const rawPositionsResult = await Promise.race([
        sleep(RAW_POSITIONS_TIMEOUT).then(() => Promise.reject(new Error("getAccountPositions timeout"))),
        executeMulticall(
          requestChainId,
          {
            reader: {
              contractAddress: getContract(requestChainId, "SyntheticsReader"),
              abiId: "SyntheticsReader",
              calls: {
                positions: {
                  methodName: "getAccountPositions",
                  params: [
                    getContract(requestChainId, "DataStore"),
                    account!,
                    0n,
                    MAX_POSITIONS_COUNT,
                  ] satisfies ContractFunctionParameters<
                    typeof abis.SyntheticsReader,
                    "view",
                    "getAccountPositions"
                  >["args"],
                },
              },
            },
          },
          "urgent",
          "usePositionsData"
        ),
      ]);

      const rawPositions = rawPositionsResult.data.reader?.positions?.returnValues as RawPositionResult[] | undefined;

      if (!rawPositionsResult.success || !rawPositions) {
        throw new Error(`getAccountPositions request failed: ${serializeMulticallErrors(rawPositionsResult.errors)}`);
      }

      const positionsKeys: `0x${string}`[] = [];
      const positionsPrices: ContractMarketPrices[] = [];

      for (const rawPosition of rawPositions) {
        const { account: positionAccount, market: marketAddress, collateralToken } = rawPosition.addresses;

        const market = getByKey(marketsData, marketAddress);
        const marketPrices = market && tokensData ? getContractMarketPrices(tokensData, market) : undefined;

        // Skip positions on markets without known prices (e.g. delisted markets) —
        // there are no prices to pass for them, so they are hidden until prices are available.
        // (The previous getAccountPositionInfoList reverted the whole call with
        // EmptyMarketPrice because of such positions.)
        if (!marketPrices) {
          metrics.pushCounter<MissedMarketPricesCounter>("missedMarketPrices", {
            marketName: market?.name ?? marketAddress,
            source: "usePositions",
          });
          continue;
        }

        positionsKeys.push(
          hashedPositionKey(positionAccount, marketAddress, collateralToken, rawPosition.flags.isLong) as `0x${string}`
        );
        positionsPrices.push(marketPrices);
      }

      return {
        reader: {
          contractAddress: getContract(requestChainId, "SyntheticsReader"),
          abiId: "SyntheticsReader",
          calls: {
            positions: {
              methodName: "getPositionInfoList",
              params: [
                getContract(requestChainId, "DataStore"),
                getContract(requestChainId, "ReferralStorage"),
                positionsKeys,
                positionsPrices,
                // uiFeeReceiver
                zeroAddress,
              ] satisfies ContractFunctionParameters<
                typeof abis.SyntheticsReader,
                "view",
                "getPositionInfoList"
              >["args"],
            },
          },
        },
      };
    },
    parseResponse: (res, chainId) => {
      const positions = res.data.reader.positions.returnValues;

      freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Positions);

      return positions.reduce((positionsMap: PositionsData, positionInfo: PositionInfoResult) => {
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
          pendingImpactAmount: numbers.pendingImpactAmount,
          pnl: basePnlUsd,
          positionFeeAmount: fees.positionFeeAmount,
          traderDiscountAmount: fees.referral.traderDiscountAmount,
          uiFeeAmount: fees.ui.uiFeeAmount,
          data: "",
        };

        return positionsMap;
      }, {} as PositionsData);
    },
  });

  useEffect(() => {
    if (positionsData && disableBatching) {
      setDisableBatching(false);
    }
  }, [disableBatching, positionsData]);

  useEffect(() => {
    if (!positionsKey) {
      freshnessMetrics.clear(chainId, FreshnessMetricId.Positions);
    }
  }, [positionsKey, chainId]);

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
      marketsKeys: [] as string[],
    };

    if (!account || !marketsData || !tokensData) {
      return values;
    }

    const markets = Object.values(marketsData);

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (market.isSpotOnly) {
        continue;
      }

      if (!marketPrices) {
        metrics.pushCounter<MissedMarketPricesCounter>("missedMarketPrices", {
          marketName: market.name,
          source: "useKeysAndPricesParams",
        });
        continue;
      }

      values.marketsKeys.push(market.marketTokenAddress);

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
