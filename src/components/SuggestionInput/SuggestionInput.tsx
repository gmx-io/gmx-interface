import {
  autoUpdate,
  flip,
  offset,
  Placement,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import cx from "classnames";
import { ChangeEvent, KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import NumberInput from "components/NumberInput/NumberInput";
import Portal from "components/Portal/Portal";

import "./SuggestionInput.scss";

type Props = {
  inputId?: string;
  value?: string;
  setValue?: (value: string) => void;
  placeholder?: string;
  suggestionList?: number[];
  suffix?: string;
  isError?: boolean;
  inputClassName?: string;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
  label?: React.ReactNode;
  onPanelVisibleChange?: (isPanelVisible: boolean) => void;
  suggestionWithSuffix?: boolean;
  suggestionsPlacement?: Placement;
  disabled?: boolean;
};

export default function SuggestionInput({
  placeholder,
  value,
  setValue,
  suggestionList,
  suffix,
  isError,
  inputClassName,
  onBlur,
  onKeyDown,
  className,
  label,
  onPanelVisibleChange,
  inputId,
  suggestionWithSuffix,
  suggestionsPlacement = "bottom-end",
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  useEffect(() => {
    if (onPanelVisibleChange) {
      onPanelVisibleChange(isPanelVisible);
    }
  }, [isPanelVisible, onPanelVisibleChange]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (setValue) {
        setValue(event.target.value);
      }
    },
    [setValue]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: number) => {
      if (setValue) {
        setValue(suggestion.toString());
        setIsPanelVisible(false);
      }
    },
    [setValue]
  );

  const handleBlur = useCallback(() => {
    setIsPanelVisible(false);
    onBlur?.();
  }, [onBlur]);

  const handleReferencePointerDown = useCallback(
    (e: PointerEvent<Element>) => {
      if (disabled) return;
      e.stopPropagation();
      inputRef.current?.focus();
      setIsPanelVisible(true);
    },
    [disabled]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        target.blur();
      } else if (e.key === "Escape") {
        target.blur();
      } else {
        onKeyDown?.(e);
      }
    },
    [onKeyDown]
  );

  const { refs, floatingStyles, context } = useFloating({
    open: isPanelVisible,
    onOpenChange: setIsPanelVisible,
    middleware: [offset(4), flip(), shift()],
    placement: suggestionsPlacement,
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context)]);

  return (
    <div className="Suggestion-input-wrapper">
      <div
        className={cx("Suggestion-input flex items-baseline", className, {
          "input-error": isError,
          "pr-6": !suffix,
          "cursor-default opacity-50": disabled,
        })}
        ref={refs.setReference}
        {...getReferenceProps({ onPointerDown: handleReferencePointerDown })}
      >
        {label ? <span className="pl-7 pr-7 text-typography-secondary">{label}</span> : null}
        <NumberInput
          inputId={inputId}
          inputRef={inputRef}
          className={cx(inputClassName, "min-w-0 text-right outline-none")}
          onFocus={() => !disabled && setIsPanelVisible(true)}
          onBlur={handleBlur}
          value={value ?? ""}
          placeholder={placeholder}
          onValueChange={handleChange}
          onKeyDown={handleKeyDown}
          isDisabled={disabled}
        />
        {suffix && (
          <div className="pr-7 text-typography-secondary">
            <span>{suffix}</span>
          </div>
        )}
      </div>
      {suggestionList && isPanelVisible && (
        <Portal>
          <div className="z-[1000]" ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            <ul className="Suggestion-list">
              {suggestionList.map((suggestion) => (
                <li key={suggestion} onPointerDown={() => handleSuggestionClick(suggestion)}>
                  {suggestion}
                  {suggestionWithSuffix ? suffix : "%"}
                </li>
              ))}
            </ul>
          </div>
        </Portal>
      )}
    </div>
  );
}
