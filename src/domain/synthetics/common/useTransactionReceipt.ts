import { useEffect, useState } from "react";

import useWallet from "lib/wallets/useWallet";

export function useTransactionPending(hash: string | null | undefined) {
  const { signer } = useWallet();
  const [status, setStatus] = useState(false);

  useEffect(() => {
    async function waitPending() {
      if (!hash || !signer || !signer.provider) {
        setStatus(false);
        return;
      }

      const tx = await signer.provider.getTransaction(hash);
      setStatus(true);
      if (tx) {
        await tx.wait();
      }
      setStatus(false);
    }

    waitPending();
  }, [hash, signer]);

  return status;
}
