import { useMemo } from "react";
import { Address, isAddressEqual } from "viem";

import type {
  MarketFilterLongShortDirection,
  MarketFilterLongShortItemData,
} from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import { getWrappedToken } from "config/tokens";
import { CacheKey, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_ARRAY } from "lib/objects";
import type { MarketsInfoData } from "../markets/types";
import { getSwapPathOutputAddresses } from "../trade";
import { DecreasePositionSwapType, OrderType, OrdersData } from "./types";
import {
  isIncreaseOrderType,
  isLimitOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
  isVisibleOrder,
} from "./utils";

import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useInjectMulticall, useIsInMulticallFetcher } from "context/SyntheticsStateContext/useInjectMulticall";

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
    marketsInfoData,
  }: {
    account?: string | null;
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
    orderTypesFilter?: OrderType[];
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

  const isInMulticallFetcher = useIsInMulticallFetcher();
  const useAbstractMulticall = isInMulticallFetcher ? useInjectMulticall : useMulticall;

  const { data } = useAbstractMulticall(chainId, "useOrdersData", {
    key: key,
    groupId: "1",
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
        chainId,
        marketsInfoData,
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
