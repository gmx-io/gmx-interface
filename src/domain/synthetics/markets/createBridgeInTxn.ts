import { t } from "@lingui/macro";
import { getPublicClient } from "@wagmi/core";
import { Contract } from "ethers";
import { encodeFunctionData, Hex, zeroAddress } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, IStargateAbi } from "config/multichain";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { SendParam } from "domain/multichain/types";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/useMultichainDepositNetworkComposeGas";
import { GlobalExpressParams } from "domain/synthetics/express";
import { sendWalletTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { IStargate, IStargate__factory } from "typechain-types-stargate";

import { toastCustomOrStargateError } from "components/GmxAccountModal/toastCustomOrStargateError";

export async function createBridgeInTxn({
  chainId,
  srcChainId,
  signer,
  account,
  tokenAddress,
  tokenAmount,
}: {
  chainId: SettlementChainId;
  globalExpressParams: GlobalExpressParams;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  account: string;
  tokenAddress: string;
  tokenAmount: bigint;
}) {
  const composeGas = await estimateMultichainDepositNetworkComposeGas({
    chainId,
    account,
    srcChainId,
    tokenAddress,
    settlementChainPublicClient: getPublicClient(getRainbowKitConfig(), { chainId })!,
  });

  const sendParams: SendParam = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amount: tokenAmount,
    composeGas,
    isToGmx: true,
    isManualGas: true,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Token ID not found");
  }

  const iStargateInstance = new Contract(sourceChainTokenId.stargate, IStargateAbi, signer) as unknown as IStargate;

  const quoteSend = await iStargateInstance.quoteSend(sendParams, false);

  const value = quoteSend.nativeFee + (tokenAddress === zeroAddress ? tokenAmount : 0n);

  try {
    const txnResult = await sendWalletTransaction({
      chainId: srcChainId!,
      to: sourceChainTokenId.stargate,
      signer,
      callData: encodeFunctionData({
        abi: IStargateAbi as unknown as typeof IStargate__factory.abi,
        functionName: "send",
        args: [sendParams as any, { nativeFee: quoteSend.nativeFee, lzTokenFee: 0n }, account as Hex],
      }),
      value,
      msg: t`Sent transfer in transaction`,
    });

    await txnResult.wait();
  } catch (error) {
    toastCustomOrStargateError(chainId, error);
  }
}
