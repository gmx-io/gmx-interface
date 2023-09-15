import { useEffect, useState } from "react";
import useWallet from "./useWallet";

export enum AccountType {
  CONTRACT = "contract",
  EOA = "eoa",
}

export default function useAccountType() {
  const { active, account, signer } = useWallet();
  const [contractType, setContractType] = useState<AccountType | null>(null);

  useEffect(() => {
    if (!active) return;
    (async function () {
      const code = await signer?.provider?.getCode(account as string);
      const type = code === "0x" ? AccountType.EOA : AccountType.CONTRACT;
      setContractType(type);
    })();
  }, [account, signer, active]);

  return contractType;
}
