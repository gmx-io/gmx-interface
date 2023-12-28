import { useState, useMemo, useCallback } from "react";
import { uniqueId } from "lodash";
import { IncreasePositionAmounts, NextPositionValues, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { parseValue } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { MarketInfo } from "../markets";
import { TradeFlags } from "../trade/useTradeFlags";
import { PositionInfo, usePositionsConstants } from "../positions";
import useUiFeeFactor from "../fees/utils/useUiFeeFactor";
import { TokenData } from "../tokens";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import useWallet from "lib/wallets/useWallet";
import { useUserReferralInfo } from "domain/referrals";
import { useChainId } from "lib/chains";
import { t } from "@lingui/macro";

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
          position: existingPosition,
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
  ]);

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
  return { entries: stopLossEntries, addEntry, updateEntry, deleteEntry, reset, amounts: stopLossAmounts };
}
