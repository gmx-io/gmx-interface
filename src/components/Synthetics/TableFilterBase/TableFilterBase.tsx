import { FloatingPortal, Placement, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { PropsWithChildren } from "react";

import Button from "components/Button/Button";

import { ReactComponent as FilterIcon } from "img/ic_filter.svg";

import "./TableFilterBase.scss";

export type TableFilterBaseProps = PropsWithChildren<{
  label: string;
  isActive?: boolean;
  popupPlacement?: Placement;
  asButton?: boolean;
}>;

const DEFAULT_TABLE_FILTER_POPUP_PLACEMENT: Placement = "bottom";

const AS_BUTTON_PROPS = {
  as: Button,
  variant: "secondary",
  refName: "buttonRef",
};

const AS_DEFAULT_PROPS = {
  as: "div",
};

export function TableFilterBase({ popupPlacement, isActive, label, children, asButton }: TableFilterBaseProps) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(10), flip(), shift()],
    strategy: "fixed",
    placement: popupPlacement || DEFAULT_TABLE_FILTER_POPUP_PLACEMENT,
    whileElementsMounted: autoUpdate,
  });

  return (
    <>
      <Popover>
        {/* @ts-ignore */}
        <Popover.Button
          {...(asButton ? AS_BUTTON_PROPS : AS_DEFAULT_PROPS)}
          ref={refs.setReference}
          className={cx("TableFilterBase-filter", {
            active: isActive,
          })}
        >
          {label}
          <FilterIcon />
        </Popover.Button>
        <FloatingPortal>
          <Popover.Panel ref={refs.setFloating} style={floatingStyles} className="TableFilterBase-filter-popover">
            {children}
          </Popover.Panel>
        </FloatingPortal>
      </Popover>
    </>
  );
}
