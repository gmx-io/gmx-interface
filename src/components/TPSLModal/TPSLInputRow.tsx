import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  calculateDisplayDecimals,
  expandDecimals,
  formatAmount,
  formatDeltaUsd,
  formatUsdPrice,
  parseValue,
  removeTrailingZeros,
} from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import NumberInput from "components/NumberInput/NumberInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

export type TPSLDisplayMode = "percentage" | "usd";

type PositionData = {
  sizeInTokens: bigint;
  collateralUsd: bigint;
  collateralAmount?: bigint;
  collateralTokenDecimals?: number;
  isCollateralTokenEquivalentToIndex?: boolean;
  entryPrice: bigint;
  referencePrice?: bigint;
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
  estimatedPnl?: {
    pnlUsd: bigint;
    pnlPercentage?: bigint;
  };
};

export function TPSLInputRow({
  type,
  priceValue,
  onPriceChange,
  positionData,
  priceError,
  variant = "compact",
  defaultDisplayMode = "percentage",
  estimatedPnl: estimatedPnlProp,
}: Props) {
  const priceInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);
  const displayModePopoverReferenceRef = useRef<HTMLDivElement | null>(null);
  const [displayMode, setDisplayMode] = useState<TPSLDisplayMode>(defaultDisplayMode);
  const [lastEditedField, setLastEditedField] = useState<"price" | "gainLoss" | undefined>(undefined);
  const [gainLossInputValue, setGainLossInputValue] = useState<string>("");

  const {
    sizeInTokens,
    collateralUsd,
    collateralAmount,
    collateralTokenDecimals,
    isCollateralTokenEquivalentToIndex,
    entryPrice,
    referencePrice,
    liquidationPrice,
    isLong,
    indexTokenDecimals,
    visualMultiplier = 1,
  } = positionData;
  const priceReference = referencePrice ?? entryPrice;
  const pnlReferencePrice = entryPrice > 0n ? entryPrice : priceReference;
  const tokenPrecision = expandDecimals(1, indexTokenDecimals);
  const collateralPrecision =
    collateralTokenDecimals !== undefined ? expandDecimals(1, collateralTokenDecimals) : undefined;

  const getCollateralUsdForPnl = useCallback(
    (price: bigint | undefined) => {
      if (!isCollateralTokenEquivalentToIndex) return collateralUsd;
      if (price === undefined || price === 0n) return collateralUsd;
      if (collateralAmount === undefined || collateralPrecision === undefined) return collateralUsd;

      return bigMath.mulDiv(collateralAmount, price, collateralPrecision);
    },
    [collateralAmount, collateralPrecision, collateralUsd, isCollateralTokenEquivalentToIndex]
  );

  const isStopLoss = type === "stopLoss";
  const priceLabel = isStopLoss ? t`SL Price` : t`TP Price`;
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

  const clampPriceForStopLoss = useCallback(
    (price: bigint): bigint => {
      if (!isStopLoss || effectiveLiquidationPrice === undefined) return price;
      const isBeyondLiquidation = isLong ? price <= effectiveLiquidationPrice : price >= effectiveLiquidationPrice;
      return isBeyondLiquidation ? effectiveLiquidationPrice : price;
    },
    [effectiveLiquidationPrice, isLong, isStopLoss]
  );

  const getPriceDiff = useCallback(
    (price: bigint) => (isLong ? price - pnlReferencePrice : pnlReferencePrice - price),
    [isLong, pnlReferencePrice]
  );

  const getPnlUsdForPrice = useCallback(
    (price: bigint) => bigMath.mulDiv(getPriceDiff(price), sizeInTokens, tokenPrecision),
    [getPriceDiff, sizeInTokens, tokenPrecision]
  );

  const calculatePriceFromPnlUsd = useCallback(
    (targetPnlUsd: bigint): bigint | undefined => {
      if (sizeInTokens === 0n || pnlReferencePrice === 0n) return undefined;

      const absPnl = bigMath.abs(targetPnlUsd);
      const positionValueUsd = bigMath.mulDiv(pnlReferencePrice, sizeInTokens, tokenPrecision);
      if (positionValueUsd === 0n) return undefined;

      const targetPositionValueUsd = isLong
        ? isStopLoss
          ? positionValueUsd - absPnl
          : positionValueUsd + absPnl
        : isStopLoss
          ? positionValueUsd + absPnl
          : positionValueUsd - absPnl;

      if (targetPositionValueUsd <= 0n) return undefined;

      return bigMath.mulDiv(targetPositionValueUsd, tokenPrecision, sizeInTokens);
    },
    [isLong, isStopLoss, pnlReferencePrice, sizeInTokens, tokenPrecision]
  );

  const calculatePriceFromPnlPercentage = useCallback(
    (targetPnlPercentage: bigint): bigint | undefined => {
      if (targetPnlPercentage <= 0n) return undefined;

      if (isCollateralTokenEquivalentToIndex && collateralAmount !== undefined && collateralPrecision !== undefined) {
        if (sizeInTokens === 0n || pnlReferencePrice === 0n) return undefined;

        const scaledCollateral = bigMath.mulDiv(collateralAmount, tokenPrecision, collateralPrecision);
        if (scaledCollateral !== 0n) {
          const signedTargetPnlPercentage = isStopLoss ? -targetPnlPercentage : targetPnlPercentage;
          const percentageTerm = bigMath.mulDiv(scaledCollateral, signedTargetPnlPercentage, 10000n);
          const denominator = isLong ? sizeInTokens - percentageTerm : sizeInTokens + percentageTerm;

          if (denominator <= 0n) return undefined;

          const price = bigMath.mulDiv(pnlReferencePrice, sizeInTokens, denominator);
          return clampPriceForStopLoss(price);
        }
      }

      const pnlCollateralUsd = getCollateralUsdForPnl(undefined);
      if (pnlCollateralUsd === 0n) return undefined;

      const targetPnlUsd = bigMath.mulDiv(pnlCollateralUsd, targetPnlPercentage, 10000n);
      const price = calculatePriceFromPnlUsd(targetPnlUsd);
      if (price === undefined) return undefined;

      return clampPriceForStopLoss(price);
    },
    [
      calculatePriceFromPnlUsd,
      clampPriceForStopLoss,
      collateralAmount,
      collateralPrecision,
      getCollateralUsdForPnl,
      isCollateralTokenEquivalentToIndex,
      isLong,
      isStopLoss,
      pnlReferencePrice,
      sizeInTokens,
      tokenPrecision,
    ]
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
      if (sizeInTokens === 0n || pnlReferencePrice === 0n) return "";

      if (mode === "percentage") {
        const pnlCollateralUsd = getCollateralUsdForPnl(currentPriceValue);
        if (pnlCollateralUsd > 0n) {
          const pnlUsd = getPnlUsdForPrice(currentPriceValue);
          const percentage = bigMath.mulDiv(bigMath.abs(pnlUsd), 10000n, pnlCollateralUsd);
          return String(removeTrailingZeros(formatAmount(percentage, 2, 2)));
        }
      } else {
        const pnlUsd = getPnlUsdForPrice(currentPriceValue);
        return String(removeTrailingZeros(formatAmount(bigMath.abs(pnlUsd), USD_DECIMALS, 2)));
      }
      return "";
    },
    [currentPriceValue, getCollateralUsdForPnl, getPnlUsdForPrice, sizeInTokens, pnlReferencePrice]
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

  const derivedEstimatedPnl = useMemo(() => {
    if (currentPriceValue === undefined || currentPriceValue === 0n) return undefined;
    if (pnlReferencePrice === 0n || sizeInTokens === 0n) return undefined;

    const pnlUsd = getPnlUsdForPrice(currentPriceValue);
    const pnlCollateralUsd = getCollateralUsdForPnl(currentPriceValue);
    const pnlPercentage = pnlCollateralUsd > 0n ? bigMath.mulDiv(pnlUsd, 10000n, pnlCollateralUsd) : undefined;

    return {
      pnlUsd,
      pnlPercentage,
    };
  }, [currentPriceValue, getCollateralUsdForPnl, getPnlUsdForPrice, pnlReferencePrice, sizeInTokens]);

  const convertGainLossValue = useCallback(
    (value: string, fromMode: TPSLDisplayMode, toMode: TPSLDisplayMode): string => {
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
    [collateralUsd]
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

  const estimatedPnl = estimatedPnlProp ?? derivedEstimatedPnl;
  const estimatedPnlDisplay = estimatedPnl ? formatDeltaUsd(estimatedPnl.pnlUsd, estimatedPnl.pnlPercentage) : "-";

  const formattedMarkPrice = useMemo(() => {
    if (referencePrice === undefined) return undefined;
    return formatUsdPrice(referencePrice, { visualMultiplier });
  }, [referencePrice, visualMultiplier]);

  const handleMarkPriceClick = useCallback(() => {
    if (referencePrice === undefined || referencePrice === 0n) return;
    onPriceChange(formatPrice(referencePrice));
  }, [referencePrice, formatPrice, onPriceChange]);

  const estimatedPnlRow = (
    <div className="text-body-small flex justify-end">
      <span className="text-typography-secondary">
        <Trans>Est. PnL</Trans>
      </span>
      <span
        className={cx("ml-4 numbers", {
          "text-green-500": estimatedPnl && estimatedPnl.pnlUsd > 0n,
          "text-red-500": estimatedPnl && estimatedPnl.pnlUsd < 0n,
        })}
      >
        {estimatedPnlDisplay ?? "-"}
      </span>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-8">
          <TooltipWithPortal
            className="flex grow"
            handleClassName="grow"
            variant="none"
            disabled={!priceError}
            content={priceError}
          >
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
                    placeholder={priceLabel}
                  />
                </div>
                <span className="text-13 text-typography-secondary">USD</span>
              </div>
            </div>
          </TooltipWithPortal>

          <div
            className={cx(
              "text-body-small relative flex grow cursor-text flex-col justify-between gap-2 rounded-4 border bg-slate-800 px-8 py-3",
              "border-slate-800",
              "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
            )}
            ref={displayModePopoverReferenceRef}
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
              <DisplayModeSelector
                mode={displayMode}
                setMode={handleDisplayModeChange}
                size="small"
                popoverReferenceRef={displayModePopoverReferenceRef}
              />
            </div>
          </div>
        </div>
        {estimatedPnlRow}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-8">
        <TooltipWithPortal
          className="flex-1"
          handleClassName="w-full"
          variant="none"
          disabled={!priceError}
          content={priceError}
        >
          <div
            className={cx(
              "flex flex-1 cursor-text flex-col gap-2 rounded-8 border bg-slate-800 px-8 py-6",
              priceError ? "border-red-500" : "border-slate-800",
              "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
            )}
            onClick={handleBoxClick(priceInputRef)}
          >
            <div className="flex items-center justify-between">
              <div className="text-body-small text-typography-secondary">{priceLabel}</div>
              {formattedMarkPrice !== undefined && (
                <div
                  className="cursor-pointer text-12 text-typography-secondary numbers"
                  onClick={handleMarkPriceClick}
                >
                  <Trans>Mark:</Trans> <span className="text-typography-primary">{formattedMarkPrice}</span>
                </div>
              )}
            </div>
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
        </TooltipWithPortal>
        <div
          className={cx(
            "flex flex-1 cursor-text flex-col gap-2 rounded-8 border border-slate-800 bg-slate-800 px-8 py-6",
            "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover"
          )}
          ref={displayModePopoverReferenceRef}
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
            <DisplayModeSelector
              mode={displayMode}
              setMode={handleDisplayModeChange}
              size="normal"
              popoverReferenceRef={displayModePopoverReferenceRef}
            />
          </div>
        </div>
      </div>
      {estimatedPnlRow}
    </div>
  );
}

function DisplayModeSelector({
  mode,
  setMode,
  size = "normal",
  popoverReferenceRef,
}: {
  mode: TPSLDisplayMode;
  setMode: (mode: TPSLDisplayMode) => void;
  size?: "small" | "normal";
  popoverReferenceRef?: RefObject<HTMLElement | null>;
}) {
  const buttonRef = useRef<HTMLElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    middleware: [offset(4), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
    elements: {
      reference: popoverReferenceRef?.current ?? buttonRef.current,
    },
  });

  const setButtonRef = useCallback(
    (node: HTMLElement | null) => {
      buttonRef.current = node;

      if (!popoverReferenceRef?.current) {
        refs.setReference(node);
      }
    },
    [popoverReferenceRef, refs]
  );

  const setPopoverButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setButtonRef(node);
    },
    [setButtonRef]
  );

  const popoverPanelStyle = useMemo(
    () => ({ ...floatingStyles, zIndex: "calc(var(--modal-z-index) + 1)" }),
    [floatingStyles]
  );

  return (
    <Popover className="relative" data-dropdown>
      {({ open }) => (
        <>
          <Popover.Button
            className={cx(
              "flex shrink-0 cursor-pointer items-center gap-4 rounded-4 border-none p-1 text-typography-secondary outline-none hover:text-typography-primary",
              size === "small" ? "text-13" : "text-14"
            )}
            ref={setPopoverButtonRef}
          >
            {mode === "percentage" ? "%" : "$"}
            <ChevronDownIcon className="w-12" />
          </Popover.Button>
          {open && (
            <FloatingPortal>
              <Popover.Panel
                static
                className="z-10 overflow-hidden rounded-8 border border-slate-600 bg-slate-800 shadow-lg"
                ref={refs.setFloating}
                style={popoverPanelStyle}
              >
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
            </FloatingPortal>
          )}
        </>
      )}
    </Popover>
  );
}
