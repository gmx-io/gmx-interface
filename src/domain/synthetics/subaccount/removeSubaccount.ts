import { ethers, Signer } from "ethers";
import { encodeFunctionData } from "viem";

import { ARBITRUM_SEPOLIA, UiContractsChain } from "config/static/chains";
import { callContract } from "lib/contracts";
import { ExpressTxnData } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import SubaccountRouter from "sdk/abis/SubaccountRouter.json";
import { getContract } from "sdk/configs/contracts";

import {
  getExpressContractAddress,
  getGelatoRelayRouterDomain,
  hashRelayParams,
  hashRelayParamsMultichain,
  MultichainRelayParamsPayload,
  RelayParamsPayload,
} from "../express";
import { getMultichainInfoFromSigner, getOrderRelayRouterAddress } from "../express/expressOrderUtils";
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
  relayParamsPayload: RelayParamsPayload | MultichainRelayParamsPayload;
  subaccount: Subaccount;
  signer: WalletSigner;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);

  const relayRouterAddress = getExpressContractAddress(chainId, {
    isSubaccount: true,
    isMultichain: srcChainId !== undefined,
    scope: "subaccount",
  });

  const signature = await signRemoveSubaccountPayload({
    signer,
    relayParams: relayParamsPayload,
    subaccountAddress: subaccount.address,
    chainId,
  });

  const removeSubaccountCallData = encodeFunctionData({
    abi: srcChainId !== undefined ? abis.MultichainSubaccountRouterArbitrumSepolia : abis.SubaccountGelatoRelayRouter,
    functionName: "removeSubaccount",
    args:
      srcChainId !== undefined
        ? [{ ...relayParamsPayload, signature }, signer.address, srcChainId, subaccount.address]
        : [{ ...relayParamsPayload, signature }, subaccount.address],
  });

  return {
    callData: removeSubaccountCallData,
    to: relayRouterAddress,
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
  };
}

async function signRemoveSubaccountPayload({
  signer,
  relayParams,
  subaccountAddress,
  chainId,
}: {
  signer: WalletSigner;
  relayParams: RelayParamsPayload | MultichainRelayParamsPayload;
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
    subaccount: subaccountAddress,
    relayParams:
      chainId === ARBITRUM_SEPOLIA
        ? hashRelayParamsMultichain({ desChainId: BigInt(chainId), ...relayParams })
        : hashRelayParams(relayParams),
  };

  return signTypedData({
    signer,
    types,
    typedData,
    domain,
  });
}
