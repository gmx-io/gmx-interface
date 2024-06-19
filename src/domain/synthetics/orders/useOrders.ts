import identity from "lodash/identity";
import { useMemo } from "react";
import { Address } from "viem";

import type { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
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
    nonSwapRelevantFilterLowercased,
    hasNonSwapRelevantMarkets,
    swapRelevantDefinedMarketsLowercased,
    hasAllSwapsFilter,
    hasSwapRelevantDefinedMarkets,
  } = useMemo(() => {
    const nonSwapRelevantFilterLowercased: MarketFilterLongShortItemData[] = marketsDirectionsFilter
      .filter((filter) => filter.direction !== "swap")
      .map((filter) => ({
        marketAddress: filter.marketAddress.toLowerCase() as Address | "any",
        direction: filter.direction,
      }));

    const hasNonSwapRelevantMarkets = nonSwapRelevantFilterLowercased.length > 0;

    const swapRelevantDefinedMarketsLowercased = marketsDirectionsFilter
      .filter((filter) => (filter.direction === "any" || filter.direction === "swap") && filter.marketAddress !== "any")
      .map((filter) => filter.marketAddress.toLowerCase() as Address | "any");

    let hasAllSwapsFilter = marketsDirectionsFilter.some(
      (filter) => filter.direction === "swap" && filter.marketAddress === "any"
    );

    const hasSwapRelevantDefinedMarkets = swapRelevantDefinedMarketsLowercased.length > 0;

    return {
      nonSwapRelevantFilterLowercased,
      hasNonSwapRelevantMarkets,
      swapRelevantDefinedMarketsLowercased,
      hasAllSwapsFilter,
      hasSwapRelevantDefinedMarkets,
    };
  }, [marketsDirectionsFilter]);

  const key = useMemo(
    () =>
      !account
        ? null
        : [
            account,
            marketsDirectionsFilter
              .map((f) => f.marketAddress + f.direction)
              .sort()
              .join(","),
            orderTypesFilter
              // in order not to mutate default EMPTY_ARRAY
              .map(identity)
              .sort()
              .join(","),
          ],
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
        hasNonSwapRelevantMarkets,
        hasSwapRelevantDefinedMarkets,
        hasAllSwapsFilter,
        nonSwapRelevantFilterLowercased,
        swapRelevantDefinedMarketsLowercased,
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
    hasNonSwapRelevantMarkets,
    nonSwapRelevantFilterLowercased,
    hasAllSwapsFilter,
    hasSwapRelevantDefinedMarkets,
    swapRelevantDefinedMarketsLowercased,
    orderTypesFilter,
  ]);

  return {
    ordersData: ordersData,
    count: data?.count,
  };
}

function buildUseOrdersMulticall(chainId: number, key: CacheKey) {
  const account = key[0] as string;

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
  hasNonSwapRelevantMarkets,
  hasSwapRelevantDefinedMarkets,
  hasAllSwapsFilter,
  nonSwapRelevantFilterLowercased,
  swapRelevantDefinedMarketsLowercased,
}: {
  order: ReturnType<typeof parseResponse>["orders"][number];
  hasNonSwapRelevantMarkets: boolean;
  hasSwapRelevantDefinedMarkets: boolean;
  hasAllSwapsFilter: boolean;
  nonSwapRelevantFilterLowercased: MarketFilterLongShortItemData[];
  swapRelevantDefinedMarketsLowercased: (Address | "any")[];
}) {
  if (!hasNonSwapRelevantMarkets && !hasSwapRelevantDefinedMarkets && !hasAllSwapsFilter) {
    return true;
  }

  if (isSwapOrderType(order.orderType)) {
    if (hasAllSwapsFilter) {
      return true;
    }

    if (hasSwapRelevantDefinedMarkets) {
      const sourceMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
        order.swapPath.at(0)!.toLowerCase() as Address
      );

      const destinationMarketInSwapPath = swapRelevantDefinedMarketsLowercased.includes(
        order.swapPath.at(-1)!.toLowerCase() as Address
      );

      return sourceMarketInSwapPath || destinationMarketInSwapPath;
    }
  } else if (hasNonSwapRelevantMarkets) {
    return nonSwapRelevantFilterLowercased.some(
      (filter) =>
        (filter.marketAddress === "any" || filter.marketAddress === order.marketAddress.toLowerCase()) &&
        (filter.direction === "any" || filter.direction === (order.isLong ? "long" : "short"))
    );
  }

  return false;
}
