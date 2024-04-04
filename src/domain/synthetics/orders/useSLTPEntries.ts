import { useCallback, useMemo } from "react";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  NextPositionValues,
  TradeFlags,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
} from "domain/synthetics/trade";
import {
  PositionOrderInfo,
  isLimitDecreaseOrderType,
  isLimitIncreaseOrderType,
  isStopLossOrderType,
} from "domain/synthetics/orders";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { MarketInfo } from "../markets";
import { PositionInfo, getPendingMockPosition } from "../positions";
import { TokenData, convertToTokenAmount } from "../tokens";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";
import useWallet from "lib/wallets/useWallet";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { useSwapRoutes } from "context/SyntheticsStateContext/hooks/tradeHooks";
import useOrderEntries, {
  OrderEntriesInfo,
  OrderEntry,
  MAX_PERCENTAGE,
  getDefaultEntryField,
  OrderEntryField,
} from "./useOrderEntries";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";

export type SLTPEntry = OrderEntry & {
  decreaseAmounts?: DecreasePositionAmounts;
  increaseAmounts: undefined;
};

export type SLTPEntryValid = OrderEntry & {
  decreaseAmounts: DecreasePositionAmounts;
  increaseAmounts: undefined;
};

export type LimEntry = OrderEntry & {
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts: undefined;
};

export type LimEntryValid = OrderEntry & {
  increaseAmounts: IncreasePositionAmounts;
  decreaseAmounts: undefined;
};

export type ExtendedEntry = SLTPEntry | LimEntry;

export type SLTPInfo = Omit<OrderEntriesInfo<OrderEntry>, "entries"> & {
  entries: ExtendedEntry[];
  totalPnL: BigNumber;
  totalPnLPercentage: BigNumber;
  error?: null | {
    price?: string;
    percentage?: string;
  };
};

type Props = {
  tradeFlags: TradeFlags;
  marketInfo?: MarketInfo;
  fromToken?: TokenData;
  collateralToken?: TokenData;
  increaseAmounts?: IncreasePositionAmounts;
  nextPositionValues?: NextPositionValues;
  triggerPrice?: BigNumber;
  positionOrders?: PositionOrderInfo[];
  existingPosition?: PositionInfo;
};

