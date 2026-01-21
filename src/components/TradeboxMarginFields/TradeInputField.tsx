import cx from "classnames";
import { ChangeEvent, useCallback, useRef, ReactNode } from "react";
import { useMedia } from "react-use";

import NumberInput from "components/NumberInput/NumberInput";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileButton,
  SelectorBaseMobileList,
  useSelectorClose,
} from "components/SelectorBase/SelectorBase";
import { TableTd } from "components/Table/Table";

export type DisplayMode = "token" | "usd";

type Props = {
  label: ReactNode;
  alternateValue: ReactNode;
  tokenSymbol?: string;
  displayMode: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  showDisplayModeToggle?: boolean;
  unitLabel?: ReactNode;
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
  showDisplayModeToggle = true,
  unitLabel,
  inputValue,
  onInputValueChange,
  onFocus,
  placeholder = "0.0",
  qa,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    // Don't focus input if clicking on the toggle area
    if ((e.target as HTMLElement).closest("[data-toggle-selector]")) {
      return;
    }
    inputRef.current?.focus();
  }, []);

  const displayModeLabel = displayMode === "token" ? tokenSymbol : "USD";

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

          {showDisplayModeToggle && onDisplayModeChange ? (
            <div data-toggle-selector>
              <SelectorBase
                label={displayModeLabel}
                modalLabel="Display Mode"
                qa={qa ? `${qa}-display-mode` : "display-mode"}
                handleClassName="text-14 text-typography-primary"
                chevronClassName="w-12"
              >
                {isMobile ? (
                  <DisplayModeSelectorMobile
                    tokenSymbol={tokenSymbol}
                    displayMode={displayMode}
                    onDisplayModeChange={onDisplayModeChange}
                  />
                ) : (
                  <DisplayModeSelectorDesktop
                    tokenSymbol={tokenSymbol}
                    displayMode={displayMode}
                    onDisplayModeChange={onDisplayModeChange}
                  />
                )}
              </SelectorBase>
            </div>
          ) : unitLabel ? (
            <div className="flex shrink-0 items-center text-13 text-typography-secondary">{unitLabel}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type DisplayModeSelectorProps = {
  tokenSymbol?: string;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
};

function DisplayModeSelectorDesktop({ tokenSymbol, displayMode, onDisplayModeChange }: DisplayModeSelectorProps) {
  const close = useSelectorClose();

  const handleSelect = useCallback(
    (mode: DisplayMode) => {
      onDisplayModeChange(mode);
      close();
    },
    [onDisplayModeChange, close]
  );

  return (
    <table>
      <tbody>
        <SelectorBaseDesktopRow
          onClick={() => handleSelect("token")}
          className={cx({ "text-blue-300": displayMode === "token" })}
        >
          <TableTd padding="compact-one-column">{tokenSymbol}</TableTd>
        </SelectorBaseDesktopRow>
        <SelectorBaseDesktopRow
          onClick={() => handleSelect("usd")}
          className={cx({ "text-blue-300": displayMode === "usd" })}
        >
          <TableTd padding="compact-one-column">USD</TableTd>
        </SelectorBaseDesktopRow>
      </tbody>
    </table>
  );
}

function DisplayModeSelectorMobile({ tokenSymbol, displayMode, onDisplayModeChange }: DisplayModeSelectorProps) {
  const close = useSelectorClose();

  const handleSelect = useCallback(
    (mode: DisplayMode) => {
      onDisplayModeChange(mode);
      close();
    },
    [onDisplayModeChange, close]
  );

  return (
    <SelectorBaseMobileList>
      <SelectorBaseMobileButton onSelect={() => handleSelect("token")}>
        <div className={cx("py-4", { "text-blue-300": displayMode === "token" })}>{tokenSymbol}</div>
      </SelectorBaseMobileButton>
      <SelectorBaseMobileButton onSelect={() => handleSelect("usd")}>
        <div className={cx("py-4", { "text-blue-300": displayMode === "usd" })}>USD</div>
      </SelectorBaseMobileButton>
    </SelectorBaseMobileList>
  );
}
