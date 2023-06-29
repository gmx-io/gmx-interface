import { useEffect, useState } from "react";
import { Address, useAccount, useSigner } from "wagmi";

export enum AccountType {
  CONTRACT = "contract",
  EOA = "eoa",
}

export default function useAccountType() {
  const { isConnected, address } = useAccount();
  const { data: signer } = useSigner();
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
