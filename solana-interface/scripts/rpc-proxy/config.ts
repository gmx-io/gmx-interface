export type LocalRpcProxyConfig = {
  port: number;
  target: string;
  env: string;
  simulatedOrigin: string;
  simulatedReferer: string;
};

export function resolveLocalRpcProxyConfig(
  env: Record<string, string | undefined> = process.env
): LocalRpcProxyConfig {
  const port = Number(env.PORT ?? env.LOCAL_RPC_PROXY_PORT ?? "9010");
  const target = env.RPC_PROXY_TARGET ?? "https://rpc-1.gmtrade.xyz";
  const rpcProxyEnv = env.RPC_PROXY_ENV?.trim() || "nightly";
  const simulatedOrigin = env.RPC_PROXY_ORIGIN?.replace(/\/+$/, "") || "https://nightly.gmtrade.xyz";

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid local RPC proxy port "${env.PORT ?? env.LOCAL_RPC_PROXY_PORT ?? ""}".`);
  }

  return {
    port,
    target,
    env: rpcProxyEnv,
    simulatedOrigin,
    simulatedReferer: `${simulatedOrigin}/`,
  };
}
