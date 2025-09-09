import { getAccount, getChainId, getWalletClient } from "@wagmi/core";

import type { AnyChainId, SettlementChainId } from "config/chains";
import { SELECTED_SETTLEMENT_CHAIN_ID_KEY } from "config/localStorage";
import { isSettlementChain } from "config/multichain";
import { switchNetwork, WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { clientToSigner } from "lib/wallets/useEthersSigner";

export async function wrapChainAction(
  chainId: AnyChainId,
  setSettlementChainId: (chainId: SettlementChainId) => void,
  action: (signer: WalletSigner) => Promise<void>
): Promise<void> {
  const config = getRainbowKitConfig();

  const currentChainId = getChainId(config);
  const rawLocalStorageSettlementChainId = localStorage.getItem(SELECTED_SETTLEMENT_CHAIN_ID_KEY);
  const localStorageSettlementChainId = rawLocalStorageSettlementChainId
    ? parseInt(rawLocalStorageSettlementChainId)
    : undefined;
  const shouldUpdateLocalStorageSettlementChainId =
    isSettlementChain(currentChainId) &&
    localStorageSettlementChainId &&
    isSettlementChain(localStorageSettlementChainId) &&
    localStorageSettlementChainId !== currentChainId;

  if (shouldUpdateLocalStorageSettlementChainId) {
    setSettlementChainId(currentChainId);
  }

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
