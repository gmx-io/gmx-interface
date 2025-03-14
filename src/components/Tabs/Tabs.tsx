import cx from "classnames";
import { ReactNode } from "react";
import { Menu } from "@headlessui/react";
import { t } from "@lingui/macro";
import { FloatingPortal, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { BiChevronDown } from "react-icons/bi";

import "./Tabs.css";

type BaseOptionValue = string | number;

type RegularOption<V extends BaseOptionValue> = {
  label?: string | ReactNode;
  className?: {
    active?: string;
    regular?: string;
  };
  icon?: ReactNode;
  value: V;
};

type NestedOption<V extends BaseOptionValue> = {
  label: string | ReactNode;
  options: RegularOption<V>[];
};

type Option<V extends BaseOptionValue> = RegularOption<V> | NestedOption<V>;

type Props<V extends BaseOptionValue> = {
  options: Option<V>[];
  selectedValue: V | null;
  onChange?: (value: V) => void;
  size?: "l" | "m";
  type?: "inline" | "block";
  className?: string;
  regularOptionClassname?: string;
  qa?: string;
};

export default function Tabs<V extends string | number>({
  options,
  selectedValue,
  onChange,
  size = "m",
  type = "block",
  className,
  regularOptionClassname,
  qa,
}: Props<V>) {
  return (
    <div data-qa={qa} className={cx("Tab", `Tab__${type}`, `Tab__${size}`, className)}>
      {options.map((opt) =>
        isNestedOption(opt) ? (
          <NestedTab key={opt.label?.toString()} option={opt} selectedValue={selectedValue} onOptionClick={onChange} />
        ) : (
          <RegularTab
            key={opt.value}
            option={opt}
            selectedValue={selectedValue}
            onOptionClick={onChange}
            regularOptionClassname={regularOptionClassname}
          />
        )
      )}
    </div>
  );
}

function isNestedOption<V extends string | number>(option: Option<V>): option is NestedOption<V> {
  return "options" in option;
}

type NestedTabProps<V extends string | number> = {
  option: NestedOption<V>;
  selectedValue: V | null;
  commonOptionClassname?: string;
  onOptionClick: ((value: V) => void) | undefined;
  qa?: string;
};

function NestedTab<V extends string | number>({
  option,
  selectedValue,
  commonOptionClassname,
  onOptionClick,
  qa,
}: NestedTabProps<V>) {
  const { refs, floatingStyles } = useFloating({
    middleware: [flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const selectedSubOption = option.options.find((opt) => opt.value === selectedValue);

  const label = selectedSubOption ? selectedSubOption.label || selectedSubOption.value : t`More`;

  return (
    <Menu as="div" className="Tab-option flex items-center justify-center gap-8">
      <Menu.Button
        as="div"
        className={cx("flex cursor-pointer items-center justify-center", commonOptionClassname, {
          "text-white": !!selectedSubOption,
        })}
        ref={refs.setReference}
        data-qa={qa ? `${qa}-tab-${option.label}` : undefined}
      >
        {label}

        <BiChevronDown size={16} />
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          className="z-10 mt-8 rounded-4 border border-gray-800 bg-slate-800 outline-none"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          {option.options.map((subOpt) => {
            return (
              <Menu.Item
                as="div"
                key={subOpt.value}
                className={cx(
                  "hover:bg-dark-blue-hover text-body-medium cursor-pointer p-8 text-slate-100 hover:rounded-4 hover:text-white",
                  { "text-white": subOpt.value === selectedValue }
                )}
                onClick={() => onOptionClick?.(subOpt.value)}
              >
                {subOpt.label ?? subOpt.value}
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}

type RegularTabProps<V extends string | number> = {
  option: RegularOption<V>;
  selectedValue: V | null;
  onOptionClick: ((value: V) => void) | undefined;
  regularOptionClassname?: string;
  qa?: string;
};

function RegularTab<V extends string | number>({
  option,
  selectedValue,
  onOptionClick,
  regularOptionClassname,
  qa,
}: RegularTabProps<V>) {
  const isActive = option.value === selectedValue;
  const label = option.label || option.value;
  const optionClassName = isActive ? option.className?.active : option.className?.regular;

  return (
    <div
      className={cx("Tab-option flex items-center justify-center gap-8", optionClassName, regularOptionClassname, {
        active: isActive,
      })}
      onClick={() => onOptionClick?.(option.value)}
      key={option.value}
      data-qa={qa ? `${qa}-tab-${option.value}` : undefined}
    >
      {option.icon && <span className="mt-2 scale-75 opacity-70">{option.icon}</span>}
      {label}
    </div>
  );
}
