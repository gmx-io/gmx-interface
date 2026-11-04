import cx from "classnames";
import { PropsWithChildren, forwardRef } from "react";

import "./Table.scss";

type Padding = "all" | "compact" | "compact-one-column";

interface TableTdThProps extends PropsWithChildren, React.HTMLProps<HTMLTableCellElement> {
  padding?: Padding;
}

export function Table(props: PropsWithChildren & React.HTMLProps<HTMLTableElement>) {
  return <table {...props} className={cx("w-full bg-fill-surfaceBase", props.className)} />;
}
export function TableTh(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;

  return (
    <th
      {...rest}
      className={cx("TableTh text-caption text-left last-of-type:text-right", props.className, {
        TableTh_compact: padding === "compact",
        TableTh_compactOneColumn: padding === "compact-one-column",
        "px-4 py-12 pb-8 first-of-type:pl-20 last-of-type:pr-20": padding === "all",
        "px-4 py-8 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",
        "px-8 py-8": padding === "compact-one-column",
      })}
    />
  );
}

export function TableTheadTr({ ...props }: PropsWithChildren & React.HTMLProps<HTMLTableRowElement>) {
  return <tr {...props} className={props.className} />;
}

export const TableTr = forwardRef<
  HTMLTableRowElement,
  PropsWithChildren<{ hoverable?: boolean }> & React.HTMLProps<HTMLTableRowElement>
>(function TableTrInternal({ hoverable = false, className, ...props }, ref) {
  return (
    <tr
      {...props}
      ref={ref}
      className={cx("TableTr", className, {
        TableTr_hoverable: hoverable,
        "cursor-pointer": !!props.onClick,
      })}
    />
  );
});

export const TableTrActionable = forwardRef<
  HTMLTableRowElement,
  PropsWithChildren<{ onClick: (event: React.MouseEvent) => void }> & React.HTMLProps<HTMLTableRowElement>
>(function TableTrInternal({ className, ...props }, ref) {
  return <tr {...props} ref={ref} className={cx("TableTr TableTr_actionable group/tr", className)} />;
});

export const TableTdActionable = forwardRef<
  HTMLTableCellElement,
  PropsWithChildren & React.HTMLProps<HTMLTableCellElement>
>(function TableTdInternal({ className, ...props }, ref) {
  return (
    <td
      {...props}
      ref={ref}
      className={cx(
        "text-body-medium relative select-none last-of-type:[&:not(:first-of-type)]:text-right",
        "px-4 py-16 first-of-type:pl-20 last-of-type:pr-20",
        "before:absolute before:inset-0 before:z-0 before:content-[''] group-hover/tr:before:bg-fill-surfaceHover",
        className
      )}
    >
      <div className="z-1 relative">{props.children}</div>
    </td>
  );
});

export function TableTd(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;
  return (
    <td
      {...rest}
      className={cx("text-body-medium last-of-type:[&:not(:first-of-type)]:text-right", props.className, {
        "px-4 py-16 first-of-type:pl-20 last-of-type:pr-20": padding === "all",
        "TableTd_compact px-4 py-12 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",
        "TableTd_compactOneColumn px-8 py-12": padding === "compact-one-column",
      })}
    />
  );
}
