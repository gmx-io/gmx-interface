import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { callContract } from "lib/contracts";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import SubaccountRouter from "sdk/abis/SubaccountRouter.json";
import { getContract } from "sdk/configs/contracts";

import { getGelatoRelayRouterDomain, hashRelayParams, RelayParamsPayload } from "../express";
import { Subaccount } from "../subaccount";

export async function removeSubaccountTxn(chainId: number, signer: Signer, subaccountAddress: string) {
  const subaccountRouter = new ethers.Contract(getContract(chainId, "SubaccountRouter"), SubaccountRouter.abi, signer);

  return callContract(chainId, subaccountRouter, "removeSubaccount", [subaccountAddress], {
    value: 0n,
    hideSentMsg: true,
    hideSuccessMsg: true,
  });
}

export async function buildAndSignRemoveSubaccountTxn({
  chainId,
  relayParamsPayload,
  subaccount,
  signer,
}: {
  chainId: number;
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
  chainId: number;
}) {
  const types = {
    RemoveSubaccount: [
      { name: "subaccount", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(chainId, true);

  const typedData = {
    subaccountAddress,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({
    signer,
    types,
    typedData,
    domain,
  });
}
