import cx from "classnames";
import { ChangeEvent, useCallback, useRef, ReactNode } from "react";

import NumberInput from "components/NumberInput/NumberInput";

export type DisplayMode = "token" | "usd";

type Props = {
  label: ReactNode;
  alternateValue: string | undefined;
  tokenSymbol?: string;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  qa?: string;
};

export function TradeInputField({
  label,
  alternateValue,
  tokenSymbol,
  displayMode,
  onDisplayModeChange,
  inputValue,
  onInputValueChange,
  onFocus,
  placeholder = "0.0",
  qa,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    // Don't focus input if clicking on the toggle area
    if ((e.target as HTMLElement).closest("[data-toggle-selector]")) {
      return;
    }
    inputRef.current?.focus();
  }, []);

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
          <div className="text-typography-secondary">{label}</div>
          <div className="text-12 text-typography-secondary numbers">{alternateValue}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative grow">
            <NumberInput
              value={inputValue}
              className="text-body-large h-28 w-full min-w-0 p-0 outline-none"
              inputRef={inputRef}
              onValueChange={onInputValueChange}
              onFocus={onFocus}
              placeholder={placeholder}
              qa={qa ? qa + "-input" : undefined}
            />
          </div>

          <div
            className="flex shrink-0 items-center rounded-4 bg-slate-900 p-2 text-typography-secondary"
            data-toggle-selector
          >
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
              {tokenSymbol}
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
