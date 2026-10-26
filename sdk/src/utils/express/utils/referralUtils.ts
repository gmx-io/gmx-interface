import type { ContractsChainId, SourceChainId } from "configs/chains";
import { getContract, isContractsV2_2_1 } from "configs/contracts";
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
  const isV2_2_1 = isContractsV2_2_1(chainId);
  const types = {
    SetTraderReferralCode: [
      ...(isV2_2_1 ? [{ name: "account", type: "address" }] : []),
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    ...(isV2_2_1 ? { account: signer.address } : {}),
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
  const isV2_2_1 = isContractsV2_2_1(chainId);
  const types = {
    RegisterCode: [
      ...(isV2_2_1 ? [{ name: "account", type: "address" }] : []),
      { name: "referralCode", type: "bytes32" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter"));
  const typedData = {
    ...(isV2_2_1 ? { account: signer.address } : {}),
    referralCode: referralCode,
    relayParams: hashRelayParams(relayParams),
  };

  return signer.signTypedData(domain, types, typedData);
}
