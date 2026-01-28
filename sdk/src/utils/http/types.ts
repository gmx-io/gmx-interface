export type IHttp = {
  url: string;
  fetchJson: <TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ) => Promise<TResult>;
};
