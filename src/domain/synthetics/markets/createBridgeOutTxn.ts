import type { SettlementChainId, SourceChainId } from "config/chains";
import type { BridgeOutParams } from "domain/multichain/types";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { sendExpressTransaction } from "lib/transactions";
import type { ISigner } from "lib/transactions/iSigner";
import type { WalletSigner } from "lib/wallets";

import { buildAndSignBridgeOutTxn } from "../express/expressOrderUtils";

type TxnParams = {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: WalletSigner | ISigner;
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
