import { Popover } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxMockPosition } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SidecarSlTpOrderEntry, SidecarOrderEntryGroupBase } from "domain/synthetics/sidecarOrders/types";
import { calculateDisplayDecimals, expandDecimals, formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import NumberInput from "components/NumberInput/NumberInput";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

export type TPSLDisplayMode = "percentage" | "usd";
type LastEditedField = "price" | "gainLoss" | null;

type Props = {
  type: "takeProfit" | "stopLoss";
  entry: SidecarSlTpOrderEntry;
  entriesInfo: SidecarOrderEntryGroupBase<SidecarSlTpOrderEntry>;
};

export function SideOrderEntry({ type, entry, entriesInfo }: Props) {
  const priceInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);
  const [displayMode, setDisplayMode] = useState<TPSLDisplayMode>("percentage");
  const [lastEditedField, setLastEditedField] = useState<LastEditedField>(null);
  const [gainLossInputValue, setGainLossInputValue] = useState<string>("");

  const mockPosition = useSelector(selectTradeboxMockPosition);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isLong } = useSelector(selectTradeboxTradeFlags);

  const isStopLoss = type === "stopLoss";
  const label = isStopLoss ? t`SL Price` : t`TP Price`;
  const secondLabel = isStopLoss ? t`Loss` : t`Gain`;

  const priceError = entry.price?.error;
  const realizedPnl = entry.decreaseAmounts?.realizedPnl;
  const realizedPnlPercentage = entry.decreaseAmounts?.realizedPnlPercentage;

  const sizeInTokens = mockPosition?.sizeInTokens;
  const sizeInUsd = mockPosition?.sizeInUsd;
  const indexTokenDecimals = marketInfo?.indexToken?.decimals;
  const visualMultiplier = marketInfo?.indexToken?.visualMultiplier ?? 1;

  const collateralUsd = useMemo(() => {
    const collateralAmount = mockPosition?.collateralAmount;
    const collateralToken = mockPosition?.collateralToken;
    if (collateralAmount == null) return undefined;
    if (collateralToken?.decimals == null || collateralToken?.prices?.minPrice == null) return undefined;

    return bigMath.mulDiv(
      collateralAmount,
      collateralToken.prices.minPrice,
      expandDecimals(1, collateralToken.decimals)
    );
  }, [mockPosition?.collateralAmount, mockPosition?.collateralToken]);

  const entryPrice = mockPosition?.entryPrice;
  const liquidationPrice = mockPosition?.liquidationPrice;

  const effectiveLiquidationPrice = useMemo(() => {
    if (liquidationPrice == null || liquidationPrice === 0n) return undefined;
    if (entryPrice == null || entryPrice === 0n) return undefined;
    const priceRange = isLong ? entryPrice - liquidationPrice : liquidationPrice - entryPrice;
    if (priceRange <= 0n) return undefined;
    const buffer = bigMath.mulDiv(priceRange, 100n, 10000n);
    if (isLong) {
      return liquidationPrice + buffer;
    } else {
      return liquidationPrice - buffer;
    }
  }, [liquidationPrice, entryPrice, isLong]);

  const formatGainLossValue = useCallback(
    (mode: TPSLDisplayMode): string => {
      if (mode === "percentage") {
        if (isStopLoss && entryPrice != null && effectiveLiquidationPrice != null) {
          const currentPrice = entry.price?.value;
          if (currentPrice == null || currentPrice === 0n) return "";

          const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
          if (priceRange <= 0n) return "";

          const priceDiff = isLong ? entryPrice - currentPrice : currentPrice - entryPrice;
          if (priceDiff <= 0n) return "";

          const percentage = bigMath.mulDiv(priceDiff, 10000n, priceRange);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }
        if (realizedPnlPercentage != null && realizedPnlPercentage !== 0n) {
          return String(removeTrailingZeros(formatAmount(bigMath.abs(realizedPnlPercentage), 2, 2)));
        }
      } else {
        if (realizedPnl != null && realizedPnl !== 0n) {
          return String(removeTrailingZeros(formatAmount(bigMath.abs(realizedPnl), USD_DECIMALS, 2)));
        }
      }
      return "";
    },
    [realizedPnl, realizedPnlPercentage, isStopLoss, entryPrice, effectiveLiquidationPrice, isLong, entry.price?.value]
  );

  const calculatePriceFromPnlUsd = useCallback(
    (targetPnlUsd: bigint): bigint | null => {
      if (sizeInTokens == null || sizeInTokens === 0n) return null;
      if (sizeInUsd == null || sizeInUsd === 0n) return null;
      if (indexTokenDecimals == null) return null;

      const absPnl = bigMath.abs(targetPnlUsd);
      const targetPositionValueUsd = isLong
        ? isStopLoss
          ? sizeInUsd - absPnl
          : sizeInUsd + absPnl
        : isStopLoss
          ? sizeInUsd + absPnl
          : sizeInUsd - absPnl;

      if (targetPositionValueUsd <= 0n) return null;

      return bigMath.mulDiv(targetPositionValueUsd, expandDecimals(1, indexTokenDecimals), sizeInTokens);
    },
    [sizeInTokens, sizeInUsd, indexTokenDecimals, isLong, isStopLoss]
  );

  const calculatePriceFromPnlPercentage = useCallback(
    (targetPnlPercentage: bigint): bigint | null => {
      if (isStopLoss && entryPrice != null && effectiveLiquidationPrice != null) {
        const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
        if (priceRange <= 0n) return null;

        const priceDelta = bigMath.mulDiv(priceRange, targetPnlPercentage, 10000n);
        const price = isLong ? entryPrice - priceDelta : entryPrice + priceDelta;

        if (price <= 0n) return null;
        return price;
      }

      if (collateralUsd == null || collateralUsd === 0n) return null;
      const targetPnlUsd = bigMath.mulDiv(collateralUsd, targetPnlPercentage, 10000n);
      return calculatePriceFromPnlUsd(targetPnlUsd);
    },
    [collateralUsd, calculatePriceFromPnlUsd, isStopLoss, entryPrice, effectiveLiquidationPrice, isLong]
  );

  const formatPrice = useCallback(
    (price: bigint): string => {
      const displayDecimals = calculateDisplayDecimals(price, USD_DECIMALS, visualMultiplier);
      return String(
        removeTrailingZeros(formatAmount(price, USD_DECIMALS, displayDecimals, undefined, undefined, visualMultiplier))
      );
    },
    [visualMultiplier]
  );

  const calculateAndUpdatePrice = useCallback(
    (value: string, mode: TPSLDisplayMode) => {
      const decimals = mode === "percentage" ? 2 : USD_DECIMALS;
      const parsed = parseValue(value, decimals);
      if (parsed == null || parsed <= 0n) return;

      const calculateFn = mode === "percentage" ? calculatePriceFromPnlPercentage : calculatePriceFromPnlUsd;
      const price = calculateFn(parsed);
      if (price != null && price > 0n) {
        entriesInfo.updateEntry(entry.id, "price", formatPrice(price));
      }
    },
    [calculatePriceFromPnlPercentage, calculatePriceFromPnlUsd, formatPrice, entriesInfo, entry.id]
  );

  useEffect(() => {
    if (lastEditedField !== "gainLoss" || !gainLossInputValue) return;
    calculateAndUpdatePrice(gainLossInputValue, displayMode);
  }, [lastEditedField, gainLossInputValue, displayMode, calculateAndUpdatePrice]);

  const handlePriceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setLastEditedField("price");
      entriesInfo.updateEntry(entry.id, "price", e.target.value);
    },
    [entriesInfo, entry.id]
  );

  const handleGainLossChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLastEditedField("gainLoss");
      setGainLossInputValue(value);
      calculateAndUpdatePrice(value, displayMode);
    },
    [displayMode, calculateAndUpdatePrice]
  );

  const secondFieldValue = useMemo(() => {
    if (lastEditedField === "gainLoss") {
      return gainLossInputValue;
    }
    return formatGainLossValue(displayMode);
  }, [lastEditedField, gainLossInputValue, formatGainLossValue, displayMode]);

  const convertGainLossValue = useCallback(
    (value: string, fromMode: TPSLDisplayMode, toMode: TPSLDisplayMode): string => {
      if (
        isStopLoss &&
        entryPrice != null &&
        effectiveLiquidationPrice != null &&
        sizeInUsd != null &&
        sizeInTokens != null &&
        indexTokenDecimals != null
      ) {
        const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
        if (priceRange <= 0n) return "";

        if (fromMode === "percentage" && toMode === "usd") {
          const parsed = parseValue(value, 2);
          if (parsed == null || parsed <= 0n) return "";
          const priceDelta = bigMath.mulDiv(priceRange, parsed, 10000n);
          const price = isLong ? entryPrice - priceDelta : entryPrice + priceDelta;
          const positionValueAtPrice = bigMath.mulDiv(sizeInTokens, price, expandDecimals(1, indexTokenDecimals));
          const pnlUsd = isLong ? sizeInUsd - positionValueAtPrice : positionValueAtPrice - sizeInUsd;
          return String(removeTrailingZeros(formatAmount(bigMath.abs(pnlUsd), USD_DECIMALS, 2)));
        }

        if (fromMode === "usd" && toMode === "percentage") {
          const parsed = parseValue(value, USD_DECIMALS);
          if (parsed == null || parsed <= 0n) return "";
          const price = calculatePriceFromPnlUsd(parsed);
          if (price == null) return "";
          const priceDiff = isLong ? entryPrice - price : price - entryPrice;
          if (priceDiff <= 0n) return "";
          const percentage = bigMath.mulDiv(priceDiff, 10000n, priceRange);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }

        return value;
      }

      if (collateralUsd == null || collateralUsd === 0n) return "";

      if (fromMode === "percentage" && toMode === "usd") {
        const parsed = parseValue(value, 2);
        if (parsed == null || parsed <= 0n) return "";
        const targetPnlUsd = bigMath.mulDiv(collateralUsd, parsed, 10000n);
        return String(removeTrailingZeros(formatAmount(bigMath.abs(targetPnlUsd), USD_DECIMALS, 2)));
      }

      if (fromMode === "usd" && toMode === "percentage") {
        const parsed = parseValue(value, USD_DECIMALS);
        if (parsed == null || parsed <= 0n) return "";
        const percentage = bigMath.mulDiv(parsed, 10000n, collateralUsd);
        return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
      }

      return value;
    },
    [
      collateralUsd,
      isStopLoss,
      entryPrice,
      effectiveLiquidationPrice,
      isLong,
      sizeInUsd,
      sizeInTokens,
      indexTokenDecimals,
      calculatePriceFromPnlUsd,
    ]
  );

  const handleDisplayModeChange = useCallback(
    (mode: TPSLDisplayMode) => {
      if (mode === displayMode) return;

      const prevMode = displayMode;
      setDisplayMode(mode);

      if (lastEditedField === "gainLoss" && gainLossInputValue) {
        setGainLossInputValue(convertGainLossValue(gainLossInputValue, prevMode, mode));
      }
    },
    [displayMode, lastEditedField, gainLossInputValue, convertGainLossValue]
  );

  const handleBoxClick = (ref: React.RefObject<HTMLInputElement | null>) => (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("[data-dropdown]")) {
      ref.current?.focus();
    }
  };

  return (
    <div className="flex gap-4">
      <div
        className={cx(
          "flex flex-1 cursor-text flex-col justify-between gap-2 rounded-4 border bg-slate-800 px-8 py-3 text-13",
          priceError ? "border-red-500" : "border-slate-800",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
        )}
        onClick={handleBoxClick(priceInputRef)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="relative grow">
            <NumberInput
              value={entry.price?.input ?? ""}
              className={cx("h-18 w-full min-w-0 p-0 text-13 outline-none", { "text-red-500": priceError })}
              inputRef={priceInputRef}
              onValueChange={handlePriceChange}
              placeholder={label}
            />
          </div>
          <span className="text-13 text-typography-secondary">USD</span>
        </div>
      </div>

      <div
        className={cx(
          "text-body-small relative flex flex-1 cursor-text flex-col justify-between gap-2 rounded-4 border bg-slate-800 px-8 py-3",
          "border-slate-800",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
        )}
        onClick={handleBoxClick(secondInputRef)}
      >
        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={secondFieldValue}
              className="h-18 w-full min-w-0 p-0 text-13 outline-none"
              inputRef={secondInputRef}
              onValueChange={handleGainLossChange}
              placeholder={secondLabel}
            />
          </div>
          <Popover className="relative">
            <Popover.Button className="flex shrink-0 cursor-pointer items-center gap-4 rounded-4 border-none p-1 text-13 text-typography-secondary outline-none hover:text-typography-primary">
              {displayMode === "percentage" ? "%" : "$"}
              <ChevronDownIcon className="w-12" />
            </Popover.Button>
            <Popover.Panel className="absolute right-0 top-full z-10 mt-4 overflow-hidden rounded-8 border border-slate-600 bg-slate-800 shadow-lg">
              {({ close }) => (
                <>
                  <button
                    type="button"
                    className={cx(
                      "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                      displayMode === "percentage"
                        ? "bg-slate-700 text-typography-primary"
                        : "text-typography-secondary"
                    )}
                    onClick={() => {
                      handleDisplayModeChange("percentage");
                      close();
                    }}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={cx(
                      "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                      displayMode === "usd" ? "bg-slate-700 text-typography-primary" : "text-typography-secondary"
                    )}
                    onClick={() => {
                      handleDisplayModeChange("usd");
                      close();
                    }}
                  >
                    $
                  </button>
                </>
              )}
            </Popover.Panel>
          </Popover>
        </div>
      </div>
    </div>
  );
}
