import { t } from "@lingui/macro";
import { Signer, Wallet, ethers } from "ethers";
import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { callContract } from "lib/contracts";
import { ExpressTxnData } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { signTypedData } from "lib/wallets/signing";
import { abis } from "sdk/abis";
import { ContractsChainId, SourceChainId } from "sdk/configs/chains";

import { validateSignerAddress } from "components/Errors/errorToasts";

import { RelayParamsPayloadArbitrumSepolia, getGelatoRelayRouterDomain, hashRelayParamsMultichain } from "../express";
import { getMultichainInfoFromSigner } from "../express/expressOrderUtils";

type Params = {
  account: string;
  fundingFees: {
    marketAddresses: string[];
    tokenAddresses: string[];
  };
  setPendingTxns: (txns: any) => void;
};

export async function claimFundingFeesTxn(chainId: ContractsChainId, signer: Signer, p: Params) {
  const { setPendingTxns, fundingFees, account } = p;

  await validateSignerAddress(signer, account);

  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);

  return callContract(
    chainId,
    contract,
    "claimFundingFees",
    [fundingFees.marketAddresses, fundingFees.tokenAddresses, account],
    {
      sentMsg: t`Funding Claimed`,
      successMsg: t`Success claimings`,
      failMsg: t`Claiming failed`,
      hideSuccessMsg: true,
      setPendingTxns,
    }
  );
}

export async function buildAndSignClaimFundingFeesTxn({
  signer,
  relayParams,
  account,
  markets,
  tokens,
  receiver,
  chainId,
  emptySignature = false,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: {
  signer: WalletSigner;
  relayParams: RelayParamsPayloadArbitrumSepolia;
  account: string;
  markets: string[];
  tokens: string[];
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

  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signClaimFundingFeesPayload({
      signer,
      relayParams,
      markets,
      tokens,
      receiver,
      chainId,
      srcChainId,
    });
  }

  const claimFundingFeesCallData = encodeFunctionData({
    abi: abis.MultichainClaimsRouterArbitrumSepolia,
    functionName: "claimFundingFees",
    args: [{ ...relayParams, signature }, account, srcChainId, markets, tokens, receiver],
  });

  return {
    callData: claimFundingFeesCallData,
    to: getContract(chainId, "MultichainClaimsRouter"),
    feeToken: relayerFeeTokenAddress,
    feeAmount: relayerFeeAmount,
  };
}

async function signClaimFundingFeesPayload({
  signer,
  relayParams,
  markets,
  tokens,
  receiver,
  chainId,
  srcChainId,
}: {
  signer: WalletSigner | Wallet;
  relayParams: RelayParamsPayloadArbitrumSepolia;
  markets: string[];
  tokens: string[];
  receiver: string;
  chainId: ContractsChainId;
  srcChainId: SourceChainId;
}) {
  const types = {
    ClaimFundingFees: [
      { name: "markets", type: "address[]" },
      { name: "tokens", type: "address[]" },
      { name: "receiver", type: "address" },
      { name: "relayParams", type: "bytes32" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(srcChainId, getContract(chainId, "MultichainClaimsRouter"));
  const typedData = {
    markets,
    tokens,
    receiver,
    relayParams: hashRelayParamsMultichain(relayParams),
  };

  return signTypedData({ signer, domain, types, typedData });
}
