export type TableHeader = {
  title: string;
  className?: string;
};

export type TableProps<T extends Record<string, any>> = {
  enumerate: boolean;
  enumerateFrom?: number;
  isLoading: boolean;
  error: Error | null;
  content: Array<T>;
  titles: {[key in keyof T]?: TableHeader};
  rowKey: keyof T;
}
