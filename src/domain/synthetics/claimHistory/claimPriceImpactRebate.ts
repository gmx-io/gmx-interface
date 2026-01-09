import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import type { ExpressTxnData } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { ContractsChainId } from "sdk/configs/chains";
import type { SourceChainId } from "sdk/configs/chains";

import { type RelayParamsPayload, getGelatoRelayRouterDomain, hashRelayParams } from "../express";
import { getMultichainInfoFromSigner } from "../express/expressOrderUtils";
import { RebateInfoItem } from "../fees/useRebatesInfo";

export type ClaimPriceImpactRebateParams = {
  account: string;
  claimablePositionPriceImpactFees: RebateInfoItem[];
};

export async function createClaimCollateralTxn(
  chainId: ContractsChainId,
  signer: Signer,
  { account, claimablePositionPriceImpactFees }: ClaimPriceImpactRebateParams
) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  const args: [markets: string[], tokens: string[], timeKeys: number[], account: string] = [[], [], [], account];

  claimablePositionPriceImpactFees.forEach((p) => {
    args[0].push(p.marketAddress);
    args[1].push(p.tokenAddress);
    args[2].push(Number(p.timeKey));
  });

  const txn = await callContract(chainId, exchangeRouter, "claimCollateral", args, {
    sentMsg: t`Claiming price impact rebates...`,
    successMsg: t`Price impact rebates claimed.`,
    failMsg: t`Failed to claim price impact rebates.`,
  });

  return txn;
}

export async function buildAndSignClaimPositionPriceImpactFeesTxn({
  signer,
  relayParams,
  account,
  claimablePositionPriceImpactFees,
  receiver,
  chainId,
  emptySignature = false,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: {
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  account: string;
  claimablePositionPriceImpactFees: RebateInfoItem[];
  receiver: string;
  chainId: ContractsChainId;
  emptySignature?: boolean;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
}): Promise<ExpressTxnData> {
  const srcChainId = await getMultichainInfoFromSigner(signer, chainId);
  if (!srcChainId) {
    throw new Error("No srcChainId");
  }

  // Build arrays for markets, tokens, timeKeys
  const markets: string[] = [];
  const tokens: string[] = [];
  const timeKeys: bigint[] = [];
  claimablePositionPriceImpactFees.forEach((p) => {
    markets.push(p.marketAddress);
    tokens.push(p.tokenAddress);
    timeKeys.push(BigInt(p.timeKey));
  });

  let signature: string;
  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signClaimCollateralPayload({
      signer,
      relayParams,
      markets,
      tokens,
      timeKeys,
      receiver,
      chainId,
      srcChainId,
    });
  }

  const claimCollateralCallData = encodeFunctionData({
    abi: abis.MultichainClaimsRouter,
    functionName: "claimCollateral",
    args: [{ ...relayParams, signature }, account, BigInt(srcChainId), markets, tokens, timeKeys, receiver],
  });

  return {
    callData: claimCollateralCallData,
    to: getContract(chainId, "MultichainClaimsRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

async function signClaimCollateralPayload({
  signer,
  relayParams,
  markets,
  tokens,
  timeKeys,
  receiver,
  chainId,
  srcChainId,
}: {
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  markets: string[];
  tokens: string[];
  timeKeys: bigint[];
  receiver: string;
  chainId: ContractsChainId;
  srcChainId: number;
}): Promise<string> {
  const types = {
    ClaimCollateral: [
      { name: "markets", type: "address[]" },
      { name: "tokens", type: "address[]" },
      { name: "timeKeys", type: "uint256[]" },
      { name: "receiver", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(
    srcChainId as ContractsChainId | SourceChainId,
    getContract(chainId, "MultichainClaimsRouter")
  );
  const typedData = {
    markets,
    tokens,
    timeKeys,
    receiver,
    relayParams: hashRelayParams(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
}
