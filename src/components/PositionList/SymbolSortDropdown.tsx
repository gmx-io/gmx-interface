import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode } from "react";

import type { SortDirection } from "context/SorterContext/types";

import { directionIconMap } from "components/Sorter/Sorter";

type Props = {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
};

const sortOptions: Array<{ direction: SortDirection; label: ReactNode }> = [
  { direction: "unspecified", label: <Trans>Default sorting</Trans> },
  { direction: "asc", label: <Trans>Symbol (A to Z)</Trans> },
  { direction: "desc", label: <Trans>Symbol (Z to A)</Trans> },
];

export function SymbolSortDropdown({ direction, onChange }: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset({ mainAxis: 8 }), flip(), shift()],
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  const isActive = direction !== "unspecified";
  const Icon = directionIconMap[direction];

  return (
    <Menu>
      <Menu.Button
        as="button"
        ref={refs.setReference}
        className={cx("group/sorter inline-flex items-center [text-align:inherit] [text-transform:inherit]", {
          "text-blue-300": isActive,
        })}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Trans>POSITION</Trans>
        <Icon
          className={cx("h-16 w-12", {
            "opacity-0 transition-opacity group-hover/sorter:opacity-100": !isActive,
          })}
        />
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items as="div" className="menu-items !w-max" ref={refs.setFloating} style={floatingStyles}>
          {sortOptions.map((opt) => {
            const OptIcon = directionIconMap[opt.direction];
            return (
              <Menu.Item key={opt.direction}>
                <div
                  className={cx("menu-item", { "!text-blue-300": direction === opt.direction })}
                  onClick={() => onChange(opt.direction)}
                >
                  <OptIcon className="h-16 w-12" />
                  <p>{opt.label}</p>
                </div>
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}
