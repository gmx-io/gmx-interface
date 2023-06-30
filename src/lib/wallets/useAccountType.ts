import { useEffect, useState } from "react";
import { Address } from "wagmi";
import useWallet from "./useWallet";

export enum AccountType {
  CONTRACT = "contract",
  EOA = "eoa",
}

export default function useAccountType() {
  const { isConnected, address, signer } = useWallet();
  const [contractType, setContractType] = useState<AccountType | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    (async function () {
      const code = await signer?.provider?.getCode(address as Address);
      const type = code === "0x" ? AccountType.EOA : AccountType.CONTRACT;
      setContractType(type);
    })();
  }, [address, isConnected, signer]);

  return contractType;
}
