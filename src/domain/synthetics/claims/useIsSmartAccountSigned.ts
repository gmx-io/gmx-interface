import useSWR from "swr";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

const CLAIM_TERMS_HASH = "0x09335c037e73849fe301478f91674da05757165154d1dccb1b881c1846938f3d";
/**
 * keccak256("isValidSignature(bytes32,bytes)")
 * @see https://eips.ethereum.org/EIPS/eip-1271
 */
const VALID_SIGNATURE_RESPONSE = "0x1626ba7e";

export const useIsSmartAccountSignedClaimTerms = ({
  account,
  signer: _signer,
}: {
  account?: string;
  signer?: WalletSigner;
}) => {
  const publicClient = usePublicClient();

  const { data } = useSWR(account && publicClient && [account, publicClient, "isValidSmartAccountSignature"], {
    fetcher: async () => {
      if (!account || !publicClient) {
        return;
      }
      const response = await publicClient.readContract({
        address: account as Address,
        abi: abis.SmartAccount,
        functionName: "isValidSignature",
        args: [CLAIM_TERMS_HASH, "0x"],
      });

      return response === VALID_SIGNATURE_RESPONSE;
    },
  });

  return data;
};
