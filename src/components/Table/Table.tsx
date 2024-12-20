import cx from "classnames";
import { PropsWithChildren, forwardRef } from "react";

type Padding = "all" | "compact" | "compact-one-column";

interface TableTdThProps extends PropsWithChildren, React.HTMLProps<HTMLTableCellElement> {
  padding?: Padding;
}

export function Table(props: PropsWithChildren & React.HTMLProps<HTMLTableElement>) {
  return <table {...props} className={cx("w-full rounded-4 bg-slate-800", props.className)} />;
}
export function TableTh(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;

  return (
    <th
      {...rest}
      className={cx("text-left font-normal uppercase text-gray-300 last-of-type:text-right", props.className, {
        "px-4 py-12 first-of-type:pl-16 last-of-type:pr-16": padding === "all",
        "px-4 py-8 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",
        "px-8 py-8": padding === "compact-one-column",
      })}
    />
  );
}

export function TableTheadTr({
  bordered,
  ...props
}: PropsWithChildren<{ bordered?: boolean }> & React.HTMLProps<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className={cx(props.className, {
        "border-b border-slate-700": bordered,
      })}
    />
  );
}

export const TableTr = forwardRef<
  HTMLTableRowElement,
  PropsWithChildren<{ hoverable?: boolean; bordered?: boolean }> & React.HTMLProps<HTMLTableRowElement>
>(function TableTrInternal({ hoverable = true, bordered = true, className, ...props }, ref) {
  return (
    <tr
      {...props}
      ref={ref}
      className={cx(className, {
        "border-b border-slate-700 last-of-type:border-b-0": bordered,
        "hover:bg-cold-blue-900": hoverable,
        "cursor-pointer": !!props.onClick,
      })}
    />
  );
});

export function TableTd(props: TableTdThProps) {
  const { padding = "all", ...rest } = props;
  return (
    <td
      {...rest}
      className={cx("last-of-type:[&:not(:first-of-type)]:text-right", props.className, {
        "px-4 py-12 first-of-type:pl-16 last-of-type:pr-16": padding === "all",
        "px-4 py-8 first-of-type:pl-12 last-of-type:pr-12": padding === "compact",
        "px-8 py-8": padding === "compact-one-column",
      })}
    />
  );
}
