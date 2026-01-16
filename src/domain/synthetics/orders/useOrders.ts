import { useEffect, useMemo } from "react";
import { Address, isAddressEqual } from "viem";

import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { OrderTypeFilterValue, convertOrderTypeFilterValues } from "domain/synthetics/orders/ordersFilters";
import type { DecreasePositionSwapType, Order, OrderType, OrdersData } from "domain/synthetics/orders/types";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { CacheKey, MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_ARRAY } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { getWrappedToken } from "sdk/configs/tokens";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  isVisibleOrder,
} from "sdk/utils/orders";
import { decodeTwapUiFeeReceiver } from "sdk/utils/twap/uiFeeReceiver";
import type { ReaderUtils } from "typechain-types/SyntheticsReader";

import type {
  MarketFilterLongShortDirection,
  MarketFilterLongShortItemData,
} from "components/TableMarketFilter/MarketFilterLongShort";

type OrdersResult = {
  ordersData?: OrdersData;
  count?: number;
};

const DEFAULT_COUNT = 1000;

export function useOrders(
  chainId: ContractsChainId,
  {
    account,
    marketsDirectionsFilter = EMPTY_ARRAY,
    orderTypesFilter = EMPTY_ARRAY,
    marketsInfoData,
  }: {
    account?: string | null;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderTypesFilter?: OrderTypeFilterValue[];
    marketsInfoData?: MarketsInfoData;
  }
): OrdersResult {
  const {
    nonSwapRelevantDefinedFiltersLowercased,
    hasNonSwapRelevantDefinedMarkets,
    pureDirectionFilters,
    hasPureDirectionFilters,
    swapRelevantDefinedMarketsLowercased,
    hasSwapRelevantDefinedMarkets,
  } = useMemo(() => {
    const nonSwapRelevantDefinedFiltersLowercased: MarketFilterLongShortItemData[] = marketsDirectionsFilter
      .filter((filter) => filter.direction !== "swap" && filter.marketAddress !== "any")
      .map((filter) => ({
        marketAddress: filter.marketAddress.toLowerCase() as Address,
        direction: filter.direction,
        collateralAddress: filter.collateralAddress?.toLowerCase() as Address,
      }));

    const hasNonSwapRelevantDefinedMarkets = nonSwapRelevantDefinedFiltersLowercased.length > 0;

    const pureDirectionFilters = marketsDirectionsFilter
      .filter((filter) => filter.direction !== "any" && filter.marketAddress === "any")
      .map((filter) => filter.direction);
    const hasPureDirectionFilters = pureDirectionFilters.length > 0;

    const swapRelevantDefinedMarketsLowercased = marketsDirectionsFilter
      .filter((filter) => (filter.direction === "any" || filter.direction === "swap") && filter.marketAddress !== "any")
      .map((filter) => filter.marketAddress.toLowerCase() as Address);

    const hasSwapRelevantDefinedMarkets = swapRelevantDefinedMarketsLowercased.length > 0;

    return {
      nonSwapRelevantDefinedFiltersLowercased,
      hasNonSwapRelevantDefinedMarkets,
      pureDirectionFilters,
      hasPureDirectionFilters,
      swapRelevantDefinedMarketsLowercased,
      hasSwapRelevantDefinedMarkets,
    };
  }, [marketsDirectionsFilter]);

  const key = useMemo(
    () => (!account ? null : ([account, marketsDirectionsFilter, orderTypesFilter] as const)),
    [account, marketsDirectionsFilter, orderTypesFilter]
  );

  const { data } = useMulticall(chainId, `useOrdersData-${chainId}`, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: key,
    request: buildUseOrdersMulticall,
    parseResponse: (res, chainId) => {
      const result = parseResponse(res, chainId);
      return result;
    },
  });

  useEffect(() => {
    if (!key) {
      freshnessMetrics.clear(chainId, FreshnessMetricId.Orders);
    }
  }, [key, chainId]);

  const ordersData: OrdersData | undefined = useMemo(() => {
    const filteredOrders = data?.orders.filter((order) => {
      if (isMarketOrderType(order.orderType)) {
        const is15SecondsPassedSinceOrderCreation = Date.now() - Number(order.updatedAtTime * 1000n) > 15_000;
        if (!is15SecondsPassedSinceOrderCreation) {
          return false;
        }
      }

      if (!isVisibleOrder(order.orderType)) {
        return false;
      }

      const matchByMarketResult = matchByMarket({
        order,
        nonSwapRelevantDefinedFiltersLowercased,
        hasNonSwapRelevantDefinedMarkets,
        pureDirectionFilters,
        hasPureDirectionFilters,
        swapRelevantDefinedMarketsLowercased,
        hasSwapRelevantDefinedMarkets,
        chainId,
        marketsInfoData,
      });

      let matchByOrderType = true;

      if (orderTypesFilter.length > 0) {
        const { type, groupType } = convertOrderTypeFilterValues(orderTypesFilter);

        const twapParams = decodeTwapUiFeeReceiver(order.uiFeeReceiver);
        const orderGroupType = twapParams ? "twap" : "none";
        matchByOrderType = type.includes(order.orderType) && groupType.includes(orderGroupType);
      }

      return matchByMarketResult && matchByOrderType;
    });

    return filteredOrders?.reduce((acc, order) => {
      acc[order.key] = order;
      return acc;
    }, {} as OrdersData);
  }, [
    chainId,
    data?.orders,
    hasNonSwapRelevantDefinedMarkets,
    hasPureDirectionFilters,
    hasSwapRelevantDefinedMarkets,
    marketsInfoData,
    nonSwapRelevantDefinedFiltersLowercased,
    orderTypesFilter,
    pureDirectionFilters,
    swapRelevantDefinedMarketsLowercased,
  ]);

  return {
    ordersData: ordersData,
    count: data?.count,
  };
}

