import { UseWalletClientReturnType, useAccount, useConnectorClient, useWalletClient } from "wagmi";

import { useEthersSigner } from "./useEthersSigner";

export type WalletClient = Exclude<UseWalletClientReturnType["data"], undefined>;

export default function useWallet() {
  const { address, isConnected, status, connector, chainId } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const { data: walletClient } = useWalletClient();

  const signer = useEthersSigner();

  return {
    account: address,
    active: isConnected,
    status,
    connector: connector!,
    chainId: chainId,
    signer: signer,
    connectorClient,
    walletClient,
  };
}
