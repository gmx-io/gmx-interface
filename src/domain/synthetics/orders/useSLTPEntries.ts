import { useState, useMemo, useCallback } from "react";
import { uniqueId } from "lodash";
import { IncreasePositionAmounts, NextPositionValues, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { parseValue, removeTrailingZeros } from "lib/numbers";
import { USD_DECIMALS, getPositionKey } from "lib/legacy";
import { MarketInfo } from "../markets";
import { TradeFlags } from "../trade/useTradeFlags";
import { PositionInfo, getPendingMockPosition, usePositionsConstants } from "../positions";
import useUiFeeFactor from "../fees/utils/useUiFeeFactor";
import { TokenData } from "../tokens";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import useWallet from "lib/wallets/useWallet";
import { UserReferralInfo, useUserReferralInfo } from "domain/referrals";
import { useChainId } from "lib/chains";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { NUMBER_WITH_TWO_DECIMALS } from "components/PercentageInput/PercentageInput";

const MAX_PERCENTAGE = 100;

export type Entry = {
  id: string;
  price: string;
  percentage: string;
  error?: string;
  sizeUsd?: BigNumber;
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

  const { handleSLErrors, handleTPErrors } = createErrorHandlers(nextPositionValues, isLong);

  const stopLossInfo = useEntries(handleSLErrors);
  const takeProfitInfo = useEntries(handleTPErrors);

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
      sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd || BigNumber.from(0),
      sizeDeltaInTokens: increaseAmounts?.sizeDeltaInTokens || BigNumber.from(0),
      collateralDeltaAmount: increaseAmounts?.collateralDeltaAmount || BigNumber.from(0),
      updatedAt: Date.now(),
      updatedAtBlock: BigNumber.from(0),
    });
  }, [positionKey, collateralToken, increaseAmounts, marketInfo]);

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

    return {
      ...currentPosition,
      marketInfo,
      indexToken: marketInfo.indexToken,
      collateralToken,
      pnlToken: isLong ? marketInfo.longToken : marketInfo.shortToken,
      markPrice: nextPositionValues.nextEntryPrice!,
      entryPrice: nextPositionValues.nextEntryPrice,
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
    sizeUsd: increaseAmounts?.sizeDeltaUsd,
  };
}

function useEntries(errorHandler: (entry: Partial<Entry>) => Partial<Entry>) {
  const [entries, setEntries] = useState<Entry[]>([{ id: uniqueId(), price: "", percentage: "", error: "" }]);

  const canAddEntry = useMemo(() => {
    const totalPercentage = entries.reduce((total, entry) => total + Number(entry.percentage), 0);
    return totalPercentage < MAX_PERCENTAGE;
  }, [entries]);

  const addEntry = useCallback(() => {
    if (!canAddEntry) return;

    setEntries((prevEntries) => [
      ...prevEntries,
      {
        id: uniqueId(),
        price: "",
        percentage: "",
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

        if (totalExcludingCurrent + Number(updatedEntry.percentage) > MAX_PERCENTAGE) {
          const remainingPercentage = String(removeTrailingZeros((MAX_PERCENTAGE - totalExcludingCurrent).toFixed(2)));

          if (NUMBER_WITH_TWO_DECIMALS.test(remainingPercentage)) {
            updatedEntry.percentage = remainingPercentage;
          }
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
    setEntries([{ id: uniqueId(), price: "", percentage: "" }]);
  }, []);

  return { entries, addEntry, updateEntry, deleteEntry, reset, canAddEntry };
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
      const percentage = Math.floor(Number.parseFloat(entry.percentage) * 100);
      const sizeUsd = increaseAmounts.sizeDeltaUsd.mul(percentage).div(BASIS_POINTS_DIVISOR);
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
  const totalPnl = amounts?.reduce((acc, amount) => acc.add(amount.realizedPnl), BigNumber.from(0));
  const totalPnlPercentage = amounts?.reduce((acc, amount) => acc.add(amount.realizedPnlPercentage), BigNumber.from(0));
  return { ...entriesInfo, amounts, totalPnl, totalPnlPercentage };
}

function createErrorHandlers(nextPositionValues?: NextPositionValues, isLong?: boolean) {
  function getErrorHandler(entry: Partial<Entry>, isStopLoss: boolean): Partial<Entry> {
    if (!nextPositionValues || !nextPositionValues?.nextLiqPrice || !entry.price || parseFloat(entry.price) === 0) {
      return { ...entry, error: "" };
    }

    const inputPrice = parseValue(entry.price, USD_DECIMALS);
    const priceLiqError = isLong ? t`Price below Liq. Price` : t`Price above Liq. Price`;
    const priceError = isStopLoss ? t`Price above Mark Price` : t`Price below Mark Price`;

    if (inputPrice?.lte(nextPositionValues.nextLiqPrice) && isLong) {
      return { ...entry, error: priceLiqError };
    }

    if (inputPrice?.gte(nextPositionValues.nextLiqPrice) && !isLong) {
      return { ...entry, error: priceLiqError };
    }

    if (inputPrice && nextPositionValues.nextEntryPrice) {
      const condition = isStopLoss
        ? inputPrice.gte(nextPositionValues.nextEntryPrice)
        : inputPrice.lte(nextPositionValues.nextEntryPrice);
      if (condition) {
        return { ...entry, error: priceError };
      }
    }

    return { ...entry, error: "" };
  }

  const handleSLErrors = (entry: Partial<Entry>) => getErrorHandler(entry, true);
  const handleTPErrors = (entry: Partial<Entry>) => getErrorHandler(entry, false);

  return { handleSLErrors, handleTPErrors };
}
