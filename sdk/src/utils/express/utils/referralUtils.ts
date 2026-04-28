import type { ContractsChainId, SourceChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import type { IAbstractSigner } from "utils/signer";

import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParamsUtils";
import type { RelayParamsPayload } from "../types";

export async function signSetTraderReferralCode({
  signer,
  relayParams,
  referralCode,
  chainId,
  srcChainId,
}: {
  signer: IAbstractSigner;
  relayParams: RelayParamsPayload;
  referralCode: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
}) {
  const types = {
    SetTraderReferralCode: [
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    referralCode: referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signer.signTypedData(domain, types, typedData);
}

export async function signRegisterCode({
  signer,
  relayParams,
  referralCode,
  chainId,
  srcChainId,
}: {
  signer: IAbstractSigner;
  relayParams: RelayParamsPayload;
  referralCode: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
}) {
  const types = {
    RegisterCode: [
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    referralCode: referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signer.signTypedData(domain, types, typedData);
}
