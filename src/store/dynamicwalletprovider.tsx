import { useDynamicContext, getNetwork } from "@dynamic-labs/sdk-react-core";
import React, { useEffect, useState } from "react";

export type DynamicWallet = {
  account?: string;
  active: boolean;
  signer?: any;
  chainId?: any;
};

export const DynamicWalletContext = React.createContext<DynamicWallet>({
  active: false,
});

const DynamicWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [active, setActive] = useState(false);
  const [account, setAccount] = useState<string>();
  const { primaryWallet } = useDynamicContext();
  const [signer, setSigner] = useState<any>(null);
  const [chainId, setChainId] = useState<any>(null);

  useEffect(() => {
    if (!primaryWallet) return;
    const fetchProvider = async () => {
      if (primaryWallet && primaryWallet.connector) {
        const signer = await primaryWallet.connector.ethers?.getSigner();

        //@ts-ignore
        signer.account = primaryWallet.address;
        //@ts-ignore
        //signer.chain = primaryWallet.network;
        setAccount(primaryWallet.address);
        setSigner(signer);
        setActive(true);
        const chainId = await getNetwork(primaryWallet.connector);
        signer.chain = chainId;

        setChainId(chainId);
      }
    };

    fetchProvider();
  }, [primaryWallet]);

  return (
    <DynamicWalletContext.Provider value={{ account, active, signer, chainId }}>
      {children}
    </DynamicWalletContext.Provider>
  );
};

export default DynamicWalletProvider;
