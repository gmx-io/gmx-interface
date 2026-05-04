import { HttpClient, HttpError } from "./http";
import { IHttp } from "./types";

const FAILURE_WINDOW_MS = 60_000;
const FAILURES_BEFORE_ROTATION = 3;

function isServerOrNetworkError(e: unknown): boolean {
  if (e instanceof HttpError) {
    return e.statusCode >= 500;
  }
  return true;
}

export class HttpClientWithFallback implements IHttp {
  private clients: HttpClient[];
  private primaryIndex: number;
  private failureTimestamps: number[] = [];

  constructor(urls: string[], timeoutMs?: number) {
    if (urls.length === 0) {
      throw new Error("At least one URL is required");
    }

    this.clients = urls.map((url) => new HttpClient(url, timeoutMs));
    this.primaryIndex = Math.floor(Math.random() * this.clients.length);
  }

  get url(): string {
    return this.clients[this.primaryIndex].url;
  }

  async fetchJson<TResult>(
    path: string,
    opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
  ): Promise<TResult> {
    return this.withFallback((client) => client.fetchJson<TResult>(path, opts));
  }

  async postJson<TResult>(
    path: string,
    body: unknown,
    opts?: { transform?: (result: any) => TResult }
  ): Promise<TResult> {
    return this.withFallback((client) => client.postJson<TResult>(path, body, opts));
  }

  private async withFallback<T>(fn: (client: HttpClient) => Promise<T>): Promise<T> {
    const order = this.getClientOrder();

    for (let i = 0; i < order.length; i++) {
      try {
        return await fn(order[i]);
      } catch (e) {
        if (!isServerOrNetworkError(e) || i === order.length - 1) {
          throw e;
        }

        this.recordFailure(order[i]);
      }
    }

    throw new Error("All endpoints failed");
  }

  private getClientOrder(): HttpClient[] {
    const primary = this.clients[this.primaryIndex];
    const rest = this.clients.filter((_, i) => i !== this.primaryIndex);
    return [primary, ...rest];
  }

  private recordFailure(client: HttpClient): void {
    if (client !== this.clients[this.primaryIndex]) return;
    if (this.clients.length <= 1) return;

    const now = Date.now();
    this.failureTimestamps.push(now);
    this.failureTimestamps = this.failureTimestamps.filter((t) => t >= now - FAILURE_WINDOW_MS);

    if (this.failureTimestamps.length >= FAILURES_BEFORE_ROTATION) {
      this.primaryIndex = (this.primaryIndex + 1) % this.clients.length;
      this.failureTimestamps = [];
    }
  }
}
