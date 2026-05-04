import fetch from "cross-fetch";

import { buildUrl } from "utils/buildUrl";

import { IHttp } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export class HttpError extends Error {
  /** HTTP status code */
  statusCode: number;
  /** Structured error code from API (e.g. "INTERNAL_ERROR", "VALIDATION_ERROR") */
  code?: string;
  /** Distributed trace ID for correlating with server logs */
  traceId?: string;
  /** Full parsed response body */
  body?: Record<string, any>;

  constructor(statusCode: number, message: string, body?: Record<string, any>) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = body?.code ?? body?.error?.code;
    this.traceId = body?.traceId;
    this.body = body;
  }
}

function throwHttpError(statusCode: number, statusText: string, errorBody?: Record<string, any>): never {
  let errorMessage = `HTTP ${statusCode}: ${statusText}`;

  if (errorBody?.message) {
    const msg = typeof errorBody.message === "string" ? errorBody.message : JSON.stringify(errorBody.message);
    errorMessage = `HTTP ${statusCode}: ${msg}`;
  }

  throw new HttpError(statusCode, errorMessage, errorBody);
}

export class HttpClient implements IHttp {
  constructor(
    public readonly url: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {}

  async fetchJson<TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ): Promise<TResult> {
    const query = opts?.query
      ? Object.fromEntries(Object.entries(opts.query).filter(([, value]) => value !== undefined && value !== null))
      : undefined;

    const url = buildUrl(this.url, path, query);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal as any,
      });

      if (!response.ok) {
        let errorBody: Record<string, any> | undefined;
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse errors
        }
        throwHttpError(response.status, response.statusText, errorBody);
      }

      const json = await response.json();

      if (opts?.transform) {
        return opts.transform(json);
      }

      return json as TResult;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async postJson<TResult>(
    path: string,
    body: unknown,
    opts?: { transform?: (result: any) => TResult }
  ): Promise<TResult> {
    const url = buildUrl(this.url, path);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body, bigIntReplacer),
        signal: controller.signal as any,
      });

      if (!response.ok) {
        let errorBody: Record<string, any> | undefined;
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse errors
        }
        throwHttpError(response.status, response.statusText, errorBody);
      }

      const json = await response.json();

      if (opts?.transform) {
        return opts.transform(json);
      }

      return json as TResult;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