export default function useSLTPEntries({
  marketInfo,
  tradeFlags,
  fromToken,
  collateralToken,
  increaseAmounts,
  nextPositionValues,
  triggerPrice,
  positionOrders,
  existingPosition,
}: Props) {
  const { isLong, isLimit } = tradeFlags;
  const { account } = useWallet();
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();

  const handleLimitErrors = useCallback(
    (entry: LimEntry | SLTPEntry) =>
      handleEntryError(entry, "limit", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
      }),
    [isLong, isLimit, triggerPrice, nextPositionValues]
  );

  const existingLimitOrderEntries = useMemo(() => {
    const limitOrders = positionOrders?.filter((order) => isLimitIncreaseOrderType(order.orderType));
    return prepareInitialEntries(limitOrders, increaseAmounts, "desc");
  }, [positionOrders, increaseAmounts]);

  const limitEntriesInfo = useOrderEntries<LimEntry | SLTPEntry>("limit_", handleLimitErrors, {
    initialEntries: existingLimitOrderEntries,
    canAddEntry: false,
  });

  const totalPositionSizeUsd = useMemo(() => {
    let result = BigNumber.from(0);

    if (existingPosition?.sizeInUsd) {
      result = result.add(existingPosition?.sizeInUsd ?? 0);
    }

    if (increaseAmounts?.sizeDeltaUsd) {
      result = result.add(increaseAmounts?.sizeDeltaUsd ?? 0);
    }

    if (limitEntriesInfo.entries.length) {
      limitEntriesInfo.entries.forEach((e) => {
        if (e.txnType !== "cancel") {
          result = result.add(e.sizeUsd.value ?? 0);
        }
      });
    }

    return result;
  }, [existingPosition, increaseAmounts, limitEntriesInfo.entries]);

  const [maxLimitTrigerPrice, minLimitTrigerPrice] = useMemo(() => {
    const prices = limitEntriesInfo.entries.reduce<BigNumber[]>(
      (acc, { price }) => (price.value ? [...acc, price.value] : acc),
      []
    );

    if (!prices.length) return [undefined, undefined];

    return prices.reduce(
      ([min, max], num) => [num.lt(min) ? num : min, num.gt(max) ? num : max],
      [prices[0], prices[0]]
    );
  }, [limitEntriesInfo.entries]);

  const handleSLErrors = useCallback(
    (entry: LimEntry | SLTPEntry) =>
      handleEntryError(entry, "sl", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
        isAnyLimits: !!limitEntriesInfo.entries.length || isLimit,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      limitEntriesInfo.entries.length,
    ]
  );

  const handleTPErrors = useCallback(
    (entry: LimEntry | SLTPEntry) =>
      handleEntryError(entry, "tp", {
        liqPrice: nextPositionValues?.nextLiqPrice,
        entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
        isLong,
        isLimit,
        isAnyLimits: !!limitEntriesInfo.entries.length || isLimit,
        isExistingPosition: !!existingPosition,
        maxLimitTrigerPrice,
        minLimitTrigerPrice,
      }),
    [
      isLong,
      isLimit,
      triggerPrice,
      existingPosition,
      nextPositionValues,
      maxLimitTrigerPrice,
      minLimitTrigerPrice,
      limitEntriesInfo.entries.length,
    ]
  );

  const existingSLOrderEntries = useMemo(() => {
    const slOrders = positionOrders?.filter((order) => isStopLossOrderType(order.orderType));
    return prepareInitialEntries(slOrders, increaseAmounts, isLong ? "desc" : "asc");
  }, [positionOrders, increaseAmounts, isLong]);

  const existingTPOrderEntries = useMemo(() => {
    const slOrders = positionOrders?.filter((order) => isLimitDecreaseOrderType(order.orderType));
    return prepareInitialEntries(slOrders, increaseAmounts, isLong ? "asc" : "desc");
  }, [positionOrders, increaseAmounts, isLong]);

  const takeProfitEntriesInfo = useOrderEntries<ExtendedEntry>("tp_", handleTPErrors, {
    initialEntries: existingTPOrderEntries,
    totalPositionSizeUsd,
  });
  const stopLossEntriesInfo = useOrderEntries<ExtendedEntry>("sl_", handleSLErrors, {
    initialEntries: existingSLOrderEntries,
    totalPositionSizeUsd,
  });

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const mockPosition = useMemo(() => {
    if (!positionKey || !collateralToken || !marketInfo) return;

    return getPendingMockPosition({
      isIncrease: true,
      positionKey,
      sizeDeltaUsd: (existingPosition?.sizeInUsd ?? BigNumber.from(0)).add(
        increaseAmounts?.sizeDeltaUsd ?? BigNumber.from(0)
      ),
      sizeDeltaInTokens: (existingPosition?.sizeInTokens ?? BigNumber.from(0)).add(
        increaseAmounts?.sizeDeltaInTokens ?? BigNumber.from(0)
      ),
      collateralDeltaAmount: (existingPosition?.collateralAmount ?? BigNumber.from(0)).add(
        increaseAmounts?.collateralDeltaAmount ?? BigNumber.from(0)
      ),
      updatedAt: Date.now(),
      updatedAtBlock: BigNumber.from(0),
    });
  }, [positionKey, collateralToken, increaseAmounts, marketInfo, existingPosition]);

  const mockPositionInfo: PositionInfo | undefined = useMemo(() => {
    if (!marketInfo || !collateralToken || !increaseAmounts || !mockPosition || !nextPositionValues) return;

    return {
      ...mockPosition,
      marketInfo,
      indexToken: marketInfo.indexToken,
      collateralToken,
      pnlToken: isLong ? marketInfo.longToken : marketInfo.shortToken,
      markPrice: nextPositionValues.nextEntryPrice!,
      entryPrice: nextPositionValues.nextEntryPrice,
      triggerPrice: isLimit ? triggerPrice : undefined,
      liquidationPrice: nextPositionValues.nextLiqPrice,
      collateralUsd: increaseAmounts?.initialCollateralUsd,
      remainingCollateralUsd: increaseAmounts?.collateralDeltaUsd,
      remainingCollateralAmount: increaseAmounts?.collateralDeltaAmount,
      netValue: increaseAmounts?.collateralDeltaUsd,
      hasLowCollateral: false,
      leverage: nextPositionValues.nextLeverage,
      leverageWithPnl: nextPositionValues.nextLeverage,
      pnl: BigNumber.from(0),
      pnlPercentage: BigNumber.from(0),
      pnlAfterFees: BigNumber.from(0),
      pnlAfterFeesPercentage: BigNumber.from(0),
      closingFeeUsd: BigNumber.from(0),
      uiFeeUsd: BigNumber.from(0),
      pendingFundingFeesUsd: BigNumber.from(0),
      pendingClaimableFundingFeesUsd: BigNumber.from(0),
    };
  }, [collateralToken, increaseAmounts, isLong, marketInfo, nextPositionValues, mockPosition, isLimit, triggerPrice]);

  const getDecreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price }: OrderEntry) => {
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error || !marketInfo) return;

      if (
        !increaseAmounts ||
        !collateralToken ||
        !mockPositionInfo ||
        !minPositionSizeUsd ||
        !minCollateralUsd ||
        !sizeUsd?.value
      ) {
        return;
      }

      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong,
        position: mockPositionInfo,
        closeSizeUsd: sizeUsd.value,
        keepLeverage: true,
        triggerPrice: price.value,
        userReferralInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        isLimit,
        limitPrice: triggerPrice,
      });
    },
    [
      collateralToken,
      mockPositionInfo,
      increaseAmounts,
      isLong,
      isLimit,
      marketInfo,
      triggerPrice,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
    ]
  );

  const swapRoute = useSwapRoutes(fromToken?.address, collateralToken?.address);

  const getIncreaseAmountsFromEntry = useCallback(
    ({ sizeUsd, price, order }: OrderEntry) => {
      if (!sizeUsd?.value || sizeUsd.error || !price?.value || price.error) return;

      const size = convertToTokenAmount(sizeUsd.value, order?.indexToken.decimals, increaseAmounts?.indexPrice);

      if (!marketInfo || !collateralToken || !mockPositionInfo || !swapRoute || !order) {
        return;
      }

      return getIncreasePositionAmounts({
        marketInfo,
        indexToken: order.indexToken,
        initialCollateralToken: order.initialCollateralToken,
        collateralToken,
        isLong,
        initialCollateralAmount: order.initialCollateralDeltaAmount,
        indexTokenAmount: size,
        leverage: mockPositionInfo?.leverage,
        triggerPrice: price.value,
        position: mockPositionInfo,
        findSwapPath: swapRoute.findSwapPath,
        userReferralInfo,
        uiFeeFactor,
        strategy: "independent",
      });
    },
    [collateralToken, increaseAmounts, isLong, marketInfo, mockPositionInfo, swapRoute, uiFeeFactor, userReferralInfo]
  );

  const limit = useMemo(() => {
    const entries = limitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        increaseAmounts: getIncreaseAmountsFromEntry(entry),
        decreaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter((e): e is LimEntryValid => e.txnType !== "cancel" && !!e.increaseAmounts);

    return {
      ...limitEntriesInfo,
      entries,
      totalPnL: BigNumber.from(0),
      totalPnLPercentage: BigNumber.from(0),
      error: getCommonError(displayableEntries),
    };
  }, [getIncreaseAmountsFromEntry, limitEntriesInfo]);

  const canCalculatePnL = !limit.entries.length;

  const stopLoss = useMemo(() => {
    const entries = stopLossEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        decreaseAmounts: getDecreaseAmountsFromEntry(entry),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SLTPEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnl || 0),
        BigNumber.from(0)
      );
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnlPercentage || 0),
        BigNumber.from(0)
      );
    }

    return {
      ...stopLossEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
      error: getCommonError(displayableEntries),
    };
  }, [getDecreaseAmountsFromEntry, stopLossEntriesInfo, canCalculatePnL]);

  const takeProfit = useMemo(() => {
    const entries = takeProfitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        decreaseAmounts: getDecreaseAmountsFromEntry(entry),
        increaseAmounts: undefined,
      };
    });

    const displayableEntries = entries.filter(
      (e): e is SLTPEntryValid => !!e.decreaseAmounts && e.txnType !== "cancel"
    );

    let totalPnL, totalPnLPercentage;
    if (canCalculatePnL) {
      totalPnL = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnl || 0),
        BigNumber.from(0)
      );
      totalPnLPercentage = displayableEntries.reduce(
        (acc, entry) => acc.add(entry.decreaseAmounts?.realizedPnlPercentage || 0),
        BigNumber.from(0)
      );
    }

    return {
      ...takeProfitEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
      error: getCommonError(displayableEntries),
    };
  }, [getDecreaseAmountsFromEntry, takeProfitEntriesInfo, canCalculatePnL]);

  return {
    stopLoss,
    takeProfit,
    limit,
  };
}

