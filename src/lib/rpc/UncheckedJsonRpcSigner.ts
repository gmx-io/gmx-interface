import { JsonRpcSigner, TransactionRequest, TransactionResponse } from "ethers";
import { getRealChainId } from "lib/chains/getRealChainId";

export class UncheckedJsonRpcSigner extends JsonRpcSigner {
  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    const assumedChainId = Number((await this.provider.getNetwork()).chainId);
    const realChainId = getRealChainId();

    if (assumedChainId !== realChainId) {
      throw new Error(
        `Invalid chainId: wallet is connected to chain ${assumedChainId}, but the app is running on chain ${realChainId}.`
      );
    }

    return this.sendUncheckedTransaction(transaction).then((hash) => {
      return {
        hash,
        nonce: null,
        gasLimit: null,
        gasPrice: null,
        data: null,
        value: null,
        chainId: null,
        confirmations: 0,
        from: null,
        wait: (confirmations?: number) => {
          return this.provider.waitForTransaction(hash, confirmations);
        },
      } as unknown as TransactionResponse;
    });
  }
}
