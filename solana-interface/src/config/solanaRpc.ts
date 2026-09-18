function trimEndpoint(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getSolanaRpcEndpoint(): string {
  const localProxyEndpoint = trimEndpoint(import.meta.env.VITE_APP_LOCAL_RPC_PROXY_ENDPOINT);

  if (import.meta.env.DEV && localProxyEndpoint) {
    return localProxyEndpoint;
  }

  const remoteEndpoint = trimEndpoint(import.meta.env.VITE_APP_SOLANA_RPC_URL);

  if (!remoteEndpoint) {
    throw new Error("VITE_APP_SOLANA_RPC_URL is not configured");
  }

  return remoteEndpoint;
}
