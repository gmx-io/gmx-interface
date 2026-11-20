import { useSignTypedData } from "@privy-io/react-auth";
import { useEffect } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { silentEmbeddedWalletSigner } from "lib/wallets/silentEmbeddedWalletSigner";
import { useConnectedEmbeddedWallet } from "lib/wallets/useConnectedEmbeddedWallet";

export function useSilentEmbeddedWalletOrderSigning() {
  const { confirmOrderSignatures } = useSettings();
  const embeddedWalletAddress = useConnectedEmbeddedWallet()?.address;
  const { signTypedData } = useSignTypedData();

  useEffect(() => {
    if (!embeddedWalletAddress || confirmOrderSignatures) {
      return;
    }

    return silentEmbeddedWalletSigner.register({
      address: embeddedWalletAddress,
      signTypedData: async (typedData) => {
        const { signature } = await signTypedData(typedData, {
          address: embeddedWalletAddress,
          uiOptions: { showWalletUIs: false },
        });

        return signature;
      },
    });
  }, [confirmOrderSignatures, embeddedWalletAddress, signTypedData]);
}
