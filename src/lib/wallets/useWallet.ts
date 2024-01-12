import { useAccount, useNetwork, useSigner } from "wagmi";

export default function useWallet() {
  const { address, isConnected, connector } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();
  return {
    // account: "0x53a8d71da9624febe6c498b1cdf0c0bad73a5afa",
    account: address,
    active: isConnected,
    connector,
    chainId: chain?.id,
    signer: signer ?? undefined,
  };
}
