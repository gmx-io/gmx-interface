import fetch from "cross-fetch";

import { buildUrl } from "utils/buildUrl";

import { IHttp } from "./types";

export class HttpClient implements IHttp {
  constructor(public readonly url: string) {}

  async fetchJson<TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ): Promise<TResult> {
    const query = opts?.query
      ? Object.fromEntries(Object.entries(opts.query).filter(([, value]) => value !== undefined && value !== null))
      : undefined;

    const url = buildUrl(this.url, path, query);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (opts?.transform) {
      return opts.transform(json);
    }

    return json as TResult;
  }
}
