import { JsonRpcSigner, TransactionRequest, TransactionResponse } from "ethers";

export class UncheckedJsonRpcSigner extends JsonRpcSigner {
  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
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
