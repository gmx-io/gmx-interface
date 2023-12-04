import { TooltipPosition } from "components/Tooltip/Tooltip";
import { ReactElement, ReactNode } from "react";

export type TableHeader = {
  title: string;
  className?: string;
  tooltip?: string | (() => ReactNode);
  tooltipPosition?: TooltipPosition;
  onClick?: () => void;
  width?: number | ((breakpoint?: string) => number);
};

export type TableProps<T extends Record<string, any>> = {
  isLoading: boolean;
  error: Error | null;
  content: T[];
  titles: { [key in keyof T]?: TableHeader };
  rowKey: keyof T;
  className?: string;
};

export type TableCellData = {
  value: string | number | ((breakpoint?: string) => ReactElement | string | null);
  className?: string;
};

export type TableCell = string | number | TableCellData;

export type TableHeaderProps = {
  data: TableHeader;
  breakpoint?: string;
};

export type TableCellProps = {
  data: TableCell;
  breakpoint?: string;
};
