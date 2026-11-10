import type { AbstractSigner } from "ethers";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { TransferRequests } from "domain/multichain/types";
import type { ISigner } from "lib/transactions/iSigner";
import { signTypedData } from "lib/wallets/signing";

import type { CreateGlvDepositParams } from ".";
import { getTransferRequestsTypedDataParts } from "./getTransferRequestsTypedDataParts";
import { getGelatoRelayRouterDomain, hashRelayParams, RelayParamsPayload } from "../express";

export async function signCreateGlvDeposit({
  chainId,
  srcChainId,
  signer,
  relayParams,
  transferRequests,
  params,
  shouldUseSignerMethod,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: AbstractSigner | ISigner;
  relayParams: RelayParamsPayload;
  transferRequests: TransferRequests;
  params: CreateGlvDepositParams;
  shouldUseSignerMethod?: boolean;
}) {
  const account = await signer.getAddress();
  const transferRequestsTypedDataParts = getTransferRequestsTypedDataParts({ chainId, account, transferRequests });
  const types = {
    CreateGlvDeposit: [
      ...transferRequestsTypedDataParts.fields,
      { name: "addresses", type: "CreateGlvDepositAddresses" },
      { name: "minGlvTokens", type: "uint256" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "isMarketTokenDeposit", type: "bool" },
      { name: "dataList", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
    ],
    CreateGlvDepositAddresses: [
      { name: "glv", type: "address" },
      { name: "market", type: "address" },
      { name: "receiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "initialLongToken", type: "address" },
      { name: "initialShortToken", type: "address" },
      { name: "longTokenSwapPath", type: "address[]" },
      { name: "shortTokenSwapPath", type: "address[]" },
    ],
    ...transferRequestsTypedDataParts.types,
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainGlvRouter"));
  const typedData = {
    ...transferRequestsTypedDataParts.message,
    addresses: params.addresses,
    minGlvTokens: params.minGlvTokens,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    isMarketTokenDeposit: params.isMarketTokenDeposit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData, shouldUseSignerMethod, verificationChainId: chainId });
}
