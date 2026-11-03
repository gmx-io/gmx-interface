import cx from "classnames";
import { PropsWithChildren } from "react";

type GridRowProps = PropsWithChildren<{ className?: string; onClick?: () => void }>;
type GridCellProps = PropsWithChildren<{ className?: string }>;

export function GridRow({ children, className, onClick }: GridRowProps) {
  return (
    <div
      role="row"
      className={cx("TableTr group/row col-span-full grid grid-cols-subgrid", className, {
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
        "text-body-small last-of-type:[&:not(:first-of-type)]:text-right",
        "px-4 py-16 first-of-type:pl-adaptive last-of-type:pr-adaptive",
        "group-hover/row:bg-fill-surfaceHover",
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
        "text-caption text-left last-of-type:text-right",
        "px-4 py-12 pb-8 first-of-type:pl-adaptive last-of-type:pr-adaptive",
        className
      )}
    >
      {children}
    </div>
  );
}
