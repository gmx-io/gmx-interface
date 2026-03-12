import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectSetTradeboxAllowedSlippage,
  selectTradeboxAllowedSlippage,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatPercentage } from "lib/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { useTradeboxChanges } from "./hooks/useTradeboxChanges";

const SLIPPAGE_OPTIONS = [30, 50, 100, 150]; // basis points

export function SwapSlippageField({ disabled }: { disabled?: boolean }) {
  const { savedAllowedSlippage } = useSettings();
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const setAllowedSlippage = useSelector(selectSetTradeboxAllowedSlippage);
  const tradeboxChanges = useTradeboxChanges();

  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isPresetValue = useMemo(() => {
    return SLIPPAGE_OPTIONS.includes(allowedSlippage);
  }, [allowedSlippage]);

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setAllowedSlippage(savedAllowedSlippage);
      setIsCustom(false);
      setCustomValue("");
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedAllowedSlippage, setAllowedSlippage]);

  useEffect(() => {
    if (!isPresetValue && allowedSlippage > 0) {
      setIsCustom(true);
      setCustomValue((allowedSlippage / 100).toString());
    }
  }, [allowedSlippage, isPresetValue]);

  const handlePresetClick = useCallback(
    (value: number) => {
      setAllowedSlippage(value);
      setIsCustom(false);
      setCustomValue("");
    },
    [setAllowedSlippage]
  );

  const handleCustomClick = useCallback(() => {
    setIsCustom(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCustomChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomValue(value);

      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        const bps = Math.round(numValue * 100);
        setAllowedSlippage(bps);
      }
    },
    [setAllowedSlippage]
  );

  const handleCustomBlur = useCallback(() => {
    if (!customValue || parseFloat(customValue) === 0) {
      setIsCustom(false);
      setCustomValue("");
      if (!isPresetValue) {
        setAllowedSlippage(savedAllowedSlippage);
      }
    }
  }, [customValue, isPresetValue, savedAllowedSlippage, setAllowedSlippage]);

  return (
    <div className="flex h-full items-center justify-between gap-8">
      <TooltipWithPortal
        handle={<Trans>Allowed slippage</Trans>}
        position="bottom-start"
        variant="iconStroke"
        disabled={disabled}
        handleClassName={cx(
          "whitespace-nowrap text-12 font-medium",
          disabled ? "text-slate-500" : "text-typography-secondary"
        )}
        content={
          <Trans>
            Slippage is the difference between your expected and actual execution price due to price volatility. Orders
            won't execute if slippage exceeds your allowed maximum. The default can be adjusted in settings.
            <br />
            <br />A low value (e.g. less than -{formatPercentage(BigInt(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })})
            may cause failed orders during volatility.
            <br />
            <br />
            Note: slippage is different from price impact, which is based on open interest imbalances.{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/fees/#slippage">Read more</ExternalLink>.
          </Trans>
        }
      />

      <div className="flex items-center gap-8">
        {SLIPPAGE_OPTIONS.map((option) => {
          const isSelected = allowedSlippage === option && !isCustom;
          return (
            <button
              key={option}
              disabled={disabled}
              onClick={() => handlePresetClick(option)}
              className={cx(
                "text-body-small rounded-4 px-6 py-4 transition-colors",
                disabled
                  ? "cursor-default bg-slate-700 text-slate-500"
                  : isSelected
                    ? "bg-blue-500 text-typography-primary"
                    : "bg-slate-700 text-typography-secondary hover:bg-slate-600"
              )}
            >
              {(option / 100).toFixed(1)}%
            </button>
          );
        })}

        <div
          onClick={!disabled && !isCustom ? handleCustomClick : undefined}
          className={cx(
            "text-body-small flex w-54 items-center justify-center rounded-4 px-6 py-4 transition-colors",
            disabled
              ? "cursor-default bg-slate-700 text-slate-500"
              : isCustom || (!isPresetValue && allowedSlippage > 0)
                ? "bg-blue-500 text-typography-primary"
                : "cursor-pointer bg-slate-700 text-typography-secondary hover:bg-slate-600"
          )}
        >
          {isCustom ? (
            <>
              <input
                ref={inputRef}
                type="text"
                value={customValue}
                onChange={handleCustomChange}
                onBlur={handleCustomBlur}
                className="bg-transparent mr-2 w-24 p-0 text-right text-12 outline-none placeholder:text-typography-secondary"
              />
              <span>%</span>
            </>
          ) : (
            <span>{t`Custom`}</span>
          )}
        </div>
      </div>
    </div>
  );
}
