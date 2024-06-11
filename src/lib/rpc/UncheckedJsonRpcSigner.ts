import { JsonRpcSigner, TransactionRequest, TransactionResponse } from "ethers";

export class UncheckedJsonRpcSigner extends JsonRpcSigner {
  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    await this.assertNetwork();

    return super.estimateGas(tx);
  }

  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    await this.assertNetwork();

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

  /**
   * Provider asserts network under the hood on request
   */
  private async assertNetwork() {
    await this.provider.getNetwork();
  }
}
