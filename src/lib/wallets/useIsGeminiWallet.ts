import { useAccount } from "wagmi";

const GEMINI_WALLET_ID = "gemini";

export function useIsGeminiWallet() {
  const { connector } = useAccount();

  return connector?.id === GEMINI_WALLET_ID;
}
