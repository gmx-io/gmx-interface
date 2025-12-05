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
import {
  calculateDisplayDecimals,
  expandDecimals,
  formatAmount,
  formatUsd,
  formatPercentage,
  parseValue,
  removeTrailingZeros,
} from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import NumberInput from "components/NumberInput/NumberInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const formatGainLossValue = useCallback(
    (mode: TPSLDisplayMode): string => {
      if (mode === "percentage") {
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
    [realizedPnl, realizedPnlPercentage]
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
      if (collateralUsd == null || collateralUsd === 0n) return null;
      const targetPnlUsd = bigMath.mulDiv(collateralUsd, targetPnlPercentage, 10000n);
      return calculatePriceFromPnlUsd(targetPnlUsd);
    },
    [collateralUsd, calculatePriceFromPnlUsd]
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

  const secondFieldAlternateValue = useMemo(() => {
    if (displayMode === "percentage") {
      return realizedPnl != null ? formatUsd(realizedPnl) : undefined;
    }
    return realizedPnlPercentage != null ? formatPercentage(realizedPnlPercentage, { signed: true }) : undefined;
  }, [displayMode, realizedPnl, realizedPnlPercentage]);

  const pnlColorClass = realizedPnl == null ? "" : realizedPnl >= 0n ? "text-green-500" : "text-red-500";

  const convertGainLossValue = useCallback(
    (value: string, fromMode: TPSLDisplayMode, toMode: TPSLDisplayMode): string => {
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
    [collateralUsd]
  );

  const handleDisplayModeChange = useCallback(
    (mode: TPSLDisplayMode) => {
      if (mode === displayMode) {
        setIsDropdownOpen(false);
        return;
      }

      const prevMode = displayMode;
      setDisplayMode(mode);
      setIsDropdownOpen(false);

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
          "text-body-small flex flex-1 cursor-text flex-col justify-between gap-2 rounded-8 border bg-slate-800 p-12",
          priceError ? "border-red-500" : "border-slate-800",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
        )}
        onClick={handleBoxClick(priceInputRef)}
      >
        <div className="flex justify-between">
          <TooltipWithPortal disabled={!priceError} content={priceError} variant="none">
            <div className={cx("text-typography-secondary", { "text-red-500": priceError })}>{label}</div>
          </TooltipWithPortal>
          <div className="text-12 text-typography-secondary">USD</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={entry.price?.input ?? ""}
              className={cx("text-body-large h-28 w-full min-w-0 p-0 outline-none", { "text-red-500": priceError })}
              inputRef={priceInputRef}
              onValueChange={handlePriceChange}
              placeholder="0.0"
            />
          </div>
        </div>
      </div>

      <div
        className={cx(
          "text-body-small relative flex flex-1 cursor-text flex-col justify-between gap-2 rounded-8 border bg-slate-800 p-12",
          "border-slate-800",
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
        )}
        onClick={handleBoxClick(secondInputRef)}
      >
        <div className="flex justify-between">
          <div className="text-typography-secondary">{secondLabel}</div>
          <div className={cx("text-12 text-typography-secondary", pnlColorClass)}>{secondFieldAlternateValue}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={secondFieldValue}
              className="text-body-large h-28 w-full min-w-0 p-0 outline-none"
              inputRef={secondInputRef}
              onValueChange={handleGainLossChange}
              placeholder="0.0"
            />
          </div>
          <div className="relative" data-dropdown>
            <button
              type="button"
              className="flex shrink-0 cursor-pointer items-center gap-4 rounded-4 border-none bg-slate-900 px-8 py-4 text-13 text-typography-secondary hover:text-typography-primary"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              {displayMode === "percentage" ? "%" : "$"}
              {isDropdownOpen ? <ChevronUpIcon className="w-12" /> : <ChevronDownIcon className="w-12" />}
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 top-full z-10 mt-4 overflow-hidden rounded-8 border border-slate-600 bg-slate-800 shadow-lg">
                <button
                  type="button"
                  className={cx(
                    "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                    displayMode === "percentage" ? "bg-slate-700 text-typography-primary" : "text-typography-secondary"
                  )}
                  onClick={() => handleDisplayModeChange("percentage")}
                >
                  %
                </button>
                <button
                  type="button"
                  className={cx(
                    "flex w-full cursor-pointer items-center justify-center border-none px-16 py-8 text-13 hover:bg-slate-700",
                    displayMode === "usd" ? "bg-slate-700 text-typography-primary" : "text-typography-secondary"
                  )}
                  onClick={() => handleDisplayModeChange("usd")}
                >
                  $
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
