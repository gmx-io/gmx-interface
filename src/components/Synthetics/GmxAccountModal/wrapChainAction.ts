import { getAccount, getChainId, getWalletClient } from "@wagmi/core";

import type { AnyChainId } from "config/chains";
import { switchNetwork, WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { clientToSigner } from "lib/wallets/useEthersSigner";

export async function wrapChainAction(
  chainId: AnyChainId,
  action: (signer: WalletSigner) => Promise<void>
): Promise<void> {
  const config = getRainbowKitConfig();

  const currentChainId = getChainId(config);
  const account = getAccount(config).address;

  if (!account) {
    throw new Error("No account found");
  }

  if (currentChainId === chainId) {
    const currentWalletClient = await getWalletClient(config);
    const currentSigner = clientToSigner(currentWalletClient, account);
    await action(currentSigner);
    return;
  }

  await switchNetwork(chainId, true);

  const walletClient = await getWalletClient(config);
  const signer = clientToSigner(walletClient, account);

  try {
    await action(signer);
  } finally {
    if (currentChainId !== chainId) {
      await switchNetwork(currentChainId, true);
    }
  }
}
