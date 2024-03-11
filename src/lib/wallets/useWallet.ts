import { UseWalletClientReturnType, useAccount, useConnectorClient, useWalletClient } from "wagmi";
import { useEthersSigner } from "./useEthersSigner";

export type WalletClient = UseWalletClientReturnType["data"];

export default function useWallet() {
  const { address, isConnected, connector, chainId } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const { data: walletClient } = useWalletClient();

  const signer = useEthersSigner();

  return {
    account: address,
    active: isConnected,
    connector: connector!,
    chainId: chainId,
    signer: signer,
    connectorClient,
    walletClient,
  };
}
