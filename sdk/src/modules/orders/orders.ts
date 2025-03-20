import { Address } from "viem";

import { getWrappedToken } from "configs/tokens";
import { MarketFilterLongShortItemData } from "modules/trades/trades";

import { MarketInfo, MarketsInfoData } from "types/markets";
import { OrdersData, OrdersInfoData, OrderType, PositionOrderInfo } from "types/orders";
import { SidecarLimitOrderEntryValid, SidecarSlTpOrderEntryValid } from "types/sidecarOrders";
import { TokenData, TokensData } from "types/tokens";
import { DecreasePositionAmounts, IncreasePositionAmounts, SwapAmounts } from "types/trade";

import { getByKey } from "utils/objects";
import { getOrderInfo, isOrderForPositionByData, isVisibleOrder } from "utils/orders";

import { createDecreaseOrderTxn } from "./transactions/createDecreaseOrderTxn";
import { createIncreaseOrderTxn } from "./transactions/createIncreaseOrderTxn";
import { buildGetOrdersMulticall, getExecutionFeeAmountForEntry, matchByMarket, parseGetOrdersResponse } from "./utils";
import { Module } from "../base";
import { createSwapOrderTxn } from "./transactions/createSwapOrderTxn";
import { createWrapOrUnwrapTxn, WrapOrUnwrapParams } from "./transactions/createWrapOrUnwrapTxn";
import { cancelOrdersTxn } from "./transactions/cancelOrdersTxn";
import { PositionIncreaseParams, SwapParams, increaseOrderHelper, swap } from "./helpers";

