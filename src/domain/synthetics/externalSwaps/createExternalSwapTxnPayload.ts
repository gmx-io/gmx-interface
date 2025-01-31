import { mustNeverExist } from "lib/types";
import { ExternalSwapAggregator, ExternalSwapQuote } from "./useExternalSwapsQuote";
import { getOpenOceanBuildTx } from "./openOcean";
import { getContract } from "sdk/configs/contracts";

export function createExternalSwapTxnPayload(chainId: number, externalSwapQuote: ExternalSwapQuote) {
  switch (externalSwapQuote.aggregator) {
    case ExternalSwapAggregator.OpenOcean:
      return getOpenOceanBuildTx({
        chainId,
        senderAddress: getContract(chainId, "ExternalHandler"),
        receiverAddress: getContract(chainId, "OrderVault"),
        tokenInAddress: externalSwapQuote.fromTokenAddress,
        tokenOutAddress: externalSwapQuote.toTokenAddress,
        tokenInAmount: externalSwapQuote.fromTokenAmount,
        slippage: externalSwapQuote.slippage,
      });
    default:
      mustNeverExist(externalSwapQuote.aggregator);
  }
}
