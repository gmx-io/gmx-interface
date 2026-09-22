export type ServedResult<TResult> = { result: TResult; client: IHttp };

export type IHttp = {
  url: string;
  fetchJson: <TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ) => Promise<TResult>;
  postJson: <TResult>(path: string, body: unknown, opts?: { transform?: (result: any) => TResult }) => Promise<TResult>;
  postJsonWith?: <TResult>(
    path: string,
    body: unknown,
    opts?: { transform?: (result: any) => TResult }
  ) => Promise<ServedResult<TResult>>;
};
