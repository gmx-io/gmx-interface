import { Listbox } from "@headlessui/react";
import cx from "classnames";
import { BiChevronDown } from "react-icons/bi";

export const DropdownSelector = <V extends string | number, T>({
  value,
  onChange,
  button,
  options,
  item: Item,
  itemKey,
  placeholder,
  slim = false,
  elevated = false,
}: {
  value: V | undefined;
  onChange: (value: V) => void;
  button: React.JSX.Element | undefined;
  options: T[];
  item: ({ option }: { option: T }) => React.JSX.Element;
  placeholder?: string;
  slim?: boolean;
  elevated?: boolean;
} & (V extends string | number ? { itemKey?: (option: T) => V } : { itemKey: (option: T) => V })) => {
  return (
    <Listbox value={value ?? null} onChange={onChange}>
      <div className="relative">
        <Listbox.Button
          className={cx(
            "flex w-full items-center justify-between rounded-4",
            slim ? "text-body-medium p-4" : "text-body-large px-14 py-12",
            elevated
              ? "bg-cold-blue-700 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-500"
              : "bg-cold-blue-900 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700"
          )}
        >
          {value === undefined ? <div className="text-slate-100">{placeholder}</div> : button}
          <BiChevronDown className="size-20 text-slate-100" />
        </Listbox.Button>
        <Listbox.Options
          className={cx(
            "absolute left-0 right-0 top-full z-10 mt-4 overflow-auto rounded-4 px-0",
            slim ? "" : "py-8",
            elevated ? "bg-cold-blue-700" : "border border-slate-600 bg-slate-700"
          )}
        >
          {options.map((option) => (
            <Listbox.Option
              key={itemKey ? itemKey(option) : (option as string | number)}
              value={itemKey ? itemKey(option) : (option as string | number)}
              className={({ active, selected }) =>
                cx(
                  "cursor-pointer",
                  slim ? "text-body-medium p-4" : "text-body-large px-14 py-8",
                  (active || selected) && (elevated ? "bg-cold-blue-500" : "bg-slate-600")
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
