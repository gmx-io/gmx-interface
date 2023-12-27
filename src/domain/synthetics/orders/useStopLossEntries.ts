import { useState, useMemo } from "react";
import { uniqueId } from "lodash";
import { IncreasePositionAmounts, getDecreasePositionAmounts } from "domain/synthetics/trade";
import { parseValue } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { MarketInfo } from "../markets";
import { TradeFlags } from "../trade/useTradeFlags";
import { PositionInfo, usePositionsConstants } from "../positions";
import useUiFeeFactor from "../fees/utils/useUiFeeFactor";
import { TokenData } from "../tokens";

export type Entry = {
  id: string;
  price: string;
  percentage: string;
  error?: string;
};

type Props = {
  chainId: number;
  tradeFlags: TradeFlags;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  increaseAmounts?: IncreasePositionAmounts;
  existingPosition?: PositionInfo;
  keepLeverage?: boolean;
};

export default function useStopLossEntries({
  chainId,
  marketInfo,
  tradeFlags,
  collateralToken,
  increaseAmounts,
  existingPosition,
  keepLeverage,
}: Props) {
  const { isLong } = tradeFlags;
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
        const sizeUsd = increaseAmounts.sizeDeltaUsd.mul(entry.percentage).div(100);
        const price = parseValue(entry.price, USD_DECIMALS);
        return getDecreasePositionAmounts({
          marketInfo,
          collateralToken,
          isLong,
          position: existingPosition,
          closeSizeUsd: sizeUsd,
          keepLeverage: keepLeverage!,
          triggerPrice: price,
          userReferralInfo: undefined,
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
  ]);

  function addEntry() {
    const newEntry: Entry = {
      id: uniqueId(),
      price: "",
      percentage: "",
      error: "",
    };
    setStopLossEntries([...stopLossEntries, newEntry]);
  }

  const updateEntry = (id: string, updatedEntry: Partial<Entry>) => {
    setStopLossEntries(stopLossEntries.map((entry) => (entry.id === id ? { ...entry, ...updatedEntry } : entry)));
  };

  const deleteEntry = (id: string) => {
    if (stopLossEntries.length > 1) {
      setStopLossEntries(stopLossEntries.filter((entry) => entry.id !== id));
    }
  };

  const reset = () => {
    setStopLossEntries([{ id: uniqueId(), price: "", percentage: "" }]);
  };

  return { entries: stopLossEntries, addEntry, updateEntry, deleteEntry, reset, stopLossAmounts };
}
