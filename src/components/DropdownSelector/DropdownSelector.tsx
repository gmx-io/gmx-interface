import { Listbox } from "@headlessui/react";
import cx from "classnames";

import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

type Primitive = string | number;
type WithConditionalItemKey<Id extends Primitive, Option> = Id extends Primitive
  ? { itemKey?: (option: Option) => Id }
  : { itemKey: (option: Option) => Id };

export const DropdownSelector = <Id extends Primitive, Option>({
  value,
  onChange,
  button,
  options,
  item: Item,
  itemKey,
  placeholder,
  slim = false,
  variant,
  itemDisabled,
  itemDisabledMessage,
}: {
  value: Id | undefined;
  onChange: (value: Id) => void;
  button: React.JSX.Element | undefined;
  options: Option[];
  item: ({ option }: { option: Option }) => React.JSX.Element;
  placeholder?: string;
  slim?: boolean;
  variant?: "ghost";
  itemDisabled?: (option: Option) => boolean;
  itemDisabledMessage?: (option: Option) => string;
} & WithConditionalItemKey<Id, Option>) => {
  return (
    <Listbox value={value ?? null} onChange={onChange}>
      <div className="relative">
        <Listbox.Button
          className={({ open }) =>
            cx(
              "flex w-full items-center justify-between rounded-8",
              slim ? "text-body-medium p-4" : "px-14 py-13 text-16 leading-base",
              variant === "ghost"
                ? "border"
                : "border bg-slate-800 hover:bg-fill-surfaceElevatedHover active:bg-fill-surfaceElevated50",
              variant !== "ghost" && (open ? "group border-blue-300" : "border-slate-800"),
              variant === "ghost" && (open ? "group border-blue-300" : "border-[transparent]")
            )
          }
        >
          {value === undefined ? <div className="text-typography-primary">{placeholder}</div> : button}
          <ChevronDownIcon className="size-20 group-aria-expanded:text-blue-300" />
        </Listbox.Button>
        <Listbox.Options
          className={cx(
            "absolute left-0 right-0 top-full z-10 mt-4 overflow-auto rounded-8 px-0",
            slim ? "" : "py-8",
            "border-1/2 border-slate-600 bg-slate-800"
          )}
        >
          {options.map((option) => {
            const isDisabled = itemDisabled?.(option);
            const disabledMessage = itemDisabledMessage?.(option);
            const Wrapper = isDisabled && disabledMessage ? TooltipWithPortal : NoopWrapper;

            return (
              <Listbox.Option
                key={itemKey ? itemKey(option) : (option as Primitive)}
                value={itemKey ? itemKey(option) : (option as Primitive)}
                className="p-0"
                disabled={isDisabled}
              >
                {({ active, selected, disabled }) => (
                  <Wrapper variant="none" as="div" position="bottom" content={disabledMessage}>
                    <div
                      className={cx(
                        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        slim ? "text-body-medium p-4" : "text-body-large px-14 py-8",
                        (active || selected) && "bg-fill-surfaceHover"
                      )}
                    >
                      <Item option={option} />
                    </div>
                  </Wrapper>
                )}
              </Listbox.Option>
            );
          })}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};