function buildUseOrdersMulticall(chainId: ContractsChainId, key: CacheKey) {
  const account = key![0] as string;

  return {
    dataStore: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        count: {
          methodName: "getBytes32Count",
          params: [accountOrderListKey(account!)],
        },
        keys: {
          methodName: "getBytes32ValuesAt",
          params: [accountOrderListKey(account!), 0, DEFAULT_COUNT],
        },
      },
    },
    reader: {
      contractAddress: getContract(chainId, "SyntheticsReader"),
      abiId: "SyntheticsReader",
      calls: {
        orders: {
          methodName: "getAccountOrders",
          params: [getContract(chainId, "DataStore"), account, 0, DEFAULT_COUNT],
        },
      },
    },
  } satisfies MulticallRequestConfig<any>;
}

function parseResponse(res: MulticallResult<ReturnType<typeof buildUseOrdersMulticall>>, chainId: ContractsChainId) {
  const count = Number(res.data.dataStore.count.returnValues[0]);
  const orderKeys = res.data.dataStore.keys.returnValues;
  const orders = res.data.reader.orders.returnValues as any[];

  freshnessMetrics.reportThrottled(chainId, FreshnessMetricId.Orders);

  return {
    count,
    orders: orders.map((order, i) => {
      const key = orderKeys[i];
      const orderData = order.order as ReaderUtils.OrderInfoStructOutput["order"];

      return {
        key,
        account: orderData.addresses.account as Address,
        receiver: orderData.addresses.receiver as Address,
        // cancellationReceiver: orderData.addresses.cancellationReceiver as Address,
        callbackContract: orderData.addresses.callbackContract as Address,
        uiFeeReceiver: orderData.addresses.uiFeeReceiver as Address,
        marketAddress: orderData.addresses.market as Address,
        initialCollateralTokenAddress: orderData.addresses.initialCollateralToken as Address,
        swapPath: orderData.addresses.swapPath as Address[],
        sizeDeltaUsd: BigInt(orderData.numbers.sizeDeltaUsd),
        initialCollateralDeltaAmount: BigInt(orderData.numbers.initialCollateralDeltaAmount),
        contractTriggerPrice: BigInt(orderData.numbers.triggerPrice),
        contractAcceptablePrice: BigInt(orderData.numbers.acceptablePrice),
        executionFee: BigInt(orderData.numbers.executionFee),
        callbackGasLimit: BigInt(orderData.numbers.callbackGasLimit),
        minOutputAmount: BigInt(orderData.numbers.minOutputAmount),
        updatedAtTime: orderData.numbers.updatedAtTime,
        validFromTime: orderData.numbers.validFromTime,
        isLong: orderData.flags.isLong as boolean,
        shouldUnwrapNativeToken: orderData.flags.shouldUnwrapNativeToken as boolean,
        isFrozen: orderData.flags.isFrozen as boolean,
        orderType: orderData.numbers.orderType as unknown as OrderType,
        decreasePositionSwapType: orderData.numbers.decreasePositionSwapType as unknown as DecreasePositionSwapType,
        autoCancel: orderData.flags.autoCancel as boolean,
        data: orderData._dataList,
      } satisfies Order;
    }),
  };
}

