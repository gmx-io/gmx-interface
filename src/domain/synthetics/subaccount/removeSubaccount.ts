import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { UiContractsChain } from "config/static/chains";
import { callContract } from "lib/contracts";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import SubaccountRouter from "sdk/abis/SubaccountRouter.json";
import { getContract } from "sdk/configs/contracts";

import { getGelatoRelayRouterDomain, hashRelayParams, hashRelayParamsMultichain, RelayParamsPayload } from "../express";
import { getMultichainInfoFromSigner, getOrderRelayRouterAddress } from "../orders/expressOrderUtils";
import { Subaccount } from "../subaccount";

export async function removeSubaccountWalletTxn(
  chainId: UiContractsChain,
  signer: Signer,
  subaccountAddress: string
): Promise<void> {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}

// TODO: make it work with multichain
export async function buildAndSignRemoveSubaccountTxn({
  chainId,
  relayParamsPayload,
  subaccount,
  signer,
}: {
  chainId: UiContractsChain;
  relayParamsPayload: RelayParamsPayload;
  subaccount: Subaccount;
  signer: Signer;
}) {
  const signature = await signRemoveSubaccountPayload({
    signer,
    relayParams: relayParamsPayload,
    subaccountAddress: subaccount.address,
    chainId,
  });

  const removeSubaccountCallData = encodeFunctionData({
    abi: abis.SubaccountGelatoRelayRouter,
    functionName: "removeSubaccount",
    args: [{ ...relayParamsPayload, signature }, await signer.getAddress(), subaccount.address],
  });

  return {
    callData: removeSubaccountCallData,
    contractAddress: getContract(chainId, "SubaccountGelatoRelayRouter"),
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

export async function signRemoveSubaccountPayload({
  signer,
  relayParams,
  subaccountAddress,
  chainId,
}: {
  signer: Signer;
  relayParams: RelayParamsPayload;
  subaccountAddress: string;
  chainId: UiContractsChain;
}) {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const relayRouterAddress = getOrderRelayRouterAddress(chainId, true, srcChainId !== undefined);

  const types = {
    RemoveSubaccount: [
      { name: "subaccount", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, relayRouterAddress, true, srcChainId);

  const typedData = {
    subaccountAddress,
    relayParams: srcChainId
      ? hashRelayParamsMultichain({ ...relayParams, desChainId: BigInt(chainId) })
      : hashRelayParams(relayParams),
  };

  return signTypedData({
    signer,
    types,
    typedData,
    domain,
  });
}
