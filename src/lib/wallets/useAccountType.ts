import { useEffect, useState } from "react";
import { useContext } from "react";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

export enum AccountType {
  CONTRACT = "contract",
  EOA = "eoa",
}

export default function useAccountType() {
  //const { active, account, library } = useWeb3React();
  const walletContext = useContext(DynamicWalletContext);

  const account = walletContext.account;
  const signer = walletContext.signer;
  const active = walletContext.active;
  const [contractType, setContractType] = useState<AccountType | null>(null);

  useEffect(() => {
    if (!active) return;
    (async function () {
      const code = await signer.getCode(account); //todo.
      const type = code === "0x" ? AccountType.EOA : AccountType.CONTRACT;
      setContractType(type);
    })();
  }, [account, signer, active]);

  return contractType;
}
