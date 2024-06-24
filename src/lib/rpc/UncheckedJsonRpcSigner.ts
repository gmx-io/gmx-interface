import { JsonRpcSigner, TransactionRequest, TransactionResponse } from "ethers";
import { getRealChainId } from "lib/chains/getRealChainId";

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

  private async assertNetwork() {
    // Sometimes getNetwork call asserts the network itself, but its metamask, so we need to check it again
    const assumedChainId = Number((await this.provider.getNetwork()).chainId);
    const realChainId = getRealChainId();

    if (realChainId !== undefined && assumedChainId !== realChainId) {
      throw new Error(`Invalid network: wallet is connected to ${realChainId}, but the app is on ${assumedChainId}`);
    }
  }
}
