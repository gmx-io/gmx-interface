import type { Connector } from "wagmi/connectors";

export function isAndroid(): boolean {
  return (
    typeof navigator !== "undefined" && /Android\s([0-9.]+)/.test(navigator.userAgent) // Source: https://github.com/DamonOehlman/detect-browser/blob/master/src/index.ts
  );
}

export async function getWalletConnectUri(connector: Connector, version: "1" | "2"): Promise<string> {
  const provider = await connector.getProvider();
  return version === "2"
    ? new Promise<string>((resolve) => provider.once("display_uri", resolve))
    : provider.connector.uri;
}

export function normalizeChainId(chainId: string | number | bigint) {
  if (typeof chainId === "string") return Number.parseInt(chainId, chainId.trim().substring(0, 2) === "0x" ? 16 : 10);
  if (typeof chainId === "bigint") return Number(chainId);
  return chainId;
}
