import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import { subaccountListKey } from "config/dataStore";
import { getOneClickTradingConfigKey } from "config/localStorage";
import { getStringForSign } from "domain/synthetics/oneClickTrading/onClickTradingUtils";
import { OneClickTradingSerializedConfig } from "domain/synthetics/oneClickTrading/types";
import { ethers } from "ethers";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMulticall } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";
import { Context, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

type Subaccount = {
  address: string;
  privateKey: string;
  active: boolean;
};

export type OneClickTradingContext = {
  subaccount: Subaccount | null;
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  generateSubaccount: () => Promise<void>;
  clearSubaccount: () => void;
};

const context = createContext<OneClickTradingContext | null>(null);

export function OneClickTradingContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(true);

  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const [config, setConfig] = useLocalStorageSerializeKey<OneClickTradingSerializedConfig>(
    getOneClickTradingConfigKey(chainId, account),
    null
  );

  const generateSubaccount = useCallback(async () => {
    const signature = await signer?.signMessage(getStringForSign());

    if (!signature) return;

    const pk = ethers.utils.keccak256(signature);
    const subWallet = new ethers.Wallet(pk);

    setConfig({
      privateKey: pk,
      address: subWallet.address,
    });
  }, [setConfig, signer]);

  const clearSubaccount = useCallback(() => {
    setConfig(null);
  }, [setConfig]);

  const { data: contractData } = useMulticall(chainId, "useSubaccountsFromContracts", {
    key: account && config?.address ? [account, config.address] : null,
    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          subaccounts: {
            methodName: "containsAddress",
            params: [subaccountListKey(account!), config!.address],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const isActiveSubaccount = Boolean(res.data.dataStore.subaccounts.returnValues[0]);
      return { isActiveSubaccount };
    },
  });

  const value: OneClickTradingContext = useMemo(() => {
    return {
      modalOpen,
      setModalOpen,
      subaccount: config
        ? {
            address: config.address,
            privateKey: config.privateKey,
            active: contractData?.isActiveSubaccount ?? false,
          }
        : null,
      generateSubaccount,
      clearSubaccount,
    };
  }, [clearSubaccount, config, contractData?.isActiveSubaccount, generateSubaccount, modalOpen]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useOneClickTradingSelector<Selected>(selector: (s: OneClickTradingContext) => Selected) {
  return useContextSelector(context as Context<OneClickTradingContext>, selector);
}

export function useOneClickTradingModalOpen() {
  return [useOneClickTradingSelector((s) => s.modalOpen), useOneClickTradingSelector((s) => s.setModalOpen)] as const;
}

export function useOneClickTradingSetModalOpen() {
  return useOneClickTradingSelector((s) => s.setModalOpen);
}

export function useOneClickTradingGenerateSubaccount() {
  return useOneClickTradingSelector((s) => s.generateSubaccount);
}

export function useOneClickTradingState() {
  return useOneClickTradingSelector((s) => s);
}

export function useSubaccountAddress() {
  return useOneClickTradingSelector((s) => s.subaccount?.address ?? null);
}
