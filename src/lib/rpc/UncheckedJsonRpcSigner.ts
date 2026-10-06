import { JsonRpcSigner, TransactionRequest, TransactionResponse } from "ethers";

export class UncheckedJsonRpcSigner extends JsonRpcSigner {
  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    await this.assertNetwork(tx.chainId ?? (await this.provider.getNetwork()).chainId);

    return super.estimateGas(tx);
  }

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

  async sendUncheckedTransaction(transaction: TransactionRequest): Promise<string> {
    const tx = { ...transaction };
    await this.assertNetwork(tx.chainId);

    return super.sendUncheckedTransaction(tx);
  }

  private async assertNetwork(expectedChainId: TransactionRequest["chainId"]) {
    if (expectedChainId == null) {
      throw new Error("Transaction chainId is required");
    }

    const chainId = BigInt(expectedChainId);
    if (chainId <= 0n) {
      throw new Error("Invalid transaction chainId");
    }

    // Read the wallet directly: provider and wagmi snapshots can both be stale.
    const realChainId = BigInt(await this.provider.send("eth_chainId", []));

    if (realChainId !== chainId) {
      throw new Error(
        `Invalid network: wallet is connected to ${realChainId}, but the transaction is on ${expectedChainId}`
      );
    }
  }
}
