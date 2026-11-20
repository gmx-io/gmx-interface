import type { SignTypedDataParams } from "@privy-io/react-auth";
import { isAddressEqual } from "viem";

type SilentTypedDataSigner = {
  address: string;
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
    return this.signer && isAddressEqual(this.signer.address, address) ? this.signer : undefined;
  }
}

export const silentEmbeddedWalletSigner = new SilentEmbeddedWalletSigner();
