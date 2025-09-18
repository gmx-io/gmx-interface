import { encodeFunctionData } from "viem";

import { SettlementChainId, SourceChainId } from "config/chains";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";

import { signCreateBridgeOut } from "./signCreateBridgeOut";

type TxnParams = {
  chainId: SettlementChainId;
  srcChainId: SourceChainId | undefined;
  signer: WalletSigner;
  relayParams: RelayParamsPayload;
  emptySignature?: boolean;
  tokenAddress: string;
  tokenAmount: bigint;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
};

async function buildAndSignBridgeOutTxn({
  chainId,
  srcChainId,
  signer,
  relayParams,
  emptySignature,
  tokenAddress,
  tokenAmount,
  relayerFeeTokenAddress,
  relayerFeeAmount,
}: TxnParams): Promise<ExpressTxnData> {
  let signature: string;

  if (emptySignature) {
    signature = "0x";
  } else {
    signature = await signCreateBridgeOut();
  }

  const bridgeOutData = encodeFunctionData({
    abi: abis.MultichainTransferRouter,
    functionName: "",
  });
}

export async function createBridgeOutTxn({
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
  // const composeGas = await estimateMultichainDepositNetworkComposeGas({
  //   chainId,
  //   account,
  //   srcChainId,
  //   tokenAddress,
  //   settlementChainPublicClient: getPublicClient(getRainbowKitConfig(), { chainId })!,
  // });
  // const sendParams: SendParamStruct = getMultichainTransferSendParams({
  //   dstChainId: chainId,
  //   account,
  //   srcChainId,
  //   amount: tokenAmount,
  //   composeGas,
  //   isToGmx: true,
  //   isManualGas: true,
  // });
  // const sourceChainTokenId = getMappedTokenId(chainId, tokenAddress, srcChainId);
  // if (!sourceChainTokenId) {
  //   throw new Error("Token ID not found");
  // }
  // const iStargateInstance = new Contract(sourceChainTokenId.stargate, IStargateAbi, signer) as unknown as IStargate;
  // const quoteSend = await iStargateInstance.quoteSend(sendParams, false);
  // const value = quoteSend.nativeFee + (tokenAddress === zeroAddress ? tokenAmount : 0n);
  // try {
  //   const txnResult = await sendWalletTransaction({
  //     chainId: srcChainId!,
  //     to: sourceChainTokenId.stargate,
  //     signer,
  //     callData: encodeFunctionData({
  //       abi: IStargateAbi as unknown as typeof IStargate__factory.abi,
  //       functionName: "send",
  //       args: [sendParams, { nativeFee: quoteSend.nativeFee, lzTokenFee: 0n }, account as Hex],
  //     }),
  //     value,
  //     msg: t`Sent transfer in transaction`,
  //   });
  //   await txnResult.wait();
  // } catch (error) {
  //   toastCustomOrStargateError(chainId, error);
  // }
}
