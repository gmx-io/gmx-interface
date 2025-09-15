import cx from "classnames";
import { ReactNode } from "react";

import NestedTab from "./NestedTab";
import RegularTab from "./RegularTab";
import { isNestedOption, Option, BaseOptionValue } from "./types";

import "./Tabs.css";

type Props<V extends BaseOptionValue> = {
  options: Option<V>[];
  selectedValue: V | undefined;
  onChange?: (value: V) => void;
  size?: "l" | "m";
  type?: "inline" | "block" | "inline-primary";
  className?: string;
  regularOptionClassname?: string;
  qa?: string;
  rightContent?: ReactNode;
};

export default function Tabs<V extends string | number>({
  options,
  selectedValue,
  onChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  size = "m",
  type = "block",
  className,
  regularOptionClassname,
  qa,
  rightContent,
}: Props<V>) {
  return (
    <div
      data-qa={qa}
      className={cx(
        "flex items-center justify-between",
        {
          "rounded-t-8 border-b-1/2 border-b-slate-600": type === "block",
        },
        className
      )}
    >
      <div
        className={cx("flex w-full", {
          "gap-8": type === "inline" || type === "inline-primary",
        })}
      >
        {options.map((opt) =>
          isNestedOption(opt) ? (
            <NestedTab
              key={opt.label?.toString()}
              option={opt}
              selectedValue={selectedValue}
              onOptionClick={onChange}
            />
          ) : (
            <RegularTab
              key={opt.value}
              option={opt}
              selectedValue={selectedValue}
              onOptionClick={onChange}
              regularOptionClassname={regularOptionClassname}
              type={type}
            />
          )
        )}
      </div>

      {rightContent}
    </div>
  );
}
