import type { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import type { CreateGlvDepositParamsStruct } from ".";
import { getGelatoRelayRouterDomain, hashRelayParams, RelayParamsPayload } from "../express";

export function signCreateGlvDeposit({
  chainId,
  srcChainId,
  signer,
  relayParams,
  transferRequests,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateGlvDepositParamsStruct;
}) {
  const types = {
    CreateGlvDeposit: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
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
  };

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainGlvRouter"));
  const typedData = {
    transferTokens: transferRequests.tokens,
    transferReceivers: transferRequests.receivers,
    transferAmounts: transferRequests.amounts,
    addresses: params.addresses,
    minGlvTokens: params.minGlvTokens,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    isMarketTokenDeposit: params.isMarketTokenDeposit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
}
