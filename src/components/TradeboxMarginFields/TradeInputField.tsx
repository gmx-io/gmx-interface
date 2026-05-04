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
import TokenIcon from "components/TokenIcon/TokenIcon";

import UsdIcon from "img/ic_usd.svg?react";

import { TradeInputBox } from "./TradeInputBox";

export type DisplayMode = "token" | "usd";

type Props = {
  label: ReactNode;
  alternateValue: ReactNode;
  tokenSymbol?: string;
  displayMode: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  showDisplayModeToggle?: boolean;
  unitLabel?: ReactNode;
  rightHeadline?: ReactNode;
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  qa?: string;
  maxDecimals?: number;
};

export function TradeInputField({
  label,
  alternateValue,
  tokenSymbol,
  displayMode,
  onDisplayModeChange,
  showDisplayModeToggle = true,
  unitLabel,
  rightHeadline,
  inputValue,
  onInputValueChange,
  onFocus,
  placeholder = "0.0",
  qa,
  maxDecimals,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  const displayModeLabel =
    displayMode === "token" && tokenSymbol ? (
      <span className="flex items-center gap-4">
        <TokenIcon symbol={tokenSymbol} displaySize={20} />
        {tokenSymbol}
      </span>
    ) : (
      <span className="flex items-center gap-4">
        <UsdIcon className="size-20" />
        USD
      </span>
    );

  const rightContent =
    showDisplayModeToggle && onDisplayModeChange ? (
      <div data-toggle-selector>
        <SelectorBase
          label={displayModeLabel}
          modalLabel="Display Mode"
          qa={qa ? `${qa}-display-mode` : "display-mode"}
          handleClassName="text-14"
          chevronClassName="w-16"
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
    ) : null;

  return (
    <TradeInputBox
      qa={qa}
      leftHeadline={label}
      leftContent={
        <>
          <NumberInput
            value={inputValue}
            className="text-body-large w-full min-w-0 p-0 outline-none"
            inputRef={inputRef}
            onValueChange={onInputValueChange}
            onFocus={onFocus}
            placeholder={placeholder}
            qa={qa ? qa + "-input" : undefined}
            maxDecimals={maxDecimals}
          />
          {alternateValue && (
            <span className="shrink-0 text-12 text-typography-secondary numbers">≈{alternateValue}</span>
          )}
        </>
      }
      rightHeadline={rightHeadline}
      rightContent={rightContent}
      hideDivider={!showDisplayModeToggle || !onDisplayModeChange}
    />
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
          onClick={() => handleSelect("usd")}
          className={cx({ "text-blue-300": displayMode === "usd" })}
        >
          <TableTd padding="compact-one-column">USD</TableTd>
        </SelectorBaseDesktopRow>
        <SelectorBaseDesktopRow
          onClick={() => handleSelect("token")}
          className={cx({ "text-blue-300": displayMode === "token" })}
        >
          <TableTd padding="compact-one-column">{tokenSymbol}</TableTd>
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
      <SelectorBaseMobileButton onSelect={() => handleSelect("usd")}>
        <div className={cx("py-4", { "text-blue-300": displayMode === "usd" })}>USD</div>
      </SelectorBaseMobileButton>
      <SelectorBaseMobileButton onSelect={() => handleSelect("token")}>
        <div className={cx("py-4", { "text-blue-300": displayMode === "token" })}>{tokenSymbol}</div>
      </SelectorBaseMobileButton>
    </SelectorBaseMobileList>
  );
}