function matchByMarket({
  order,
  nonSwapRelevantDefinedFiltersLowercased,
  hasNonSwapRelevantDefinedMarkets,
  pureDirectionFilters,
  hasPureDirectionFilters,
  swapRelevantDefinedMarketsLowercased,
  hasSwapRelevantDefinedMarkets,
  marketsInfoData,
  chainId,
}: {
  order: ReturnType<typeof parseResponse>["orders"][number];
  nonSwapRelevantDefinedFiltersLowercased: MarketFilterLongShortItemData[];
  hasNonSwapRelevantDefinedMarkets: boolean;
  pureDirectionFilters: MarketFilterLongShortDirection[];
  hasPureDirectionFilters: boolean;
  swapRelevantDefinedMarketsLowercased: Address[];
  hasSwapRelevantDefinedMarkets: boolean;
  marketsInfoData?: MarketsInfoData;
  chainId: number;
}) {
  if (!hasNonSwapRelevantDefinedMarkets && !hasSwapRelevantDefinedMarkets && !hasPureDirectionFilters) {
    return true;
  }

  const isSwapOrder = isSwapOrderType(order.orderType);

  const matchesPureDirectionFilter =
    hasPureDirectionFilters &&
    (isSwapOrder
      ? pureDirectionFilters.includes("swap")
      : pureDirectionFilters.includes(order.isLong ? "long" : "short"));

  if (hasPureDirectionFilters && !matchesPureDirectionFilter) {
    return false;
  }

  if (!hasNonSwapRelevantDefinedMarkets && !hasSwapRelevantDefinedMarkets) {
    return true;
  }

  if (isSwapOrder) {
    const sourceMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
      order.swapPath.at(0)!.toLowerCase() as Address
    );

    const destinationMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
      order.swapPath.at(-1)!.toLowerCase() as Address
    );

    return sourceMarketInSwapPath || destinationMarketInSwapPath;
  } else if (!isSwapOrder) {
    return nonSwapRelevantDefinedFiltersLowercased.some((filter) => {
      const marketMatch = filter.marketAddress === "any" || filter.marketAddress === order.marketAddress.toLowerCase();
      const directionMath = filter.direction === "any" || filter.direction === (order.isLong ? "long" : "short");
      const initialCollateralAddress = order.initialCollateralTokenAddress.toLowerCase();

      let collateralMatch = true;
      if (!filter.collateralAddress) {
        collateralMatch = true;
      } else if (isLimitOrderType(order.orderType)) {
        const wrappedToken = getWrappedToken(chainId);

        if (!marketsInfoData) {
          collateralMatch = true;
        } else {
          const { outTokenAddress } = getSwapPathOutputAddresses({
            marketsInfoData,
            initialCollateralAddress,
            isIncrease: isIncreaseOrderType(order.orderType),
            shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
            swapPath: order.swapPath,
            wrappedNativeTokenAddress: wrappedToken.address,
          });

          collateralMatch =
            outTokenAddress !== undefined && isAddressEqual(outTokenAddress as Address, filter.collateralAddress);
        }
      } else if (isTriggerDecreaseOrderType(order.orderType)) {
        collateralMatch = isAddressEqual(order.initialCollateralTokenAddress, filter.collateralAddress);
      }

      return marketMatch && directionMath && collateralMatch;
    });
  }

  return false;
}
