import { useAccount } from "wagmi";

const TRUST_WALLET_ID = "com.trustwallet.app";

export function getIsTrustWallet(connectorId: string | undefined) {
  return connectorId === TRUST_WALLET_ID;
}

export function useIsTrustWallet() {
  const { connector } = useAccount();

  return getIsTrustWallet(connector?.id);
}
