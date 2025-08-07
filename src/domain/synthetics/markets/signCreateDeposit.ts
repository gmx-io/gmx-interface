import { Wallet } from "ethers";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import type { CreateDepositParamsStruct } from ".";
import { getGelatoRelayRouterDomain, hashRelayParams } from "../express/relayParamsUtils";
import type { RelayParamsPayload } from "../express/types";

export async function signCreateDeposit({
  signer,
  chainId,
  srcChainId,
  relayParams,
  transferRequests,
  params,
}: {
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayload;
  transferRequests: IRelayUtils.TransferRequestsStruct;
  params: CreateDepositParamsStruct;
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
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

  const domain = getGelatoRelayRouterDomain(srcChainId ?? chainId, getContract(chainId, "MultichainGmRouter"));
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
