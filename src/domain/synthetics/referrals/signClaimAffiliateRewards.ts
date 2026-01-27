import type { AbstractSigner, Wallet } from "ethers";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";

import { getGelatoRelayRouterDomain, hashRelayParams } from "../express/relayParamsUtils";
import type { RelayParamsPayload } from "../express/types";

export async function signClaimAffiliateRewards({
  signer,
  chainId,
  srcChainId,
  relayParams,
  account,
  marketAddresses,
  tokenAddresses,
  shouldUseSignerMethod = false,
}: {
  signer: AbstractSigner | WalletSigner | Wallet;
  relayParams: RelayParamsPayload;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  shouldUseSignerMethod?: boolean;
}) {
  const types = {
    ClaimAffiliateRewards: [
      { name: "markets", type: "address[]" },
      { name: "tokens", type: "address[]" },
      { name: "receiver", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainClaimsRouter"));
  const typedData = {
    markets: marketAddresses,
    tokens: tokenAddresses,
    receiver: account,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData, shouldUseSignerMethod });
}
