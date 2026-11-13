export type ServedResult<TResult> = { result: TResult; client: IHttp };

export type HttpResponseMetadata = { headers: { get(name: string): string | null } };

export type FetchJsonOptions<TResult> = {
  query?: Record<string, any>;
  transform?: (result: any) => TResult;
  onResponse?: (response: HttpResponseMetadata) => void;
};

export type IHttp = {
  url: string;
  fetchJson: <TResult>(path: string, opts?: FetchJsonOptions<TResult>) => Promise<TResult>;
  postJson: <TResult>(path: string, body: unknown, opts?: { transform?: (result: any) => TResult }) => Promise<TResult>;
  postJsonWith?: <TResult>(
    path: string,
    body: unknown,
    opts?: { transform?: (result: any) => TResult }
  ) => Promise<ServedResult<TResult>>;
};
