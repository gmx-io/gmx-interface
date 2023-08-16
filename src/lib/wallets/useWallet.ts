import { useAccount, useNetwork, useSigner } from "wagmi";

export default function useWallet() {
  const { address, isConnected, connector } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();
  return {
    address,
    isConnected,
    connector,
    chainId: chain?.id,
    signer,
  };
}
