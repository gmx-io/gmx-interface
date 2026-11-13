import cx from "classnames";
import { PropsWithChildren } from "react";

import "components/Table/Table.scss";

type GridRowProps = PropsWithChildren<{ className?: string; onClick?: () => void; hoverable?: boolean }>;
type GridCellProps = PropsWithChildren<{ className?: string }>;

export function GridRow({ children, className, onClick, hoverable = true }: GridRowProps) {
  return (
    <div
      role="row"
      className={cx("TableTr col-span-full grid grid-cols-subgrid", className, {
        TableTr_hoverable: hoverable,
        "cursor-pointer": !!onClick,
      })}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function GridCell({ children, className }: GridCellProps) {
  return (
    <div
      role="cell"
      className={cx(
        "text-body-medium last-of-type:[&:not(:first-of-type)]:text-right",
        "px-4 py-16 first-of-type:pl-adaptive last-of-type:pr-adaptive",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GridHeaderCell({ children, className }: GridCellProps) {
  return (
    <div
      role="columnheader"
      className={cx(
        "TableTh text-caption whitespace-nowrap text-left last-of-type:text-right",
        "px-4 py-12 pb-8 first-of-type:pl-adaptive last-of-type:pr-adaptive",
        className
      )}
    >
      {children}
    </div>
  );
}
