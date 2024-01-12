import { useState, useMemo, useCallback } from "react";
import { uniqueId } from "lodash";
import { IncreasePositionAmounts, NextPositionValues, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { parseValue } from "lib/numbers";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { MarketInfo } from "../markets";
import { TradeFlags } from "../trade/useTradeFlags";
import { PositionInfo, getPendingMockPosition, usePositionsConstants } from "../positions";
import useUiFeeFactor from "../fees/utils/useUiFeeFactor";
import { TokenData, convertToTokenAmount } from "../tokens";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import useWallet from "lib/wallets/useWallet";
import { UserReferralInfo, useUserReferralInfo } from "domain/referrals";
import { useChainId } from "lib/chains";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { getPositionFee, getPriceImpactForPosition } from "../fees";

export type Entry = {
  id: string;
  price: string;
  percentage: number;
  error?: string;
};

type EntriesInfo = {
  entries: Entry[];
  addEntry: () => void;
  canAddEntry: boolean;
  updateEntry: (id: string, updatedEntry: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

type Props = {
  tradeFlags: TradeFlags;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  increaseAmounts?: IncreasePositionAmounts;
  existingPosition?: PositionInfo;
  keepLeverage?: boolean;
  nextPositionValues?: NextPositionValues;
};

export default function useSLTPEntries({
  marketInfo,
  tradeFlags,
  collateralToken,
  increaseAmounts,
  existingPosition,
  keepLeverage,
  nextPositionValues,
}: Props) {
  const { chainId } = useChainId();
  const { isLong } = tradeFlags;
  const { signer, account } = useWallet();
  const userReferralInfo = useUserReferralInfo(signer, chainId, account);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);

  const handleSLErrors = useCallback(
    (entry: Partial<Entry>): Partial<Entry> => {
      if (!nextPositionValues?.nextLiqPrice || !entry.price || parseFloat(entry.price) === 0) {
        return { ...entry, error: "" };
      }

      const inputPrice = parseValue(entry.price, USD_DECIMALS);

      if (isLong) {
        if (inputPrice?.lte(nextPositionValues.nextLiqPrice)) {
          return { ...entry, error: t`Price below Liq. Price` };
        }

        if (inputPrice && nextPositionValues.nextEntryPrice && inputPrice.gte(nextPositionValues.nextEntryPrice)) {
          return { ...entry, error: t`Price above Mark Price` };
        }
      }

      if (!isLong) {
        if (inputPrice?.gte(nextPositionValues.nextLiqPrice)) {
          return { ...entry, error: t`Price above Liq. Price` };
        }

        if (inputPrice && nextPositionValues.nextEntryPrice && inputPrice.lte(nextPositionValues.nextEntryPrice)) {
          return { ...entry, error: t`Price below Mark Price` };
        }
      }

      return { ...entry, error: "" };
    },
    [nextPositionValues, isLong]
  );

  const handleTPErrors = useCallback(
    (entry: Partial<Entry>): Partial<Entry> => {
      if (!nextPositionValues?.nextLiqPrice || !entry.price || parseFloat(entry.price) === 0) {
        return { ...entry, error: "" };
      }

      const inputPrice = parseValue(entry.price, USD_DECIMALS);

      if (isLong) {
        if (inputPrice?.lte(nextPositionValues.nextLiqPrice)) {
          return { ...entry, error: t`Price below Liq. Price` };
        }
        if (inputPrice && nextPositionValues.nextEntryPrice && inputPrice.lte(nextPositionValues.nextEntryPrice)) {
          return { ...entry, error: t`Price below Mark Price` };
        }
      }

      if (!isLong) {
        if (inputPrice?.gte(nextPositionValues.nextLiqPrice)) {
          return { ...entry, error: t`Price above Liq. Price` };
        }

        if (inputPrice && nextPositionValues.nextEntryPrice && inputPrice.gte(nextPositionValues.nextEntryPrice)) {
          return { ...entry, error: t`Price above Mark Price` };
        }
      }

      return { ...entry, error: "" };
    },
    [nextPositionValues, isLong]
  );

  const stopLossInfo = useEntries(handleSLErrors);
  const takeProfitInfo = useEntries(handleTPErrors);

  // console.log("takeProfit", takeProfitInfo);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);
  const currentPosition = useMemo(() => {
    if (!positionKey || !collateralToken || !nextPositionValues || !marketInfo) return;

    return getPendingMockPosition({
      isIncrease: true,
      positionKey,
      sizeDeltaUsd: nextPositionValues?.nextSizeUsd || BigNumber.from(0),
      sizeDeltaInTokens:
        convertToTokenAmount(
          nextPositionValues.nextSizeUsd,
          marketInfo.indexToken.decimals,
          marketInfo.indexToken.prices.minPrice
        ) || BigNumber.from(0),
      collateralDeltaAmount:
        convertToTokenAmount(
          nextPositionValues.nextCollateralUsd,
          collateralToken.decimals,
          collateralToken.prices.minPrice
        ) || BigNumber.from(0),
      updatedAt: Date.now(),
      updatedAtBlock: BigNumber.from(0),
    });
  }, [positionKey, collateralToken, nextPositionValues, marketInfo]);

  const currentPositionInfo: PositionInfo | undefined = useMemo(() => {
    if (
      !account ||
      !positionKey ||
      !marketInfo ||
      !collateralToken ||
      !increaseAmounts ||
      !currentPosition ||
      !nextPositionValues ||
      !userReferralInfo ||
      !uiFeeFactor
    )
      return;

    const closingPriceImpactDeltaUsd = getPriceImpactForPosition(
      marketInfo,
      currentPosition.sizeInUsd.mul(-1),
      currentPosition.isLong,
      { fallbackToZero: true }
    );

    const positionFeeInfo = getPositionFee(
      marketInfo,
      currentPosition.sizeInUsd,
      closingPriceImpactDeltaUsd.gt(0),
      userReferralInfo,
      uiFeeFactor
    );

    return {
      ...currentPosition,
      marketInfo,
      indexToken: marketInfo.indexToken,
      collateralToken,
      pnlToken: isLong ? marketInfo.longToken : marketInfo.shortToken,
      markPrice: nextPositionValues.nextEntryPrice!,
      entryPrice: nextPositionValues.nextEntryPrice,
      liquidationPrice: nextPositionValues.nextLiqPrice,
      collateralUsd: nextPositionValues.nextCollateralUsd!,
      remainingCollateralUsd: nextPositionValues.nextCollateralUsd!,
      remainingCollateralAmount: convertToTokenAmount(
        nextPositionValues.nextCollateralUsd,
        collateralToken.decimals,
        collateralToken.prices.minPrice
      )!,
      hasLowCollateral: false,
      leverage: nextPositionValues.nextLeverage,
      leverageWithPnl: nextPositionValues.nextLeverage,
      pnl: nextPositionValues.nextPnl!,
      pnlPercentage: nextPositionValues.nextPnlPercentage!,
      pnlAfterFees: BigNumber.from(0),
      pnlAfterFeesPercentage: BigNumber.from(0),
      netValue: nextPositionValues.nextCollateralUsd!,
      closingFeeUsd: positionFeeInfo.positionFeeUsd,
      uiFeeUsd: positionFeeInfo.uiFeeUsd || BigNumber.from(0),
      pendingFundingFeesUsd: BigNumber.from(0),
      pendingClaimableFundingFeesUsd: BigNumber.from(0),
    };
  }, [
    account,
    collateralToken,
    increaseAmounts,
    isLong,
    marketInfo,
    positionKey,
    nextPositionValues,
    userReferralInfo,
    uiFeeFactor,
    currentPosition,
  ]);

  const stopLoss = useMemo(
    () =>
      calculateEntries({
        entriesInfo: stopLossInfo,
        increaseAmounts,
        marketInfo,
        collateralToken,
        isLong,
        existingPosition,
        keepLeverage,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        userReferralInfo,
        currentPositionInfo,
      }),
    [
      stopLossInfo,
      marketInfo,
      collateralToken,
      isLong,
      existingPosition,
      keepLeverage,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      increaseAmounts,
      userReferralInfo,
      currentPositionInfo,
    ]
  );

  const takeProfit = useMemo(
    () =>
      calculateEntries({
        entriesInfo: takeProfitInfo,
        increaseAmounts,
        marketInfo,
        collateralToken,
        isLong,
        existingPosition,
        keepLeverage,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
        userReferralInfo,
        currentPositionInfo,
      }),
    [
      takeProfitInfo,
      marketInfo,
      collateralToken,
      isLong,
      existingPosition,
      keepLeverage,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      increaseAmounts,
      userReferralInfo,
      currentPositionInfo,
    ]
  );

  return {
    stopLoss,
    takeProfit,
  };
}

function useEntries(errorHandler: (entry: Partial<Entry>) => Partial<Entry>) {
  const [entries, setEntries] = useState<Entry[]>([{ id: uniqueId(), price: "", percentage: 0, error: "" }]);

  const canAddEntry = useMemo(() => {
    const totalPercentage = entries.reduce((total, entry) => total + entry.percentage, 0);
    return totalPercentage < BASIS_POINTS_DIVISOR;
  }, [entries]);

  const addEntry = useCallback(() => {
    if (!canAddEntry) return;

    setEntries((prevEntries) => [
      ...prevEntries,
      {
        id: uniqueId(),
        price: "",
        percentage: 0,
        error: "",
      },
    ]);
  }, [canAddEntry]);

  const updateEntry = useCallback(
    (id: string, updatedEntry: Partial<Entry>) => {
      setEntries((prevEntries) => {
        const totalExcludingCurrent = prevEntries.reduce(
          (total, entry) => total + (entry.id !== id ? Number(entry.percentage) : 0),
          0
        );

        if (totalExcludingCurrent + Number(updatedEntry.percentage) > BASIS_POINTS_DIVISOR) {
          updatedEntry.percentage = BASIS_POINTS_DIVISOR - totalExcludingCurrent;
        }

        return prevEntries.map((entry) =>
          entry.id === id ? { ...entry, ...updatedEntry, ...errorHandler(updatedEntry) } : entry
        );
      });
    },
    [errorHandler]
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((prevEntries) =>
      prevEntries.length > 1 ? prevEntries.filter((entry) => entry.id !== id) : prevEntries
    );
  }, []);

  const reset = useCallback(() => {
    setEntries([{ id: uniqueId(), price: "", percentage: 0 }]);
  }, []);

  return { entries, addEntry, updateEntry, deleteEntry, reset, canAddEntry };
}

function calculateTotalPnl(amounts) {
  if (!amounts) return;
  return amounts.reduce((acc, amount) => acc.add(amount.realizedPnl), BigNumber.from(0));
}

function calculateAmounts(params: {
  entries: Entry[];
  increaseAmounts?: IncreasePositionAmounts | undefined;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  isLong: boolean;
  existingPosition?: PositionInfo;
  keepLeverage?: boolean;
  minCollateralUsd?: BigNumber;
  minPositionSizeUsd?: BigNumber;
  uiFeeFactor: BigNumber;
  userReferralInfo?: UserReferralInfo;
  currentPositionInfo?: PositionInfo;
}) {
  const {
    entries,
    increaseAmounts,
    marketInfo,
    collateralToken,
    isLong,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    userReferralInfo,
    currentPositionInfo,
  } = params;

  if (!increaseAmounts || !marketInfo || !collateralToken || !minPositionSizeUsd || !minCollateralUsd) return;

  return entries
    .filter((entry) => entry.price && entry.percentage && !entry.error)
    .map((entry) => {
      const sizeUsd = increaseAmounts.sizeDeltaUsd.mul(entry.percentage).div(BASIS_POINTS_DIVISOR);
      const price = parseValue(entry.price, USD_DECIMALS);
      return getDecreasePositionAmounts({
        marketInfo,
        collateralToken,
        isLong,
        position: currentPositionInfo,
        closeSizeUsd: sizeUsd,
        keepLeverage: keepLeverage!,
        triggerPrice: price,
        userReferralInfo,
        minCollateralUsd,
        minPositionSizeUsd,
        uiFeeFactor,
      });
    });
}

function calculateEntries(params: {
  entriesInfo: EntriesInfo;
  increaseAmounts?: IncreasePositionAmounts;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  isLong: boolean;
  existingPosition?: PositionInfo;
  keepLeverage?: boolean;
  minCollateralUsd?: BigNumber;
  minPositionSizeUsd?: BigNumber;
  uiFeeFactor: BigNumber;
  userReferralInfo?: UserReferralInfo;
  currentPositionInfo?: PositionInfo;
}) {
  const {
    entriesInfo,
    increaseAmounts,
    marketInfo,
    collateralToken,
    isLong,
    existingPosition,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    userReferralInfo,
    currentPositionInfo,
  } = params;

  const amounts = calculateAmounts({
    entries: entriesInfo.entries,
    increaseAmounts,
    marketInfo,
    collateralToken,
    isLong,
    existingPosition,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    userReferralInfo,
    currentPositionInfo,
  });
  const totalPnl = calculateTotalPnl(amounts);
  return { ...entriesInfo, amounts, totalPnl };
}
