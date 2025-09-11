import cx from "classnames";
import { PropsWithChildren, forwardRef } from "react";

import "./Table.scss";

type Padding = "all" | "compact" | "compact-one-column";

interface TableTdThProps extends PropsWithChildren, React.HTMLProps<HTMLTableCellElement> {
  padding?: Padding;
}

export function Table(props: PropsWithChildren & React.HTMLProps<HTMLTableElement>) {
  return <table {...props} className={cx("w-full bg-slate-900", props.className)} />;
}
export function TableTh(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;

  return (
    <th
      {...rest}
      className={cx("text-caption text-left last-of-type:text-right", props.className, {
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
      className={cx("odd:bg-fill-surfaceElevated50", className, {
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
  return <tr {...props} ref={ref} className={cx("odd:bg-fill-surfaceElevated50", className)} />;
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
        "group text-[13px] last-of-type:[&:not(:first-of-type)]:text-right",
        "p-0 pb-4 first:pl-8 last:pr-8",
        className
      )}
    >
      <div
        className={`flex h-60 items-center bg-fill-surfaceElevated50 px-12 py-10
      group-first:rounded-l-8 group-last:rounded-r-8 group-hover:bg-fill-surfaceHover`}
      >
        {props.children}
      </div>
    </td>
  );
});

export function TableTd(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;
  return (
    <td
      {...rest}
      className={cx("text-[13px] last-of-type:[&:not(:first-of-type)]:text-right", props.className, {
        "px-4 py-8 first-of-type:pl-20 last-of-type:pr-20": padding === "all",
        "px-4 py-8 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",
        "px-8 py-8": padding === "compact-one-column",
      })}
    />
  );
}
