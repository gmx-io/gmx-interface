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
}
