import { useCallback, useMemo } from "react";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  NextPositionValues,
  TradeFlags,
  getDecreasePositionAmounts,
} from "domain/synthetics/trade";
import { parseValue } from "lib/numbers";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { MarketInfo } from "../markets";
import { PositionInfo, getPendingMockPosition } from "../positions";
import { TokenData } from "../tokens";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import useWallet from "lib/wallets/useWallet";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";
import useOrderEntries, { OrderEntriesInfo, OrderEntry } from "./useOrderEntries";
import {
  usePositionsConstants,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";

type SLTPEntry = OrderEntry & {
  amounts?: DecreasePositionAmounts;
};

export type SLTPInfo = Omit<OrderEntriesInfo, "entries"> & {
  entries: SLTPEntry[];
  totalPnL: BigNumber;
  totalPnLPercentage: BigNumber;
};

type Props = {
  tradeFlags: TradeFlags;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  increaseAmounts?: IncreasePositionAmounts;
  nextPositionValues?: NextPositionValues;
  triggerPrice?: BigNumber;
};

export default function useSLTPEntries({
  marketInfo,
  tradeFlags,
  collateralToken,
  increaseAmounts,
  nextPositionValues,
  triggerPrice,
}: Props) {
  const { isLong, isLimit } = tradeFlags;
  const { account } = useWallet();
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();

  const { handleSLErrors, handleTPErrors } = createErrorHandlers({
    liqPrice: nextPositionValues?.nextLiqPrice,
    entryPrice: isLimit ? triggerPrice : nextPositionValues?.nextEntryPrice,
    isLong,
    isLimit,
  });

  const stopLossEntriesInfo = useOrderEntries("sl_", handleSLErrors);
  const takeProfitEntriesInfo = useOrderEntries("tp_", handleTPErrors);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const currentPosition = useMemo(() => {
    if (!positionKey || !collateralToken || !marketInfo) return;

    return getPendingMockPosition({
      isIncrease: true,
      positionKey,
      sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd || BigInt(0),
      sizeDeltaInTokens: increaseAmounts?.sizeDeltaInTokens || BigInt(0),
      collateralDeltaAmount: increaseAmounts?.collateralDeltaAmount || BigInt(0),
      updatedAt: Date.now(),
      updatedAtBlock: BigInt(0),
    });
  }, [positionKey, collateralToken, increaseAmounts, marketInfo]);

  const currentPositionInfo: PositionInfo | undefined = useMemo(() => {
    if (!marketInfo || !collateralToken || !increaseAmounts || !currentPosition || !nextPositionValues) return;

    return {
      ...currentPosition,
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
      pnl: BigInt(0),
      pnlPercentage: BigInt(0),
      pnlAfterFees: BigInt(0),
      pnlAfterFeesPercentage: BigInt(0),
      closingFeeUsd: BigInt(0),
      uiFeeUsd: BigInt(0),
      pendingFundingFeesUsd: BigInt(0),
      pendingClaimableFundingFeesUsd: BigInt(0),
    };
  }, [
    collateralToken,
    increaseAmounts,
    isLong,
    marketInfo,
    nextPositionValues,
    currentPosition,
    isLimit,
    triggerPrice,
  ]);

  const getDecreaseAmountsFromEntry = useCallback(
    (entry: OrderEntry) => {
      if (!Number(entry.price) || !entry.percentage || entry.error) {
        return;
      }

      if (
        !increaseAmounts ||
        !marketInfo ||
        !collateralToken ||
        !currentPositionInfo ||
        !minPositionSizeUsd ||
        !minCollateralUsd
      ) {
        return;
      }

      const percentage = Math.floor(Number.parseFloat(entry.percentage) * 100);
      const sizeUsd = increaseAmounts.sizeDeltaUsd.mul(percentage).div(BASIS_POINTS_DIVISOR);
      const price = parseValue(entry.price, USD_DECIMALS);

      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong,
        position: currentPositionInfo,
        closeSizeUsd: sizeUsd,
        keepLeverage: true,
        triggerPrice: price,
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
      currentPositionInfo,
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

  const stopLoss = useMemo(() => {
    const entries = stopLossEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        amounts: getDecreaseAmountsFromEntry(entry),
      };
    });

    const totalPnL = entries.reduce((acc, entry) => acc.add(entry.amounts?.realizedPnl || 0), BigInt(0));
    const totalPnLPercentage = entries.reduce(
      (acc, entry) => acc.add(entry.amounts?.realizedPnlPercentage || 0),
      BigInt(0)
    );

    return {
      ...stopLossEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
    };
  }, [getDecreaseAmountsFromEntry, stopLossEntriesInfo]);

  const takeProfit = useMemo(() => {
    const entries = takeProfitEntriesInfo.entries.map((entry) => {
      return {
        ...entry,
        amounts: getDecreaseAmountsFromEntry(entry),
      };
    });

    const totalPnL = entries.reduce((acc, entry) => acc.add(entry.amounts?.realizedPnl || 0), BigInt(0));
    const totalPnLPercentage = entries.reduce(
      (acc, entry) => acc.add(entry.amounts?.realizedPnlPercentage || 0),
      BigInt(0)
    );

    return {
      ...takeProfitEntriesInfo,
      entries,
      totalPnL,
      totalPnLPercentage,
    };
  }, [getDecreaseAmountsFromEntry, takeProfitEntriesInfo]);

  return {
    stopLoss,
    takeProfit,
  };
}

