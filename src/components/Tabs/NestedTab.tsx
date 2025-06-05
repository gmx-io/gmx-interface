import { FloatingPortal, autoUpdate, flip, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import { FiChevronDown } from "react-icons/fi";

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
      <Menu.Button
        as="div"
        className={cx(`flex cursor-pointer items-center justify-center px-12
          py-8 rounded-8 text-slate-100 hover:text-white gap-2 font-medium`, commonOptionClassname, {
          "text-white bg-cold-blue-900": !!selectedSubOption,
        })}
        ref={refs.setReference}
        data-qa={qa ? `${qa}-tab-${option.label}` : undefined}
      >
        <span>{label}</span>

        <FiChevronDown size={16} className="mt-1" />
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          className="z-[1000] mt-8 rounded-8 border border-stroke-primary overflow-hidden bg-slate-800 outline-none"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          {option.options.map((subOpt) => {
            return (
              <Menu.Item
                as="div"
                key={subOpt.value}
                className={cx(
                  "hover:bg-new-gray-200 text-body-medium cursor-pointer p-8 text-slate-100 hover:text-white",
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
