import { Popover } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { calculateDisplayDecimals, expandDecimals, formatAmount, parseValue, removeTrailingZeros } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import NumberInput from "components/NumberInput/NumberInput";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

export type TPSLDisplayMode = "percentage" | "usd";

type PositionData = {
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralUsd: bigint;
  entryPrice: bigint;
  liquidationPrice?: bigint;
  isLong: boolean;
  indexTokenDecimals: number;
  visualMultiplier?: number;
};

type Props = {
  type: "takeProfit" | "stopLoss";
  priceValue: string;
  onPriceChange: (value: string) => void;
  positionData: PositionData;
  priceError?: string;
  variant?: "compact" | "full";
  defaultDisplayMode?: TPSLDisplayMode;
};

export function TPSLInputRow({
  type,
  priceValue,
  onPriceChange,
  positionData,
  priceError,
  variant = "compact",
  defaultDisplayMode = "percentage",
}: Props) {
  const priceInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);
  const [displayMode, setDisplayMode] = useState<TPSLDisplayMode>(defaultDisplayMode);
  const [lastEditedField, setLastEditedField] = useState<"price" | "gainLoss" | undefined>(undefined);
  const [gainLossInputValue, setGainLossInputValue] = useState<string>("");

  const {
    sizeInUsd,
    sizeInTokens,
    collateralUsd,
    entryPrice,
    liquidationPrice,
    isLong,
    indexTokenDecimals,
    visualMultiplier = 1,
  } = positionData;

  const isStopLoss = type === "stopLoss";
  const priceLabel = isStopLoss ? t`Stop Loss Price` : t`Take Profit Price`;
  const pricePlaceholder = isStopLoss ? t`SL Price` : t`TP Price`;
  const secondLabel = isStopLoss ? t`Loss` : t`Gain`;

  const effectiveLiquidationPrice = useMemo(() => {
    if (liquidationPrice === undefined || liquidationPrice === 0n) return undefined;
    if (entryPrice === 0n) return undefined;
    const priceRange = isLong ? entryPrice - liquidationPrice : liquidationPrice - entryPrice;
    if (priceRange <= 0n) return undefined;
    const buffer = bigMath.mulDiv(priceRange, 100n, 10000n);
    if (isLong) {
      return liquidationPrice + buffer;
    } else {
      return liquidationPrice - buffer;
    }
  }, [liquidationPrice, entryPrice, isLong]);

  const currentPriceValue = useMemo(() => {
    if (!priceValue) return undefined;
    return parseValue(priceValue, USD_DECIMALS);
  }, [priceValue]);

  const calculatePriceFromPnlUsd = useCallback(
    (targetPnlUsd: bigint): bigint | undefined => {
      if (sizeInTokens === 0n) return undefined;
      if (sizeInUsd === 0n) return undefined;

      const absPnl = bigMath.abs(targetPnlUsd);
      const targetPositionValueUsd = isLong
        ? isStopLoss
          ? sizeInUsd - absPnl
          : sizeInUsd + absPnl
        : isStopLoss
          ? sizeInUsd + absPnl
          : sizeInUsd - absPnl;

      if (targetPositionValueUsd <= 0n) return undefined;

      return bigMath.mulDiv(targetPositionValueUsd, expandDecimals(1, indexTokenDecimals), sizeInTokens);
    },
    [sizeInTokens, sizeInUsd, indexTokenDecimals, isLong, isStopLoss]
  );

  const calculatePriceFromPnlPercentage = useCallback(
    (targetPnlPercentage: bigint): bigint | undefined => {
      if (isStopLoss && effectiveLiquidationPrice !== undefined) {
        const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
        if (priceRange <= 0n) return undefined;

        const priceDelta = bigMath.mulDiv(priceRange, targetPnlPercentage, 10000n);
        const price = isLong ? entryPrice - priceDelta : entryPrice + priceDelta;

        if (price <= 0n) return undefined;
        return price;
      }

      if (collateralUsd === 0n) return undefined;
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

  const formatGainLossValue = useCallback(
    (mode: TPSLDisplayMode): string => {
      if (currentPriceValue === undefined || currentPriceValue === 0n) return "";

      if (mode === "percentage") {
        if (isStopLoss && effectiveLiquidationPrice !== undefined) {
          const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
          if (priceRange <= 0n) return "";

          const priceDiff = isLong ? entryPrice - currentPriceValue : currentPriceValue - entryPrice;
          if (priceDiff <= 0n) return "";

          const percentage = bigMath.mulDiv(priceDiff, 10000n, priceRange);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }

        if (collateralUsd > 0n && entryPrice > 0n) {
          const priceDiff = isLong ? currentPriceValue - entryPrice : entryPrice - currentPriceValue;
          const pnlUsd = bigMath.mulDiv(priceDiff, sizeInUsd, entryPrice);
          const percentage = bigMath.mulDiv(bigMath.abs(pnlUsd), 10000n, collateralUsd);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }
      } else {
        if (entryPrice > 0n) {
          const priceDiff = isLong ? currentPriceValue - entryPrice : entryPrice - currentPriceValue;
          const pnlUsd = bigMath.mulDiv(priceDiff, sizeInUsd, entryPrice);
          return String(removeTrailingZeros(formatAmount(bigMath.abs(pnlUsd), USD_DECIMALS, 2)));
        }
      }
      return "";
    },
    [currentPriceValue, isStopLoss, entryPrice, effectiveLiquidationPrice, isLong, collateralUsd, sizeInUsd]
  );

  const calculateAndUpdatePrice = useCallback(
    (value: string, mode: TPSLDisplayMode) => {
      const decimals = mode === "percentage" ? 2 : USD_DECIMALS;
      const parsed = parseValue(value, decimals);
      if (parsed === undefined || parsed <= 0n) return;

      const calculateFn = mode === "percentage" ? calculatePriceFromPnlPercentage : calculatePriceFromPnlUsd;
      const price = calculateFn(parsed);
      if (price !== undefined && price > 0n) {
        onPriceChange(formatPrice(price));
      }
    },
    [calculatePriceFromPnlPercentage, calculatePriceFromPnlUsd, formatPrice, onPriceChange]
  );

  useEffect(() => {
    if (lastEditedField !== "gainLoss" || !gainLossInputValue) return;
    calculateAndUpdatePrice(gainLossInputValue, displayMode);
  }, [lastEditedField, gainLossInputValue, displayMode, calculateAndUpdatePrice]);

  const handlePriceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setLastEditedField("price");
      setGainLossInputValue("");
      onPriceChange(e.target.value);
    },
    [onPriceChange]
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
      if (isStopLoss && effectiveLiquidationPrice !== undefined) {
        const priceRange = isLong ? entryPrice - effectiveLiquidationPrice : effectiveLiquidationPrice - entryPrice;
        if (priceRange <= 0n) return "";

        if (fromMode === "percentage" && toMode === "usd") {
          const parsed = parseValue(value, 2);
          if (parsed === undefined || parsed <= 0n) return "";
          const priceDelta = bigMath.mulDiv(priceRange, parsed, 10000n);
          const price = isLong ? entryPrice - priceDelta : entryPrice + priceDelta;
          const positionValueAtPrice = bigMath.mulDiv(sizeInTokens, price, expandDecimals(1, indexTokenDecimals));
          const pnlUsd = isLong ? sizeInUsd - positionValueAtPrice : positionValueAtPrice - sizeInUsd;
          return String(removeTrailingZeros(formatAmount(bigMath.abs(pnlUsd), USD_DECIMALS, 2)));
        }

        if (fromMode === "usd" && toMode === "percentage") {
          const parsed = parseValue(value, USD_DECIMALS);
          if (parsed === undefined || parsed <= 0n) return "";
          const price = calculatePriceFromPnlUsd(parsed);
          if (price === undefined) return "";
          const priceDiff = isLong ? entryPrice - price : price - entryPrice;
          if (priceDiff <= 0n) return "";
          const percentage = bigMath.mulDiv(priceDiff, 10000n, priceRange);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }

        return value;
      }

      if (collateralUsd === 0n) return "";

      if (fromMode === "percentage" && toMode === "usd") {
        const parsed = parseValue(value, 2);
        if (parsed === undefined || parsed <= 0n) return "";
        const targetPnlUsd = bigMath.mulDiv(collateralUsd, parsed, 10000n);
        return String(removeTrailingZeros(formatAmount(bigMath.abs(targetPnlUsd), USD_DECIMALS, 2)));
      }

      if (fromMode === "usd" && toMode === "percentage") {
        const parsed = parseValue(value, USD_DECIMALS);
        if (parsed === undefined || parsed <= 0n) return "";
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

  const handleBoxClick = (ref: React.RefObject<HTMLInputElement>) => (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("[data-dropdown]")) {
      ref.current?.focus();
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex gap-8">
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
                value={priceValue}
                className={cx("h-18 w-full min-w-0 p-0 text-13 outline-none", { "text-red-500": priceError })}
                inputRef={priceInputRef}
                onValueChange={handlePriceChange}
                placeholder={pricePlaceholder}
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
            <DisplayModeSelector mode={displayMode} setMode={handleDisplayModeChange} size="small" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      <div
        className={cx(
          "flex flex-1 cursor-text flex-col gap-2 rounded-8 border bg-slate-800 px-8 py-6",
          priceError ? "border-red-500" : "border-slate-800",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
        )}
        onClick={handleBoxClick(priceInputRef)}
      >
        <div className="text-body-small text-typography-secondary">{priceLabel}</div>
        <div className="flex items-center justify-between">
          <NumberInput
            value={priceValue}
            className={cx("bg-transparent h-24 w-full min-w-0 p-0 text-16 outline-none", {
              "text-red-500": priceError,
            })}
            inputRef={priceInputRef}
            onValueChange={handlePriceChange}
            placeholder="0.00"
          />
          <span className="text-14 text-typography-secondary">USD</span>
        </div>
      </div>
      <div
        className={cx(
          "flex flex-1 cursor-text flex-col gap-2 rounded-8 border border-slate-800 bg-slate-800 px-8 py-6",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
        )}
        onClick={handleBoxClick(secondInputRef)}
      >
        <div className="text-body-small text-typography-secondary">
          <Trans>{secondLabel}</Trans>
        </div>
        <div className="flex items-center justify-between">
          <NumberInput
            value={secondFieldValue}
            className="bg-transparent h-24 w-full min-w-0 p-0 text-16 outline-none"
            inputRef={secondInputRef}
            onValueChange={handleGainLossChange}
            placeholder="0"
          />
          <DisplayModeSelector mode={displayMode} setMode={handleDisplayModeChange} size="normal" />
        </div>
      </div>
    </div>
  );
}

function DisplayModeSelector({
  mode,
  setMode,
  size = "normal",
}: {
  mode: TPSLDisplayMode;
  setMode: (mode: TPSLDisplayMode) => void;
  size?: "small" | "normal";
}) {
  return (
    <Popover className="relative" data-dropdown>
      <Popover.Button
        className={cx(
          "flex shrink-0 cursor-pointer items-center gap-4 rounded-4 border-none p-1 text-typography-secondary outline-none hover:text-typography-primary",
          size === "small" ? "text-13" : "text-14"
        )}
      >
        {mode === "percentage" ? "%" : "$"}
        <ChevronDownIcon className="w-12" />
      </Popover.Button>
      <Popover.Panel className="absolute right-0 top-full z-10 mt-4 overflow-hidden rounded-8 border border-slate-600 bg-slate-800 shadow-lg">
        {({ close }) => (
          <>
            <button
              type="button"
              className={cx(
                "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                mode === "percentage" ? "bg-slate-700 text-typography-primary" : "text-typography-secondary"
              )}
              onClick={() => {
                setMode("percentage");
                close();
              }}
            >
              %
            </button>
            <button
              type="button"
              className={cx(
                "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                mode === "usd" ? "bg-slate-700 text-typography-primary" : "text-typography-secondary"
              )}
              onClick={() => {
                setMode("usd");
                close();
              }}
            >
              $
            </button>
          </>
        )}
      </Popover.Panel>
    </Popover>
  );
}
