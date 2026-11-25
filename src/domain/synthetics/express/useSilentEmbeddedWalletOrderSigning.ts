import { useSignTypedData } from "@privy-io/react-auth";
import { useEffect } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { getPrivyWagmiConnectorId } from "lib/wallets/privyWagmi";
import { silentEmbeddedWalletSigner } from "lib/wallets/silentEmbeddedWalletSigner";
import { useConnectedEmbeddedWallet } from "lib/wallets/useConnectedEmbeddedWallet";

export function useSilentEmbeddedWalletOrderSigning() {
  const { confirmOrderSignatures } = useSettings();
  const embeddedWallet = useConnectedEmbeddedWallet();
  const embeddedWalletAddress = embeddedWallet?.address;
  const connectorId = embeddedWallet ? getPrivyWagmiConnectorId(embeddedWallet) : undefined;
  const { signTypedData } = useSignTypedData();

  useEffect(() => {
    if (!embeddedWalletAddress || !connectorId || confirmOrderSignatures) {
      return;
    }

    return silentEmbeddedWalletSigner.register({
      address: embeddedWalletAddress,
      connectorId,
      signTypedData: async (typedData) => {
        const { signature } = await signTypedData(typedData, {
          address: embeddedWalletAddress,
          uiOptions: { showWalletUIs: false },
        });

        return signature;
      },
    });
  }, [confirmOrderSignatures, connectorId, embeddedWalletAddress, signTypedData]);
}
