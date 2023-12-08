import { getOneClickTradingConfigKey } from "config/localStorage";
import { getStringForSign } from "domain/synthetics/oneClickTrading/onClickTradingUtils";
import { OneClickTradingSerializedConfig } from "domain/synthetics/oneClickTrading/types";
import { ethers } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { Context, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

type Subaccount = {
  address: string;
  privateKey: string;
};

export type OneClickTradingContext = (
  | {
      state: "created";
      subaccount: Subaccount;
    }
  | {
      state: "active";
      subaccount: Subaccount;
    }
  | {
      state: "off";
      subaccount: null;
    }
) & {
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  generateSubaccount: () => Promise<void>;
  clearSubaccount: () => void;
};

const context = createContext<OneClickTradingContext | null>(null);

export function OneClickTradingContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);

  const { signer, account, chainId } = useWallet();
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

  const value: OneClickTradingContext = useMemo(() => {
    if (config) {
      return {
        state: "created",
        modalOpen,
        setModalOpen,
        subaccount: {
          address: config.address,
          privateKey: config.privateKey,
        },
        generateSubaccount: generateSubaccount,
        clearSubaccount: clearSubaccount,
      };
    }
    return {
      state: "off",
      modalOpen,
      setModalOpen,
      subaccount: null,
      generateSubaccount: generateSubaccount,
      clearSubaccount: clearSubaccount,
    };
  }, [clearSubaccount, config, generateSubaccount, modalOpen]);

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
