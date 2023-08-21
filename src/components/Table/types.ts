export type TableHeader = {
  title: string;
  className?: string;
  tooltip?: string;
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
  linkTo?: string;
  target?: string;
  isAddress?: boolean;
};

export type TableCell = string | number | TableCellData | Array<TableCellData>;

export type TableCellProps = {
  data: TableCell;
};
