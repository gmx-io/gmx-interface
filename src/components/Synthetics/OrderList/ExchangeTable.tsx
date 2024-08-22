import cx from "classnames";
import { PropsWithChildren, forwardRef } from "react";

interface ExchangeTdThProps extends PropsWithChildren, React.HTMLProps<HTMLTableCellElement> {
  padding?: Padding;
}

export function ExchangeTable(props: PropsWithChildren & React.HTMLProps<HTMLTableElement>) {
  return <table {...props} className="w-full rounded-4 bg-slate-800" />;
}
export function ExchangeTh(props: ExchangeTdThProps) {
  const { padding = "all", ...rest } = props;

  return (
    <th
      {...rest}
      className={cx("text-left font-normal uppercase text-gray-300 last-of-type:text-right", props.className, {
        "px-10 py-14 first-of-type:pl-14 last-of-type:pr-14": padding === "all",
        "px-10 first-of-type:pl-14 last-of-type:pr-14": padding === "horizontal",
        "py-14": padding === "vertical",
        "p-0": padding === "none",
      })}
    />
  );
}
export function ExchangeTheadTr({
  bordered,
  ...props
}: PropsWithChildren<{ bordered?: boolean }> & React.HTMLProps<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className={cx({
        "border-b border-slate-700": bordered,
      })}
    />
  );
}
export const ExchangeTr = forwardRef<
  HTMLTableRowElement,
  PropsWithChildren<{ hoverable?: boolean; bordered?: boolean }> & React.HTMLProps<HTMLTableRowElement>
>(function ExchangeTrInternal({ hoverable = true, bordered = true, ...props }, ref) {
  return (
    <tr
      {...props}
      ref={ref}
      className={cx({
        "border-b border-slate-700 last-of-type:border-b-0": bordered,
        "hover:bg-cold-blue-900": hoverable,
      })}
    />
  );
});

type Padding = "all" | "horizontal" | "vertical" | "none";

export function ExchangeTd(props: ExchangeTdThProps) {
  const { padding = "all", ...rest } = props;
  return (
    <td
      {...rest}
      className={cx("last-of-type:[&:not(:first-of-type)]:text-right", props.className, {
        "px-10 py-14 first-of-type:pl-14 last-of-type:pr-14": padding === "all",
        "px-10 first-of-type:pl-14 last-of-type:pr-14": padding === "horizontal",
        "py-14": padding === "vertical",
        "p-0": padding === "none",
      })}
    />
  );
}
