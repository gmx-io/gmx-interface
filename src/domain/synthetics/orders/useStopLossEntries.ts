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
import { useUserReferralInfo } from "domain/referrals";
import { useChainId } from "lib/chains";
import { t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { getPositionFee, getPriceImpactForPosition } from "../fees";

export type Entry = {
  id: string;
  price: string;
  percentage: string;
  error?: string;
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

export default function useStopLossEntries({
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
  const [stopLossEntries, setStopLossEntries] = useState<Entry[]>([
    { id: uniqueId(), price: "", percentage: "", error: "" },
  ]);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const currentPosition = useMemo(() => {
    if (!increaseAmounts || !positionKey) return;

    return getPendingMockPosition({
      isIncrease: true,
      positionKey,
      sizeDeltaUsd: increaseAmounts.sizeDeltaUsd || BigNumber.from(0),
      sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens || BigNumber.from(0),
      collateralDeltaAmount: increaseAmounts.collateralDeltaAmount || BigNumber.from(0),
      updatedAt: Date.now(),
      updatedAtBlock: BigNumber.from(0),
    });
  }, [increaseAmounts, positionKey]);

  const currentPositionInfo: PositionInfo | undefined = useMemo(() => {
    if (
      !account ||
      !positionKey ||
      !marketInfo ||
      !collateralToken ||
      !isLong ||
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

  const stopLossAmounts = useMemo(() => {
    if (!increaseAmounts || !marketInfo || !collateralToken || !minPositionSizeUsd || !minCollateralUsd) return;
    return stopLossEntries
      .filter((entry) => entry.price && entry.percentage && !entry.error)
      .map((entry) => {
        const sizeUsd = increaseAmounts.sizeDeltaUsd.mul(entry.percentage).div(BASIS_POINTS_DIVISOR);
        const price = parseValue(entry.price, USD_DECIMALS);
        return getDecreasePositionAmounts({
          marketInfo,
          collateralToken,
          isLong,
          position: existingPosition || currentPositionInfo,
          closeSizeUsd: sizeUsd,
          keepLeverage: keepLeverage!,
          triggerPrice: price,
          userReferralInfo,
          minCollateralUsd,
          minPositionSizeUsd,
          uiFeeFactor,
        });
      });
  }, [
    stopLossEntries,
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
  ]);

  const totalPnl = useMemo(() => {
    if (!stopLossAmounts) return;
    return stopLossAmounts.reduce((acc, amount) => acc.add(amount.estimatedPnl), BigNumber.from(0));
  }, [stopLossAmounts]);

  const addEntry = useCallback(() => {
    const newEntry: Entry = {
      id: uniqueId(),
      price: "",
      percentage: "",
      error: "",
    };
    setStopLossEntries((prevEntries) => [...prevEntries, newEntry]);
  }, []);

  const updateEntry = useCallback(
    (id: string, updatedEntry: Partial<Entry>) => {
      const handleErrors = (entry: Partial<Entry>): Partial<Entry> => {
        if (!nextPositionValues?.nextLiqPrice || !entry.price) {
          return entry;
        }

        const inputPrice = parseValue(entry.price, USD_DECIMALS);
        const error = inputPrice?.lt(nextPositionValues.nextLiqPrice) ? t`Price below Liq. Price` : entry.error;

        return { ...entry, error };
      };

      setStopLossEntries((prevEntries) =>
        prevEntries.map((entry) => (entry.id === id ? { ...entry, ...handleErrors(updatedEntry) } : entry))
      );
    },
    [nextPositionValues]
  );

  const deleteEntry = useCallback((id: string) => {
    setStopLossEntries((prevEntries) =>
      prevEntries.length > 1 ? prevEntries.filter((entry) => entry.id !== id) : prevEntries
    );
  }, []);

  const reset = useCallback(() => {
    setStopLossEntries([{ id: uniqueId(), price: "", percentage: "" }]);
  }, []);
  return { entries: stopLossEntries, addEntry, updateEntry, deleteEntry, reset, amounts: stopLossAmounts, totalPnl };
}
