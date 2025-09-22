import { SettlementChainId, SourceChainId } from "config/chains";
import { BridgeOutParams } from "domain/multichain/types";
import { ExpressTxnParams } from "domain/synthetics/express";
import { sendExpressTransaction } from "lib/transactions";
import { WalletSigner } from "lib/wallets";

import { buildAndSignBridgeOutTxn } from "../express/expressOrderUtils";

type TxnParams = {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  account: string;
  params: BridgeOutParams;
  expressTxnParams: ExpressTxnParams;
};

export async function createBridgeOutTxn({
  chainId,
  srcChainId,
  signer,
  account,
  expressTxnParams,
  relayerFeeAmount,
  relayerFeeTokenAddress,
  params,
}: TxnParams) {
  const txnData = await buildAndSignBridgeOutTxn({
    chainId,
    srcChainId: srcChainId,
    relayParamsPayload: expressTxnParams.relayParamsPayload,
    params,
    signer,
    account,
    relayerFeeTokenAddress,
    relayerFeeAmount,
  });

  const receipt = await sendExpressTransaction({
    chainId,
    isSponsoredCall: expressTxnParams.isSponsoredCall,
    txnData,
  });

  await receipt.wait();
}
