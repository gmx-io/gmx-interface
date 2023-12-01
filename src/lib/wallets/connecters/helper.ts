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
