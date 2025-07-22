import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { ExpressTxnData } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import type { IDepositUtils } from "typechain-types/ExchangeRouter";
import type { IRelayUtils, MultichainGmRouter } from "typechain-types/MultichainGmRouter";

import { RelayParamsPayload, getGelatoRelayRouterDomain, hashRelayParams } from "../express";

export type CreateMultichainDepositParams = {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  account: string;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: IDepositUtils.CreateDepositParamsStruct;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

export async function buildAndSignMultichainDepositTxn({
  chainId,
  srcChainId,
  signer,
  relayParams,
  account,
  transferRequests,
  params,
  emptySignature,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: CreateMultichainDepositParams): Promise<ExpressTxnData> {
  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signMultichainDepositPayload({
      chainId,
      srcChainId,
      signer,
      relayParams,
      transferRequests,
      params,
    });
  }

  const depositData = encodeFunctionData({
    abi: abis.MultichainGmRouter,
    functionName: "createDeposit",
    args: [
      {
        ...relayParams,
        signature,
      },
      account,
      srcChainId,
      transferRequests,
      params,
    ] satisfies Parameters<MultichainGmRouter["createDeposit"]>,
  });

  return {
    callData: depositData,
    to: getContract(chainId, "MultichainGmRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

function signMultichainDepositPayload({
  chainId,
  srcChainId,
  signer,
  relayParams,
  transferRequests,
  params,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: IDepositUtils.CreateDepositParamsStruct;
}) {
  const types = {
    CreateDeposit: [
      { name: "transferTokens", type: "address[]" },
      { name: "transferReceivers", type: "address[]" },
      { name: "transferAmounts", type: "uint256[]" },
      { name: "addresses", type: "CreateDepositAddresses" },
      { name: "minMarketTokens", type: "uint256" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "dataList", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
    ],
    CreateDepositAddresses: [
      { name: "receiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "initialLongToken", type: "address" },
      { name: "initialShortToken", type: "address" },
      { name: "longTokenSwapPath", type: "address[]" },
      { name: "shortTokenSwapPath", type: "address[]" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainGmRouter"));
  const typedData = {
    transferTokens: transferRequests.tokens,
    transferReceivers: transferRequests.receivers,
    transferAmounts: transferRequests.amounts,
    addresses: params.addresses,
    minMarketTokens: params.minMarketTokens,
    shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    executionFee: params.executionFee,
    callbackGasLimit: params.callbackGasLimit,
    dataList: params.dataList,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
}
