import { Connection } from "@solana/web3.js";

import { getSolanaRpcEndpoint } from "../config/solanaRpc";

const clients = new Map<string, Connection>();

type SolanaRpcError = {
  code?: number;
  message?: string;
};

type SolanaRpcResponse<T> = {
  error?: SolanaRpcError;
  result?: T;
};

// An explicit port makes web3.js open WebSocket on port + 1. This proxy serves both on the HTTP port.
export function solanaWebsocketEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function getSolanaRpcClient(endpoint = getSolanaRpcEndpoint()): Connection {
  const existing = clients.get(endpoint);

  if (existing) {
    return existing;
  }

  const client = new Connection(endpoint, {
    commitment: "confirmed",
    wsEndpoint: solanaWebsocketEndpoint(endpoint),
  });
  clients.set(endpoint, client);

  return client;
}

export async function sendSolanaRpcRequest<T>(
  method: string,
  params: unknown[] = [],
  endpoint = getSolanaRpcEndpoint()
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
    });
  } catch (error) {
    throw new Error(`Solana RPC request failed: ${error?.message ?? String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Solana RPC request failed: ${response.status} ${response.statusText}`);
  }

  let payload: SolanaRpcResponse<T>;

  try {
    payload = (await response.json()) as SolanaRpcResponse<T>;
  } catch (error) {
    throw new Error(`Solana RPC request returned invalid JSON: ${error?.message ?? String(error)}`);
  }

  if (payload.error) {
    throw new Error(payload.error.message ?? `Solana RPC error ${payload.error.code ?? "unknown"}`);
  }

  if (payload.result === undefined) {
    throw new Error(`Solana RPC request returned no result for ${method}`);
  }

  return payload.result;
}
