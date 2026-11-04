import cx from "classnames";

import Button from "components/Button/Button";
import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import { RegularOption } from "./types";

type Props<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | undefined;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
  type: "inline" | "block" | "inline-primary" | "underline" | "pill";
};

export default function RegularTab<V extends string | number>({
  option,
  selectedValue,
  onOptionClick,
  regularOptionClassname,
  qa,
  type,
}: Props<V>) {
  const isActive = option.value === selectedValue;
  const isDisabled = option.disabled;
  const label = option.label || option.value;
  const Wrap = isDisabled && option.disabledMessage ? StandardTooltip : NoopWrapper;

  const optionClassName = isActive ? option.className?.active : option.className?.regular;

  if (type === "inline-primary") {
    return (
      <Wrap content={option.disabledMessage} variant="none" isHandlerDisabled>
        <Button
          type="button"
          variant={isActive ? "primary" : "secondary"}
          onClick={() => !isDisabled && onOptionClick?.(option.value)}
          key={option.value}
          data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
          className={cx(optionClassName, regularOptionClassname, {
            "cursor-not-allowed opacity-50": isDisabled,
          })}
          disabled={isDisabled}
        >
          {option.icon}
          {label}
        </Button>
      </Wrap>
    );
  }

  if (type === "pill") {
    return (
      <Wrap content={option.disabledMessage} variant="none" isHandlerDisabled>
        <button
          type="button"
          onClick={() => !isDisabled && onOptionClick?.(option.value)}
          key={option.value}
          data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
          disabled={isDisabled}
          className={cx(
            "text-body-medium flex items-center justify-center gap-4 rounded-full border-1/2 px-12 py-4 font-medium transition-colors",
            optionClassName,
            regularOptionClassname,
            {
              "border-[transparent] bg-button-secondary text-textIcon-primary": isActive,
              "border-stroke-primary text-textIcon-secondary hover:border-textIcon-disabled hover:text-textIcon-primary":
                !isActive,
              "cursor-not-allowed opacity-50": isDisabled,
            }
          )}
        >
          {option.icon}
          {label}
        </button>
      </Wrap>
    );
  }

  if (type === "underline") {
    return (
      <Wrap content={option.disabledMessage} variant="none" isHandlerDisabled>
        <button
          type="button"
          onClick={() => !isDisabled && onOptionClick?.(option.value)}
          key={option.value}
          data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
          disabled={isDisabled}
          className={cx(
            `text-body-medium flex items-center justify-center gap-4 border-b-2 border-b-[transparent] px-4 py-8
            font-medium hover:text-textIcon-primary`,
            optionClassName,
            regularOptionClassname,
            {
              "border-b-blue-strong text-textIcon-primary": isActive,
              "text-textIcon-secondary": !isActive,
              "cursor-not-allowed opacity-50": isDisabled,
            }
          )}
        >
          {option.icon}
          {label}
        </button>
      </Wrap>
    );
  }

  if (type === "inline") {
    return (
      <Wrap content={option.disabledMessage} variant="none" isHandlerDisabled>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          onClick={() => !isDisabled && onOptionClick?.(option.value)}
          key={option.value}
          data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
          className={cx(optionClassName, regularOptionClassname, {
            "!text-textIcon-primary": isActive,
            "cursor-not-allowed opacity-50": isDisabled,
          })}
          disabled={isDisabled}
        >
          {option.icon}
          {label}
        </Button>
      </Wrap>
    );
  }

  return (
    <Wrap content={option.disabledMessage} variant="none" isHandlerDisabled>
      <button
        type="button"
        className={cx(
          `flex items-baseline justify-center gap-8 border-b-[2.5px] border-b-[transparent] px-20 pb-8 pt-12 font-medium
        first:rounded-tl-8 last:rounded-tr-8 hover:text-textIcon-primary max-smallMobile:px-12`,
          optionClassName,
          regularOptionClassname,
          {
            "border-b-blue-strong !text-textIcon-primary": isActive,
            "text-textIcon-secondary": !isActive,
            "cursor-not-allowed opacity-50": isDisabled,
          }
        )}
        onClick={() => !isDisabled && onOptionClick?.(option.value)}
        key={option.value}
        data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
        disabled={isDisabled}
      >
        {option.icon}
        {label}
      </button>
    </Wrap>
  );
}
