import { ReactElement } from "react";

export type TableHeader = {
  title: string;
  className?: string;
  tooltip?: string;
  onClick?: () => void;
};

export type TableProps<T extends Record<string, any>> = {
  isLoading: boolean;
  error: Error | null;
  content: Array<T>;
  titles: {[key in keyof T]?: TableHeader};
  rowKey: keyof T;
};

export type TableCellData = {
  value: string | number;
  className?: string;
  render?: (value?: string | number) => ReactElement | string | null;
};

export type TableCell = string | number | TableCellData;

export type TableCellProps = {
  data: TableCell;
};
