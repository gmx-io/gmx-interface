import { RpcRequest, RpcResponder } from "./types";

type JsonRpcCall = { id?: number | string; method: string; params?: RpcRequest["params"] };

export async function handleJsonRpcBody({
  responder,
  chainId,
  rawBody,
}: {
  responder: RpcResponder;
  chainId: number;
  rawBody: string;
}): Promise<string> {
  const body = JSON.parse(rawBody) as JsonRpcCall | JsonRpcCall[];

  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((call) => handleSingle(responder, chainId, call)));
    return JSON.stringify(results);
  }

  return JSON.stringify(await handleSingle(responder, chainId, body));
}

async function handleSingle(responder: RpcResponder, chainId: number, call: JsonRpcCall) {
  const { id = 1, method, params = [] } = call;

  try {
    const result = await responder.handle(chainId, { method, params } satisfies RpcRequest);
    return { jsonrpc: "2.0", id, result };
  } catch (error) {
    const { rpcCode = -32000, rpcData } = error as { rpcCode?: number; rpcData?: string };
    const wrapped: { code: number; message: string; data?: string } = {
      code: rpcCode,
      message: (error as Error).message,
    };
    if (rpcData !== undefined) {
      wrapped.data = rpcData;
    }
    return { jsonrpc: "2.0", id, error: wrapped };
  }
}
