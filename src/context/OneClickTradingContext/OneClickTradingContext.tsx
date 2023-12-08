import { getOneClickTradingConfigKey } from "config/localStorage";
import { getStringForSign } from "domain/synthetics/oneClickTrading/onClickTradingUtils";
import { OneClickTradingSerializedConfig } from "domain/synthetics/oneClickTrading/types";
import { ethers } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";
import { Context, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

export type OneClickTradingContext = (
  | {
      state: "created";
      subAccount: {
        address: string;
        privateKey: string;
      };
    }
  | {
      state: "active";
      subAccount: {
        address: string;
        privateKey: string;
      };
    }
  | {
      state: "off";
      subAccount: null;
    }
) & {
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  generateSubAccount: () => Promise<void>;
};

const context = createContext<OneClickTradingContext | null>(null);

export function OneClickTradingContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);

  const { signer, account, chainId } = useWallet();
  const [config, setConfig] = useLocalStorageSerializeKey<OneClickTradingSerializedConfig>(
    getOneClickTradingConfigKey(chainId, account),
    null
  );

  const generateSubAccount = useCallback(async () => {
    const signature = await signer?.signMessage(getStringForSign());

    if (!signature) return;

    const pk = signature.slice(0, 66);

    // console.log(pk, "<- PK");
    const subWallet = new ethers.Wallet(pk);

    // console.log({ pk, address: subWallet.address, subWallet });

    setConfig({
      privateKey: pk,
      address: subWallet.address,
    });
  }, [setConfig, signer]);

  const value: OneClickTradingContext = useMemo(() => {
    if (config) {
      return {
        state: "created",
        modalOpen,
        setModalOpen,
        subAccount: {
          address: config.address,
          privateKey: config.privateKey,
        },
        generateSubAccount,
      };
    }
    return {
      state: "off",
      modalOpen,
      setModalOpen,
      subAccount: null,
      generateSubAccount,
    };
  }, [config, generateSubAccount, modalOpen]);

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

export function useOneClickTradingGenerateSubAccount() {
  return useOneClickTradingSelector((s) => s.generateSubAccount);
}
