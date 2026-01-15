import type { AbstractSigner, Wallet } from "ethers";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { TransferRequests } from "domain/multichain/types";
import type { ISigner } from "lib/transactions/iSigner";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";

import type { CreateGlvWithdrawalParams } from ".";
import { getGelatoRelayRouterDomain, hashRelayParams } from "../express/relayParamsUtils";
import type { RelayParamsPayload } from "../express/types";

export async function signCreateGlvWithdrawal({
  signer,
  chainId,
  srcChainId,
  relayParams,
  transferRequests,
  params,
  shouldUseSignerMethod,
}: {
  signer: WalletSigner | Wallet | ISigner | AbstractSigner;
  relayParams: RelayParamsPayload;
  transferRequests: TransferRequests;
  params: CreateGlvWithdrawalParams;
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  shouldUseSignerMethod?: boolean;
}) {
  const types = {
    CreateGlvWithdrawal: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
      { name: "addresses", type: "CreateGlvWithdrawalAddresses" },
      { name: "minLongTokenAmount", type: "uint256" },
      { name: "minShortTokenAmount", type: "uint256" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "dataList", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
    ],
    CreateGlvWithdrawalAddresses: [
      { name: "receiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "glv", type: "address" },
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
    minLongTokenAmount: params.minLongTokenAmount,
    minShortTokenAmount: params.minShortTokenAmount,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData, shouldUseSignerMethod });
}
