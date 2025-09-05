import { Contract } from "ethers";
import { useEffect, useState } from "react";

import { WalletSigner } from "lib/wallets";

const CLAIM_TERMS_HASH = "0x09335c037e73849fe301478f91674da05757165154d1dccb1b881c1846938f3d";
const VALID_SIGNATURE_RESPONSE = "0x1626ba7e";
const abi = [
  {
    name: "isValidSignature",
    inputs: [
      {
        internalType: "bytes32",
        name: "_hash",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
    ],
    outputs: [
      {
        internalType: "bytes4",
        name: "magicValue",
        type: "bytes4",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export const useIsSmartAccountSignedClaimTerms = ({ account, signer }: { account?: string; signer?: WalletSigner }) => {
  const [isValidSignature, setIsValidSignature] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!account) {
        return;
      }

      if (!signer) {
        return;
      }

      const contract = new Contract(account, abi, signer);

      try {
        const response = await contract.isValidSignature(CLAIM_TERMS_HASH, "0x");
        const isValid = response === VALID_SIGNATURE_RESPONSE;
        setIsValidSignature(isValid);
      } catch (error) {
        setIsValidSignature(false);
      }
    };

    if (!account) {
      return;
    }

    if (!signer) {
      return;
    }

    check();
  }, [account, signer]);

  return isValidSignature;
};
