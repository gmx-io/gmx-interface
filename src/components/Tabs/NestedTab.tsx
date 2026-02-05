import { FloatingPortal, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";

import Button from "components/Button/Button";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { NestedOption } from "./types";

type Props<V extends string | number> = {
  option: NestedOption<V>;
  selectedValue: V | undefined;
  commonOptionClassname?: string;
  onOptionClick: ((value: V) => void) | undefined;
  qa?: string;
  type?: "inline" | "block" | "inline-primary" | "pills";
};

export default function NestedTab<V extends string | number>({
  option,
  selectedValue,
  commonOptionClassname,
  onOptionClick,
  qa,
  type,
}: Props<V>) {
  const { refs, floatingStyles } = useFloating({
    middleware: [flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const selectedSubOption = option.options.find((opt) => opt.value === selectedValue);

  const label = selectedSubOption ? selectedSubOption.label || selectedSubOption.value : t`More`;

  const isPills = type === "pills";

  return (
    <Menu as="div" className="flex items-center justify-center gap-8">
      <Menu.Button as="div" ref={refs.setReference} data-qa={qa ? `${qa}-tab-${option.label}` : undefined}>
        {isPills ? (
          <button
            type="button"
            className={cx(
              "text-body-medium flex items-center gap-4 rounded-full border px-12 py-6 font-medium transition-colors",
              commonOptionClassname,
              {
                "border-slate-600 bg-slate-800 text-typography-primary": selectedSubOption,
                "bg-transparent border-slate-600 text-typography-secondary hover:text-typography-primary":
                  !selectedSubOption,
              }
            )}
          >
            <span>{label}</span>
            <ChevronDownIcon className="size-16" />
          </button>
        ) : (
          <Button
            variant="ghost"
            className={cx({ "!bg-button-secondary !text-typography-primary": selectedSubOption })}
          >
            <span>{label}</span>
            <ChevronDownIcon className="mt-1 size-16" />
          </Button>
        )}
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          className="z-[1000] mt-8 overflow-hidden rounded-8 border border-slate-600 bg-slate-900 outline-none"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          {option.options.map((subOpt) => {
            return (
              <Menu.Item
                as="div"
                key={subOpt.value}
                className={cx(
                  "text-body-medium cursor-pointer p-8 font-medium text-typography-secondary hover:bg-fill-surfaceHover hover:text-typography-primary",
                  { "text-typography-primary": subOpt.value === selectedValue },
                  commonOptionClassname
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
