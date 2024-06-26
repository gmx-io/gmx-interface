import { useMemo } from "react";
import { Address } from "viem";

import type {
  MarketFilterLongShortDirection,
  MarketFilterLongShortItemData,
} from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import { CacheKey, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_ARRAY } from "lib/objects";
import { DecreasePositionSwapType, OrderType, OrdersData } from "./types";
import { isSwapOrderType, isVisibleOrder } from "./utils";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";

type OrdersResult = {
  ordersData?: OrdersData;
  count?: number;
};

const DEFAULT_COUNT = 1000;

export function useOrders(
  chainId: number,
  {
    account,
    marketsDirectionsFilter = EMPTY_ARRAY,
    orderTypesFilter = EMPTY_ARRAY,
  }: {
    account?: string | null;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderTypesFilter?: OrderType[];
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

  const { data } = useMulticall(chainId, "useOrdersData", {
    key: key,
    request: buildUseOrdersMulticall,
    parseResponse: parseResponse,
  });

  const ordersData: OrdersData | undefined = useMemo(() => {
    const filteredOrders = data?.orders.filter((order) => {
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
      });

      let matchByOrderType = true;

      if (orderTypesFilter.length > 0) {
        matchByOrderType = orderTypesFilter.includes(order.orderType);
      }

      return matchByMarketResult && matchByOrderType;
    });

    return filteredOrders?.reduce((acc, order) => {
      acc[order.key] = order;
      return acc;
    }, {} as OrdersData);
  }, [
    data?.orders,
    hasNonSwapRelevantDefinedMarkets,
    hasPureDirectionFilters,
    hasSwapRelevantDefinedMarkets,
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

function buildUseOrdersMulticall(chainId: number, key: CacheKey) {
  const account = key![0] as string;

  return {
    dataStore: {
      contractAddress: getContract(chainId, "DataStore"),
      abi: DataStore.abi,
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
      abi: SyntheticsReader.abi,
      calls: {
        orders: {
          methodName: "getAccountOrders",
          params: [getContract(chainId, "DataStore"), account, 0, DEFAULT_COUNT],
        },
      },
    },
  };
}

function parseResponse(res: MulticallResult<ReturnType<typeof buildUseOrdersMulticall>>) {
  const count = Number(res.data.dataStore.count.returnValues[0]);
  const orderKeys = res.data.dataStore.keys.returnValues;
  const orders = res.data.reader.orders.returnValues as any[];

  return {
    count,
    orders: orders.map((order, i) => {
      const key = orderKeys[i];
      const { data } = order;

      return {
        key,
        account: order.addresses.account as Address,
        receiver: order.addresses.receiver as Address,
        callbackContract: order.addresses.callbackContract as Address,
        marketAddress: order.addresses.market as Address,
        initialCollateralTokenAddress: order.addresses.initialCollateralToken as Address,
        swapPath: order.addresses.swapPath as Address[],
        sizeDeltaUsd: BigInt(order.numbers.sizeDeltaUsd),
        initialCollateralDeltaAmount: BigInt(order.numbers.initialCollateralDeltaAmount),
        contractTriggerPrice: BigInt(order.numbers.triggerPrice),
        contractAcceptablePrice: BigInt(order.numbers.acceptablePrice),
        executionFee: BigInt(order.numbers.executionFee),
        callbackGasLimit: BigInt(order.numbers.callbackGasLimit),
        minOutputAmount: BigInt(order.numbers.minOutputAmount),
        updatedAtBlock: BigInt(order.numbers.updatedAtBlock),
        isLong: order.flags.isLong as boolean,
        shouldUnwrapNativeToken: order.flags.shouldUnwrapNativeToken as boolean,
        isFrozen: order.flags.isFrozen as boolean,
        orderType: order.numbers.orderType as OrderType,
        decreasePositionSwapType: order.numbers.decreasePositionSwapType as DecreasePositionSwapType,
        data,
      };
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
}: {
  order: ReturnType<typeof parseResponse>["orders"][number];
  nonSwapRelevantDefinedFiltersLowercased: MarketFilterLongShortItemData[];
  hasNonSwapRelevantDefinedMarkets: boolean;
  pureDirectionFilters: MarketFilterLongShortDirection[];
  hasPureDirectionFilters: boolean;
  swapRelevantDefinedMarketsLowercased: Address[];
  hasSwapRelevantDefinedMarkets: boolean;
}) {
  if (!hasNonSwapRelevantDefinedMarkets && !hasSwapRelevantDefinedMarkets && !hasPureDirectionFilters) {
    return true;
  }

  const matchesPureDirectionFilter =
    hasPureDirectionFilters &&
    (isSwapOrderType(order.orderType)
      ? pureDirectionFilters.includes("swap")
      : pureDirectionFilters.includes(order.isLong ? "long" : "short"));

  if (hasPureDirectionFilters && !matchesPureDirectionFilter) {
    return false;
  }

  if (isSwapOrderType(order.orderType)) {
    if (!hasSwapRelevantDefinedMarkets) {
      return true;
    }

    const sourceMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
      order.swapPath.at(0)!.toLowerCase() as Address
    );

    const destinationMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
      order.swapPath.at(-1)!.toLowerCase() as Address
    );

    return sourceMarketInSwapPath || destinationMarketInSwapPath;
  } else {
    if (!hasNonSwapRelevantDefinedMarkets) {
      return true;
    }

    return nonSwapRelevantDefinedFiltersLowercased.some(
      (filter) =>
        filter.marketAddress === order.marketAddress.toLowerCase() &&
        (filter.direction === "any" || filter.direction === (order.isLong ? "long" : "short")) &&
        (!filter.collateralAddress || filter.collateralAddress === order.initialCollateralTokenAddress.toLowerCase())
    );
  }

  return false;
}
