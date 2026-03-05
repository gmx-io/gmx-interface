import { useEffect, useMemo } from "react";
import { Address, ContractFunctionReturnType, isAddressEqual } from "viem";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import type { MarketsInfoData } from "domain/synthetics/markets/types";
import { OrderTypeFilterValue, convertOrderTypeFilterValues } from "domain/synthetics/orders/ordersFilters";
import { DecreasePositionSwapType, Order, OrderType, OrdersData } from "domain/synthetics/orders/types";
import { useApiOrdersRequest } from "domain/synthetics/orders/useApiOrdersRequest";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade";
import { FreshnessMetricId } from "lib/metrics";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { CacheKey, MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_ARRAY } from "lib/objects";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import { abis } from "sdk/abis";
import { getWrappedToken } from "sdk/configs/tokens";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isMarketOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  isVisibleOrder,
} from "sdk/utils/orders";
import type { ApiOrderInfo } from "sdk/utils/orders/types";
import { decodeTwapUiFeeReceiver } from "sdk/utils/twap/uiFeeReceiver";

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

  const apiEnabled = false;
  const {
    ordersData: apiOrdersData,
    isStale: isApiStale,
    error: apiError,
  } = useApiOrdersRequest(chainId, { account, enabled: apiEnabled });

  const rpcEnabled = !apiEnabled || isApiStale || Boolean(apiError);
  const { data: rpcData } = useMulticall(chainId, `useOrdersData-${chainId}`, {
    refreshInterval: FREQUENT_UPDATE_INTERVAL,
    key: rpcEnabled ? key : null,
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
    let orders: Order[] | undefined;

    if (apiEnabled && apiOrdersData && !isApiStale && !apiError) {
      orders = Object.values(apiOrdersData).map(convertApiOrderToOrder);
    } else if (rpcData?.orders) {
      orders = rpcData.orders;
    }

    if (!orders) {
      return undefined;
    }

    const filteredOrders = orders.filter((order) => {
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

    return filteredOrders.reduce((acc, order) => {
      acc[order.key] = order;
      return acc;
    }, {} as OrdersData);
  }, [
    apiEnabled,
    apiOrdersData,
    isApiStale,
    apiError,
    rpcData?.orders,
    chainId,
    hasNonSwapRelevantDefinedMarkets,
    hasPureDirectionFilters,
    hasSwapRelevantDefinedMarkets,
    marketsInfoData,
    nonSwapRelevantDefinedFiltersLowercased,
    orderTypesFilter,
    pureDirectionFilters,
    swapRelevantDefinedMarketsLowercased,
  ]);

  const count =
    apiEnabled && apiOrdersData && !isApiStale && !apiError ? Object.keys(apiOrdersData).length : rpcData?.count;

  return {
    ordersData: ordersData,
    count,
  };
}

function convertApiOrderToOrder({
  triggerPrice,
  acceptablePrice,
  cancellationReceiver: _cancellationReceiver,
  srcChainId: _srcChainId,
  ...rest
}: ApiOrderInfo): Order {
  return {
    ...rest,
    orderType: rest.orderType as OrderType,
    decreasePositionSwapType: rest.decreasePositionSwapType as DecreasePositionSwapType,
    contractTriggerPrice: triggerPrice,
    contractAcceptablePrice: acceptablePrice,
    data: [],
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
      const orderData = order.order as ContractFunctionReturnType<
        typeof abis.SyntheticsReader,
        "view",
        "getAccountOrders"
      >[number]["order"];

      return {
        key,
        account: orderData.addresses.account,
        receiver: orderData.addresses.receiver,
        // cancellationReceiver: orderData.addresses.cancellationReceiver as Address,
        callbackContract: orderData.addresses.callbackContract,
        uiFeeReceiver: orderData.addresses.uiFeeReceiver,
        marketAddress: orderData.addresses.market,
        initialCollateralTokenAddress: orderData.addresses.initialCollateralToken,
        swapPath: orderData.addresses.swapPath as string[],
        sizeDeltaUsd: BigInt(orderData.numbers.sizeDeltaUsd),
        initialCollateralDeltaAmount: BigInt(orderData.numbers.initialCollateralDeltaAmount),
        contractTriggerPrice: BigInt(orderData.numbers.triggerPrice),
        contractAcceptablePrice: BigInt(orderData.numbers.acceptablePrice),
        executionFee: BigInt(orderData.numbers.executionFee),
        callbackGasLimit: BigInt(orderData.numbers.callbackGasLimit),
        minOutputAmount: BigInt(orderData.numbers.minOutputAmount),
        updatedAtTime: orderData.numbers.updatedAtTime,
        validFromTime: orderData.numbers.validFromTime,
        isLong: orderData.flags.isLong,
        shouldUnwrapNativeToken: orderData.flags.shouldUnwrapNativeToken,
        isFrozen: orderData.flags.isFrozen,
        orderType: orderData.numbers.orderType as OrderType,
        decreasePositionSwapType: orderData.numbers.decreasePositionSwapType as DecreasePositionSwapType,
        autoCancel: orderData.flags.autoCancel,
        data: orderData._dataList as string[],
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
  order: Order;
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
