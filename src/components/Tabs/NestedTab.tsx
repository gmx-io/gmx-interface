import { FloatingPortal, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import { FiChevronDown } from "react-icons/fi";

import Button from "components/Button/Button";

import { NestedOption } from "./types";

type Props<V extends string | number> = {
  option: NestedOption<V>;
  selectedValue: V | undefined;
  commonOptionClassname?: string;
  onOptionClick: ((value: V) => void) | undefined;
  qa?: string;
};

export default function NestedTab<V extends string | number>({
  option,
  selectedValue,
  commonOptionClassname,
  onOptionClick,
  qa,
}: Props<V>) {
  const { refs, floatingStyles } = useFloating({
    middleware: [flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const selectedSubOption = option.options.find((opt) => opt.value === selectedValue);

  const label = selectedSubOption ? selectedSubOption.label || selectedSubOption.value : t`More`;

  return (
    <Menu as="div" className="flex items-center justify-center gap-8">
      <Menu.Button as="div" ref={refs.setReference} data-qa={qa ? `${qa}-tab-${option.label}` : undefined}>
        <Button variant="ghost" className={cx({ "!bg-button-secondary !text-textIcon-strong": selectedSubOption })}>
          <span>{label}</span>

          <FiChevronDown size={16} className="mt-1" />
        </Button>
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
                  "text-body-medium cursor-pointer p-8 font-medium text-slate-100 hover:bg-fill-surfaceHover hover:text-textIcon-strong",
                  { "text-textIcon-strong": subOpt.value === selectedValue },
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
