import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, useCallback, useMemo, useRef } from "react";

import { TokenData } from "domain/synthetics/tokens";
import { formatAmount, formatUsd } from "lib/numbers";

import NumberInput from "components/NumberInput/NumberInput";

export type SizeDisplayMode = "token" | "usd";

type Props = {
  sizeInTokens: bigint | undefined;
  sizeInUsd: bigint | undefined;
  indexToken: TokenData | undefined;
  displayMode: SizeDisplayMode;
  onDisplayModeChange: (mode: SizeDisplayMode) => void;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  qa?: string;
};

export function SizeField({
  sizeInTokens,
  sizeInUsd,
  indexToken,
  displayMode,
  onDisplayModeChange,
  inputValue,
  onInputValueChange,
  onFocus,
  qa,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    // Don't focus input if clicking on the market selector area
    if ((e.target as HTMLElement).closest("[data-market-selector]")) {
      return;
    }
    inputRef.current?.focus();
  }, []);

  // Value shown above the toggle (opposite of current display mode)
  const alternateValue = useMemo(() => {
    if (displayMode === "token") {
      // Currently showing tokens, so show USD equivalent above
      return sizeInUsd !== undefined ? formatUsd(sizeInUsd) : "$0.00";
    } else {
      // Currently showing USD, so show token equivalent above
      if (sizeInTokens === undefined || !indexToken) return "0";
      const visualMultiplier = BigInt(indexToken.visualMultiplier ?? 1);
      return `${formatAmount(sizeInTokens / visualMultiplier, indexToken.decimals)} ${indexToken.symbol}`;
    }
  }, [displayMode, sizeInUsd, sizeInTokens, indexToken]);

  return (
    <div data-qa={qa}>
      <div
        className={cx(
          `text-body-small flex cursor-text flex-col justify-between gap-2
          rounded-8 border border-slate-800 bg-slate-800 p-12`,
          "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300"
        )}
        onClick={handleBoxClick}
      >
        <div className="flex justify-between">
          <div className="text-typography-secondary">
            <Trans>Size</Trans>
          </div>
          <div className="text-12 text-typography-secondary">{alternateValue}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={inputValue}
              className="text-body-large h-28 w-full min-w-0 p-0 outline-none"
              inputRef={inputRef}
              onValueChange={onInputValueChange}
              onFocus={onFocus}
              placeholder="0.0"
              qa={qa ? qa + "-input" : undefined}
            />
          </div>

          <div className="flex shrink-0 items-center rounded-4 bg-slate-900 p-2 text-typography-secondary">
            <button
              type="button"
              className={cx(
                "flex min-w-40 cursor-pointer items-center justify-center rounded-4 border-none px-8 py-2 text-13 hover:text-typography-primary",
                {
                  "bg-fill-accent text-typography-primary": displayMode === "token",
                }
              )}
              onClick={() => onDisplayModeChange("token")}
            >
              {indexToken?.symbol}
            </button>
            <button
              type="button"
              className={cx(
                "flex min-w-40 cursor-pointer items-center justify-center rounded-4 border-none px-8 py-2 text-13 hover:text-typography-primary",
                {
                  "bg-fill-accent text-typography-primary": displayMode === "usd",
                }
              )}
              onClick={() => onDisplayModeChange("usd")}
            >
              {"USD"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