function handleEntryError(
  entry: ExtendedEntry,
  type: "sl" | "tp" | "limit",
  {
    liqPrice,
    entryPrice,
    isLong,
    isLimit,
    isAnyLimits,
    isExistingPosition,
    maxLimitTrigerPrice,
    minLimitTrigerPrice,
  }: {
    liqPrice?: BigNumber;
    entryPrice?: BigNumber;
    isLong?: boolean;
    isLimit?: boolean;
    isAnyLimits?: boolean;
    isExistingPosition?: boolean;
    maxLimitTrigerPrice?: BigNumber;
    minLimitTrigerPrice?: BigNumber;
  }
): ExtendedEntry {
  let sizeError: string | null = null;
  let priceError: string | null = null;
  let percentageError: string | null = null;

  if (liqPrice && entryPrice && entry.price?.value?.gt(0)) {
    const inputPrice = entry.price.value;

    const isExistingOrder = !!entry.order;
    const isPriceAboveMark = inputPrice?.gte(entryPrice);
    const isPriceBelowMark = inputPrice?.lte(entryPrice);
    const priceLiqError = isLong ? t`Price below Liq. Price.` : t`Price above Liq. Price.`;
    const priceAboveMsg = isLimit ? t`Price above Limit Price.` : t`Price above Mark Price.`;
    const priceBelowMsg = isLimit ? t`Price below Limit Price.` : t`Price below Mark Price.`;

    if (type === "sl") {
      if (!isLimit || isExistingPosition) {
        if (isPriceAboveMark && !isExistingOrder && isLong) {
          priceError = priceAboveMsg;
        }

        if (isPriceBelowMark && !isExistingOrder && !isLong) {
          priceError = priceBelowMsg;
        }

        if (!isAnyLimits) {
          if (inputPrice?.lte(liqPrice) && isLong) {
            priceError = priceLiqError;
          }
          if (inputPrice?.gte(liqPrice) && !isLong) {
            priceError = priceLiqError;
          }
        }
      } else {
        if (isAnyLimits) {
          if (maxLimitTrigerPrice && inputPrice?.gte(maxLimitTrigerPrice) && isLong) {
            priceError = priceAboveMsg;
          }

          if (minLimitTrigerPrice && inputPrice?.lte(minLimitTrigerPrice) && !isLong) {
            priceError = priceBelowMsg;
          }
        }
      }
    }

    if (type === "tp") {
      if (!isLimit || isExistingPosition) {
        if (isPriceBelowMark && isLong) {
          priceError = priceBelowMsg;
        }

        if (isPriceAboveMark && !isLong) {
          priceError = priceAboveMsg;
        }
      } else {
        if (isAnyLimits) {
          if (maxLimitTrigerPrice && inputPrice?.lte(maxLimitTrigerPrice) && isLong) {
            priceError = priceBelowMsg;
          }

          if (minLimitTrigerPrice && inputPrice?.gte(minLimitTrigerPrice) && !isLong) {
            priceError = priceAboveMsg;
          }
        }
      }
    }

    if (type === "limit") {
      if (!isLimit || isExistingPosition) {
        if (isPriceAboveMark && isLong) {
          priceError = priceAboveMsg;
        }

        if (isPriceBelowMark && !isLong) {
          priceError = priceBelowMsg;
        }
      }

      if (!entry.sizeUsd?.value || entry.sizeUsd.value?.eq(0)) {
        sizeError = t`Limit size is required.`;
      }

      if (entry?.increaseAmounts?.estimatedLeverage?.gt(MAX_ALLOWED_LEVERAGE)) {
        sizeError = t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
      }
    }

    if (type !== "limit") {
      if (!entry.percentage?.value || entry.percentage.value?.eq(0)) {
        percentageError = t`A Size percentage is required.`;
      }
    }
  }

  return {
    ...entry,
    sizeUsd: { ...entry.sizeUsd, error: sizeError },
    price: { ...entry.price, error: priceError },
    percentage: { ...entry.percentage, error: percentageError },
  };
}

