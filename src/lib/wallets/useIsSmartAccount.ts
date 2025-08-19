import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

export function useIsSafeAccount() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [isSmartAccount, setIsSmartAccount] = useState(false);

  useEffect(() => {
    async function check() {
      if (!address || !publicClient) {
        return;
      }

      try {
        const code = await publicClient.getBytecode({ address });
        if (code === "0x" || code === undefined) {
          setIsSmartAccount(false);
        } else {
          setIsSmartAccount(true);
        }
      } catch (error) {
        setIsSmartAccount(false);
      }
    }

    check();
  }, [address, publicClient]);

  return isSmartAccount;
}
