import { PropsWithChildren } from "react";

export function ExchangeTable(props: PropsWithChildren & React.HTMLProps<HTMLTableElement>) {
  return <table {...props} className="w-full rounded-4 bg-slate-800" />;
}
export function ExchangeTh(props: PropsWithChildren & React.HTMLProps<HTMLTableCellElement>) {
  return <th {...props} className="px-10 py-14 text-left font-normal uppercase text-gray-300 first:pl-14" />;
}
export function ExchangeTheadTr(props: PropsWithChildren & React.HTMLProps<HTMLTableRowElement>) {
  return <tr {...props} className="border-b border-slate-700" />;
}
export function ExchangeTr(props: PropsWithChildren & React.HTMLProps<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className="border-b border-slate-700
                 last:border-b-0
                 hover:bg-cold-blue-900"
    />
  );
}
export function ExchangeTd(props: PropsWithChildren & React.HTMLProps<HTMLTableCellElement>) {
  return <td {...props} className="px-10 py-14 first:pl-14" />;
}
