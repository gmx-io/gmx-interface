import { Listbox } from "@headlessui/react";
import cx from "classnames";
import { BiChevronDown } from "react-icons/bi";

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
}: {
  value: Id | undefined;
  onChange: (value: Id) => void;
  button: React.JSX.Element | undefined;
  options: Option[];
  item: ({ option }: { option: Option }) => React.JSX.Element;
  placeholder?: string;
  slim?: boolean;
  variant?: "ghost";
} & WithConditionalItemKey<Id, Option>) => {
  return (
    <Listbox value={value ?? null} onChange={onChange}>
      <div className="relative">
        <Listbox.Button
          className={({ open }) =>
            cx(
              "flex w-full items-center justify-between rounded-8",
              slim ? "text-body-medium p-4" : "text-body-large px-14 py-12",
              variant === "ghost"
                ? "border"
                : "border bg-slate-800 hover:bg-fill-surfaceElevatedHover active:bg-fill-surfaceElevated50",
              variant !== "ghost" && (open ? "group border-blue-300" : "border-slate-800"),
              variant === "ghost" && (open ? "group border-blue-300" : "border-[transparent]")
            )
          }
        >
          {value === undefined ? <div className="text-typography-primary">{placeholder}</div> : button}
          <BiChevronDown className="size-20 group-aria-expanded:text-blue-300" />
        </Listbox.Button>
        <Listbox.Options
          className={cx(
            "absolute left-0 right-0 top-full z-10 mt-4 overflow-auto rounded-8 px-0",
            slim ? "" : "py-8",
            "border-1/2 border-slate-600 bg-slate-800"
          )}
        >
          {options.map((option) => (
            <Listbox.Option
              key={itemKey ? itemKey(option) : (option as Primitive)}
              value={itemKey ? itemKey(option) : (option as Primitive)}
              className={({ active, selected }) =>
                cx(
                  "cursor-pointer",
                  slim ? "text-body-medium p-4" : "text-body-large px-14 py-8",
                  (active || selected) && (variant === "ghost" ? "bg-fill-surfaceHover" : "bg-fill-surfaceHover")
                )
              }
            >
              <Item option={option} />
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};
