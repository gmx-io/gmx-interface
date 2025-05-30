import { useMemo } from "react";
import { Address, isAddressEqual } from "viem";

import { getContract } from "config/contracts";
import { accountOrderListKey } from "config/dataStore";
import { CacheKey, MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import { EMPTY_ARRAY } from "lib/objects";
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

import type {
  MarketFilterLongShortDirection,
  MarketFilterLongShortItemData,
} from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";

import type { MarketsInfoData } from "../markets/types";
import { getSwapPathOutputAddresses } from "../trade";
import { OrderTypeFilterValue, convertOrderTypeFilterValues } from "./ordersFilters";
import { DecreasePositionSwapType, OrderType, OrdersData } from "./types";

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

  const { data } = useMulticall(chainId, "useOrdersData", {
    key: key,
    request: buildUseOrdersMulticall,
    parseResponse: parseResponse,
  });

  const ordersData: OrdersData | undefined = useMemo(() => {
    const MOCK_ORDER = {
      key: "0x59cd812920178a563e7f6562ca60d5599ab556ab3227ff082111b94cee5e29a9",
      account: "0x2BE7f46c991dEFF90936fDbEdf987d6bb629BC51",
      receiver: "0x2BE7f46c991dEFF90936fDbEdf987d6bb629BC51",
      callbackContract: "0x0000000000000000000000000000000000000000",
      marketAddress: "0xAC2c6C1b0cd1CabF78B4e8ad58aA9d43375318Cb",
      initialCollateralTokenAddress: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
      swapPath: [],
      sizeDeltaUsd: 5990640732127527013560000000000n,
      initialCollateralDeltaAmount: 3000000n,
      contractTriggerPrice: 0n,
      contractAcceptablePrice: 2077428363634606426373n,
      executionFee: 8827500010700000n,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      updatedAtTime: (window as any).mockMarketOrder_updatedAtTime ?? 1748620704n,
      isLong: true,
      shouldUnwrapNativeToken: false,
      isFrozen: false,
      orderType: 2,
      decreasePositionSwapType: 0,
      autoCancel: false,
      uiFeeReceiver: "0xff00000000000000000000000000000000000001",
      validFromTime: 0n,
    };

    const shouldMockMarketOrder =
      (window as any).mockMarketOrder_updatedAtTime !== undefined || (window as any).show_mockMarketOrder;

    const filteredOrders = data?.orders.concat(shouldMockMarketOrder ? [MOCK_ORDER as any] : []).filter((order) => {
      if (isMarketOrderType(order.orderType)) {
        const is10SecondsPassedSinceOrderCreation = Date.now() - Number(order.updatedAtTime * 1000n) > 10000;
        if (!is10SecondsPassedSinceOrderCreation) {
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

function buildUseOrdersMulticall(chainId: number, key: CacheKey) {
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
        updatedAtTime: order.numbers.updatedAtTime,
        isLong: order.flags.isLong as boolean,
        shouldUnwrapNativeToken: order.flags.shouldUnwrapNativeToken as boolean,
        isFrozen: order.flags.isFrozen as boolean,
        orderType: order.numbers.orderType as OrderType,
        decreasePositionSwapType: order.numbers.decreasePositionSwapType as DecreasePositionSwapType,
        autoCancel: order.flags.autoCancel as boolean,
        uiFeeReceiver: order.addresses.uiFeeReceiver as Address,
        validFromTime: BigInt(order.numbers.validFromTime),
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
