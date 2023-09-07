import { ReactElement, ReactNode } from "react";

export type TableHeader = {
  title: string;
  className?: string;
  tooltip?: string | (() => ReactNode);
  onClick?: () => void;
  width?: number;
};

export type TableProps<T extends Record<string, any>> = {
  isLoading: boolean;
  error: Error | null;
  content: T[];
  titles: { [key in keyof T]?: TableHeader };
  rowKey: keyof T;
};

export type TableCellData = {
  value: string | number | ((breakpoint?: string) => ReactElement | string | null);
  className?: string;
};

export type TableCell = string | number | TableCellData;

export type TableCellProps = {
  data: TableCell;
  breakpoint?: string;
};