export class Orders extends Module {
  async getOrders({
    account: _account,
    marketsInfoData,
    tokensData,
    orderTypesFilter = [],
    marketsDirectionsFilter = [],
  }: {
    account?: string;
    marketsInfoData: MarketsInfoData;
    tokensData: TokensData;
    orderTypesFilter?: OrderType[];
    marketsDirectionsFilter?: MarketFilterLongShortItemData[];
  }) {
    const account = _account || this.account;

    if (!account) {
      return {
        count: 0,
        ordersInfoData: {},
      };
    }

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

    const orders = await this.sdk
      .executeMulticall(buildGetOrdersMulticall(this.chainId, account))
      .then(parseGetOrdersResponse);

    const filteredOrders = orders.orders.filter((order) => {
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
        chainId: this.chainId,
        marketsInfoData,
      });

      let matchByOrderType = true;

      if (orderTypesFilter.length > 0) {
        matchByOrderType = orderTypesFilter.includes(order.orderType);
      }

      return matchByMarketResult && matchByOrderType;
    });

    const ordersData = filteredOrders?.reduce((acc, order) => {
      acc[order.key] = order;
      return acc;
    }, {} as OrdersData);

    const wrappedToken = getWrappedToken(this.chainId);
    const ordersInfoData = Object.keys(ordersData).reduce((acc: OrdersInfoData, orderKey: string) => {
      const order = getByKey(ordersData, orderKey)!;

      const orderInfo = getOrderInfo({
        marketsInfoData,
        tokensData,
        wrappedNativeToken: wrappedToken,
        order,
      });

      if (!orderInfo) {
        // eslint-disable-next-line no-console
        console.warn(`OrderInfo parsing error`, order);

        return acc;
      }

      acc[orderKey] = orderInfo;

      return acc;
    }, {} as OrdersInfoData);

    return {
      count: orders.count,
      ordersInfoData,
    };
  }

  async createIncreaseOrder({
    isLimit,
    marketAddress,
    allowedSlippage,
    collateralTokenAddress,
    receiveTokenAddress,
    fromToken,
    triggerPrice,
    referralCodeForTxn,
    increaseAmounts,
    collateralToken,
    createSltpEntries,
    cancelSltpEntries,
    updateSltpEntries,
    marketInfo,
    isLong,
    indexToken,
    marketsInfoData,
    tokensData,
    skipSimulation,
  }: {
    marketsInfoData: MarketsInfoData;
    tokensData: TokensData;
    isLimit: boolean;
    marketAddress: string;
    fromToken: TokenData;
    allowedSlippage: number;
    collateralToken: TokenData;
    referralCodeForTxn?: string;
    triggerPrice?: bigint;
    collateralTokenAddress: string;
    receiveTokenAddress: string;
    isLong: boolean;
    createSltpEntries?: SidecarSlTpOrderEntryValid[];
    cancelSltpEntries?: (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[];
    updateSltpEntries?: (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[];
    marketInfo: MarketInfo;
    indexToken: TokenData;
    increaseAmounts: IncreasePositionAmounts;
    skipSimulation?: boolean;
  }) {
    const account = this.account;

    if (!account) {
      throw new Error("Account is not defined");
    }

    const gasLimits = await this.sdk.utils.getGasLimits();
    const gasPrice = await this.sdk.utils.getGasPrice();
    const executionFee = await this.sdk.utils.getExecutionFee("increase", tokensData, {
      increaseAmounts,
    });

    if (!executionFee) {
      throw new Error("Execution fee is not available");
    }

    const { ordersInfoData } = await this.sdk.orders.getOrders({
      marketsInfoData,
      tokensData,
    });
    const orders = Object.values(ordersInfoData || {});
    const positionOrders = orders.filter((order) =>
      isOrderForPositionByData(order, {
        isLong,
        marketAddress,
        account,
        collateralAddress: collateralToken.address,
      })
    );

    if (
      collateralToken.address !== marketInfo.longToken.address &&
      collateralToken.address !== marketInfo.shortToken.address
    ) {
      const availableTokens = marketInfo.isSameCollaterals
        ? `long ${marketInfo.longToken.symbol}`
        : `long ${marketInfo.longToken.symbol} and short ${marketInfo.shortToken.symbol}`;

      throw new Error(`Invalid collateral token. Only ${availableTokens} tokens are available.`);
    }

    const { autoCancelOrdersLimit } = await this.sdk.positions.getMaxAutoCancelOrders({
      positionOrders,
    });

    const commonSecondaryOrderParams = {
      account,
      marketAddress,
      swapPath: [],
      allowedSlippage,
      initialCollateralAddress: collateralTokenAddress,
      receiveTokenAddress,
      isLong,
      indexToken,
    };

    return createIncreaseOrderTxn({
      sdk: this.sdk,
      createIncreaseOrderParams: {
        account,
        marketAddress: marketInfo.marketTokenAddress,
        initialCollateralAddress: fromToken?.address,
        initialCollateralAmount: increaseAmounts.initialCollateralAmount,
        targetCollateralAddress: collateralToken.address,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        swapPath: increaseAmounts.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        triggerPrice: isLimit ? triggerPrice : undefined,
        acceptablePrice: increaseAmounts.acceptablePrice,
        isLong,
        orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: referralCodeForTxn,
        indexToken: marketInfo.indexToken,
        tokensData,
        skipSimulation: skipSimulation || isLimit,
      },
      createDecreaseOrderParams: createSltpEntries?.map((entry, i) => {
        return {
          ...commonSecondaryOrderParams,
          initialCollateralDeltaAmount: entry.decreaseAmounts.collateralDeltaAmount ?? 0n,
          sizeDeltaUsd: entry.decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: entry.decreaseAmounts.sizeDeltaInTokens,
          acceptablePrice: entry.decreaseAmounts.acceptablePrice,
          triggerPrice: entry.decreaseAmounts.triggerPrice,
          minOutputUsd: 0n,
          decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
          orderType: entry.decreaseAmounts.triggerOrderType!,
          referralCode: referralCodeForTxn,
          executionFee: getExecutionFeeAmountForEntry(this.sdk, entry, gasLimits, tokensData, gasPrice) ?? 0n,
          tokensData,
          txnType: entry.txnType!,
          skipSimulation: isLimit,
          autoCancel: i < autoCancelOrdersLimit,
        };
      }),
      cancelOrderParams: cancelSltpEntries?.map((entry) => ({
        ...commonSecondaryOrderParams,
        orderKey: entry.order!.key,
        orderType: entry.order!.orderType,
        minOutputAmount: 0n,
        sizeDeltaUsd: entry.order!.sizeDeltaUsd,
        txnType: entry.txnType!,
        initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
      })),
      updateOrderParams: updateSltpEntries?.map((entry) => ({
        ...commonSecondaryOrderParams,
        orderKey: entry.order!.key,
        orderType: entry.order!.orderType,
        sizeDeltaUsd: (entry.increaseAmounts?.sizeDeltaUsd || entry.decreaseAmounts?.sizeDeltaUsd)!,
        acceptablePrice: (entry.increaseAmounts?.acceptablePrice || entry.decreaseAmounts?.acceptablePrice)!,
        triggerPrice: (entry.increaseAmounts?.triggerPrice || entry.decreaseAmounts?.triggerPrice)!,
        executionFee: getExecutionFeeAmountForEntry(this.sdk, entry, gasLimits, tokensData, gasPrice) ?? 0n,
        minOutputAmount: 0n,
        txnType: entry.txnType!,
        initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
        autoCancel: entry.order!.autoCancel,
      })),
    });
  }

  async createDecreaseOrder({
    marketsInfoData,
    tokensData,
    marketInfo,
    decreaseAmounts,
    collateralToken,
    allowedSlippage,
    isLong,
    referralCode,
  }: {
    marketInfo: MarketInfo;
    marketsInfoData: MarketsInfoData;
    tokensData: TokensData;
    isLong: boolean;
    allowedSlippage: number;
    decreaseAmounts: DecreasePositionAmounts;
    collateralToken: TokenData;
    referralCode?: string;
  }) {
    const account = this.account;
    if (!account) {
      throw new Error("Account is not defined");
    }

    const executionFee = await this.sdk.utils.getExecutionFee("decrease", tokensData, {
      decreaseAmounts,
    });

    if (!executionFee) {
      throw new Error("Execution fee is not available");
    }

    if (decreaseAmounts?.triggerOrderType === undefined) {
      throw new Error("Trigger order type is not defined");
    }

    const { ordersInfoData } = await this.sdk.orders.getOrders({
      marketsInfoData,
      tokensData,
    });
    const orders = Object.values(ordersInfoData || {});
    const positionOrders = orders.filter((order) =>
      isOrderForPositionByData(order, {
        isLong,
        marketAddress: marketInfo.marketTokenAddress,
        account,
        collateralAddress: collateralToken.address,
      })
    ) as PositionOrderInfo[];

    const { autoCancelOrdersLimit } = await this.sdk.positions.getMaxAutoCancelOrders({
      positionOrders,
    });

    return createDecreaseOrderTxn(this.sdk, {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      swapPath: [],
      initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
      initialCollateralAddress: collateralToken.address,
      receiveTokenAddress: collateralToken.address,
      triggerPrice: decreaseAmounts.triggerPrice,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      minOutputUsd: BigInt(0),
      isLong,
      decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
      orderType: decreaseAmounts?.triggerOrderType,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      referralCode,
      skipSimulation: true,
      indexToken: marketInfo.indexToken,
      tokensData,
      autoCancel: autoCancelOrdersLimit > 0,
    });
  }

  async createSwapOrder({
    isLimit,
    swapAmounts,
    allowedSlippage,
    fromToken,
    toToken,
    referralCodeForTxn,
    tokensData,
    triggerPrice,
  }: {
    isLimit: boolean;
    allowedSlippage: number;
    swapAmounts: SwapAmounts;
    fromToken: TokenData;
    referralCodeForTxn?: string;
    toToken: TokenData;
    tokensData: TokensData;
    triggerPrice?: bigint;
  }) {
    const orderType = isLimit ? OrderType.LimitSwap : OrderType.MarketSwap;

    const executionFee = await this.sdk.utils.getExecutionFee("swap", tokensData, {
      swapAmounts,
    });

    if (!swapAmounts?.swapPathStats || !executionFee) {
      throw new Error("Swap data is not defined");
    }

    return createSwapOrderTxn(this.sdk, {
      fromTokenAddress: fromToken.address,
      fromTokenAmount: swapAmounts.amountIn,
      swapPath: swapAmounts.swapPathStats?.swapPath,
      toTokenAddress: toToken.address,
      orderType,
      minOutputAmount: swapAmounts.minOutputAmount,
      referralCode: referralCodeForTxn,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      tokensData,
      triggerPrice: isLimit && triggerPrice !== undefined ? triggerPrice : undefined,
    });
  }

  async cancelOrders(orderKeys: string[]) {
    return cancelOrdersTxn(this.sdk, {
      orderKeys: orderKeys,
    });
  }

  async createWrapOrUnwrapOrder(p: WrapOrUnwrapParams) {
    return createWrapOrUnwrapTxn(this.sdk, p);
  }

  async long(params: PositionIncreaseParams) {
    return increaseOrderHelper(this.sdk, { ...params, isLong: true });
  }

  async short(params: PositionIncreaseParams) {
    return increaseOrderHelper(this.sdk, { ...params, isLong: false });
  }

  async swap(params: SwapParams) {
    return swap(this.sdk, params);
  }
}
