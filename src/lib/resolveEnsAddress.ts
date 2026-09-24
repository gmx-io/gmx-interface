import { normalize } from "viem/ens";

import { SOURCE_ETHEREUM_MAINNET } from "config/chains";

export async function resolveEnsAddress(name: string) {
  const { getPublicClientWithRpc } = await import("lib/wallets/walletConfig");
  return getPublicClientWithRpc(SOURCE_ETHEREUM_MAINNET).getEnsAddress({ name: normalize(name) });
}
