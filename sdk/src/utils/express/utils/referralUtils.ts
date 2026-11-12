import type { ContractsChainId, SourceChainId } from "configs/chains";
import { getContract, isContractsV2_2_1 } from "configs/contracts";
import type { IAbstractSigner } from "utils/signer";

import { getGelatoRelayRouterDomain, hashRelayParams } from "./relayParamsUtils";
import type { RelayParamsPayload } from "../types";

export function getReferralCodeTypedData({
  primaryType,
  chainId,
  srcChainId,
  relayParams,
  referralCode,
  account,
}: {
  primaryType: "SetTraderReferralCode" | "RegisterCode";
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  relayParams: RelayParamsPayload;
  referralCode: string;
  account: string;
}) {
  const isV2_2_1 = isContractsV2_2_1(chainId);

  return {
    domain: getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainOrderRouter")),
    types: {
      [primaryType]: [
        ...(isV2_2_1 ? [{ name: "account", type: "address" }] : []),
        { name: "referralCode", type: "bytes32" },
        { name: "relayParams", type: "bytes32" },
      ],
    },
    message: {
      ...(isV2_2_1 ? { account } : {}),
      referralCode,
      relayParams: hashRelayParams(relayParams),
    },
  };
}

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
  const { domain, types, message } = getReferralCodeTypedData({
    primaryType: "SetTraderReferralCode",
    chainId,
    srcChainId,
    relayParams,
    referralCode,
    account: signer.address,
  });

  return signer.signTypedData(domain, types, message);
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
  const { domain, types, message } = getReferralCodeTypedData({
    primaryType: "RegisterCode",
    chainId,
    srcChainId,
    relayParams,
    referralCode,
    account: signer.address,
  });

  return signer.signTypedData(domain, types, message);
}
