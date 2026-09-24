import { t } from '@lingui/macro';

export interface RpcEndpointCheckResult {
  ok: boolean;
  error?: string;
}

function hasValidBlockhashResult(result: unknown): boolean {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const record = result as Record<string, unknown>;

  if (typeof record.blockhash === 'string' && record.blockhash.length > 0) {
    return true;
  }

  if (typeof record.value === 'object' && record.value !== null) {
    const value = record.value as Record<string, unknown>;
    return typeof value.blockhash === 'string' && value.blockhash.length > 0;
  }

  return false;
}

export async function checkRpcEndpoint(
  url: string
): Promise<RpcEndpointCheckResult> {
  const connectionError = t`Failed to connect to RPC endpoint`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'rpc-endpoint-check',
        method: 'getLatestBlockhash',
        params: [],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: connectionError };
    }

    const data = (await response.json()) as {
      error?: unknown;
      result?: unknown;
    };

    if (data.error || !hasValidBlockhashResult(data.result)) {
      return { ok: false, error: connectionError };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: connectionError };
  }
}
