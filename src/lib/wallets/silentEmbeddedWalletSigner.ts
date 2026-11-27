import type { SignTypedDataParams } from "@privy-io/react-auth";
import { getAccount } from "@wagmi/core";
import { isAddressEqual } from "viem";

import { CONFIRM_ORDER_SIGNATURES_KEY } from "config/localStorage";
import { readLocalStorageItem } from "lib/localStorage";

import { getWagmiConfig } from "./walletConfig";

type SilentTypedDataSigner = {
  address: string;
  connectorId: string;
  signTypedData: (typedData: SignTypedDataParams) => Promise<string>;
};

/**
 * Signs with the Privy embedded wallet without its confirmation window. Privy takes that option only
 * through its React hook, so the hook registers the signer here for the non-React signing code.
 */
class SilentEmbeddedWalletSigner {
  signer: SilentTypedDataSigner | undefined;

  register(signer: SilentTypedDataSigner) {
    this.signer = signer;

    return () => {
      if (this.signer === signer) {
        this.signer = undefined;
      }
    };
  }

  get(address: string): SilentTypedDataSigner | undefined {
    const { signer } = this;

    if (
      !signer ||
      !isAddressEqual(signer.address, address) ||
      getAccount(getWagmiConfig()).connector?.id !== signer.connectorId ||
      // the setting doesn't sync across tabs, so another tab may have turned confirmations on
      readLocalStorageItem(CONFIRM_ORDER_SIGNATURES_KEY, { deserializer: JSON.parse }) === true
    ) {
      return undefined;
    }

    return signer;
  }
}

export const silentEmbeddedWalletSigner = new SilentEmbeddedWalletSigner();
