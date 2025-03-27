import { Listbox } from "@headlessui/react";
import cx from "classnames";
import { BiChevronDown } from "react-icons/bi";

export const Selector = <V, T>({
  value,
  onChange,
  button,
  options,
  item: Item,
  itemKey,
  placeholder,
}: {
  value: V | undefined;
  onChange: (value: V) => void;
  button: React.JSX.Element | undefined;
  options: T[];
  item: ({ option }: { option: T }) => React.JSX.Element;
  itemKey: (option: T) => string;
  placeholder?: string;
}) => {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="text-body-large flex w-full items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700">
          {value === undefined ? <div className="text-slate-100">{placeholder}</div> : button}
          <BiChevronDown className="size-20 text-slate-100" />
        </Listbox.Button>
        <Listbox.Options className="absolute left-0 right-0 top-full z-10 mt-4 overflow-auto rounded-4 bg-cold-blue-900 px-0 py-8">
          {options.map((option) => (
            <Listbox.Option
              key={itemKey(option)}
              value={itemKey(option)}
              className={({ active, selected }) =>
                cx(
                  "text-body-large cursor-pointer px-14 py-8",

                  (active || selected) && "bg-cold-blue-700"
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