function getCommonError(displayableEntries: (SLTPEntryValid | LimEntryValid)[] = []) {
  const totalPercentage = displayableEntries.reduce(
    (total, entry) => (entry.percentage?.value ? total.add(entry.percentage.value) : total),
    BigNumber.from(0)
  );

  return totalPercentage.gt(MAX_PERCENTAGE)
    ? {
        percentage: "Max percentage exceeded",
      }
    : null;
}

type InitialEntry = {
  order: null | PositionOrderInfo;
  sizeUsd: OrderEntryField;
  price: OrderEntryField;
};

function prepareInitialEntries(
  positionOrders: PositionOrderInfo[] | undefined,
  increaseAmounts: IncreasePositionAmounts | undefined,
  sort: "desc" | "asc" = "desc"
): undefined | InitialEntry[] {
  if (!positionOrders || !increaseAmounts?.sizeDeltaInTokens.gt(0)) return;

  return positionOrders
    .sort((a, b) => {
      const [first, second] = sort === "desc" ? [a, b] : [b, a];
      const diff = first.triggerPrice.sub(second.triggerPrice);
      if (diff.gt(0)) return -1;
      if (diff.lt(0)) return 1;
      return 0;
    })
    .map((order) => {
      const entry: InitialEntry = {
        sizeUsd: getDefaultEntryField(USD_DECIMALS, { value: order.sizeDeltaUsd }),
        price: getDefaultEntryField(USD_DECIMALS, { value: order.triggerPrice }),
        order,
      };

      return entry;
    });
}
