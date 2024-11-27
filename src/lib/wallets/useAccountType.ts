import { useEffect, useState } from "react";
import { useContext } from "react";
import { ethers } from "ethers";
import { DynamicWalletContext } from "store/dynamicwalletprovider";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export enum AccountType {
  CONTRACT = "contract",
  EOA = "eoa",
}

export default function useAccountType() {
  //const { active, account, library } = useWeb3React();
  const walletContext = useContext(DynamicWalletContext);
  const { primaryWallet } = useDynamicContext();

  const account = walletContext.account;
  // const signer = walletContext.signer;
  const active = walletContext.active;
  const [contractType, setContractType] = useState<AccountType | null>(null);

  useEffect(() => {
    if (!active || !account || !primaryWallet) return;
    (async function () {
      const signer = await primaryWallet.connector.getSigner();
      //@ts-ignore
      const provider = new ethers.providers.Web3Provider(signer);
      const code = await provider.getCode(account);
      const type = code === "0x" ? AccountType.EOA : AccountType.CONTRACT;
      setContractType(type);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, active]);

  return contractType;
}