function createErrorHandlers({
  liqPrice,
  entryPrice,
  isLong,
  isLimit,
}: {
  liqPrice?: BigNumber;
  entryPrice?: BigNumber;
  isLong?: boolean;
  isLimit?: boolean;
}) {
  function getErrorHandler(entry: Partial<OrderEntry>, isStopLoss: boolean): Partial<OrderEntry> {
    if (!liqPrice || !entryPrice || !entry.price || parseFloat(entry.price) === 0) {
      return { ...entry, error: null };
    }

    const inputPrice = parseValue(entry.price, USD_DECIMALS);

    const isPriceAboveMark = inputPrice?.gte(entryPrice);
    const isPriceBelowMark = inputPrice?.lte(entryPrice);
    const priceLiqError = isLong ? t`Price below Liq. Price.` : t`Price above Liq. Price.`;
    const priceAboveMsg = isLimit ? t`Price above Limit Price.` : t`Price above Mark Price.`;
    const priceBelowMsg = isLimit ? t`Price below Limit Price.` : t`Price below Mark Price.`;

    if (isStopLoss) {
      if (inputPrice?.lte(liqPrice) && isLong) {
        return {
          ...entry,
          error: {
            price: priceLiqError,
          },
        };
      }
      if (inputPrice?.gte(liqPrice) && !isLong) {
        return {
          ...entry,
          error: {
            price: priceLiqError,
          },
        };
      }

      if (isPriceAboveMark && isLong) {
        return {
          ...entry,
          error: {
            price: priceAboveMsg,
          },
        };
      }

      if (isPriceBelowMark && !isLong) {
        return {
          ...entry,
          error: {
            price: priceBelowMsg,
          },
        };
      }
    }

    if (!isStopLoss) {
      if (isPriceBelowMark && isLong) {
        return {
          ...entry,
          error: {
            price: priceBelowMsg,
          },
        };
      }

      if (isPriceAboveMark && !isLong) {
        return {
          ...entry,
          error: {
            price: priceAboveMsg,
          },
        };
      }
    }

    if (inputPrice?.gt(0) && (!entry.percentage || parseFloat(entry.percentage) === 0)) {
      return {
        ...entry,
        error: {
          percentage: t`A Size percentage is required.`,
        },
      };
    }

    return { ...entry, error: null };
  }

  const handleSLErrors = (entry: Partial<OrderEntry>) => getErrorHandler(entry, true);
  const handleTPErrors = (entry: Partial<OrderEntry>) => getErrorHandler(entry, false);

  return { handleSLErrors, handleTPErrors };
}
