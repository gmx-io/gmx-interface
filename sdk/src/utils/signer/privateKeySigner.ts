import { createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "./index";

export class PrivateKeySigner implements IAbstractSigner {
  readonly address: string;
  private account: ReturnType<typeof privateKeyToAccount>;
  private _chain?: Chain;
  private _rpcUrl?: string;

  constructor(privateKey: `0x${string}`, options?: { rpcUrl?: string; chain?: Chain }) {
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;
    this._rpcUrl = options?.rpcUrl;
    this._chain = options?.chain;
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: TypedDataTypes,
    value: Record<string, any>
  ): Promise<string> {
    return this.account.signTypedData({
      domain,
      types,
      primaryType: Object.keys(types)[0],
      message: value,
    });
  }

  async signMessage(message: string): Promise<string> {
    return this.account.signMessage({ message });
  }

  async sendTransaction(tx: { to: string; data: string; value?: bigint }): Promise<string> {
    if (!this._rpcUrl) {
      throw new Error(
        "sendTransaction requires rpcUrl in PrivateKeySigner constructor options. " +
          "Pass { rpcUrl: '...' } as the second argument."
      );
    }
    const client = createWalletClient({
      account: this.account,
      chain: this._chain,
      transport: http(this._rpcUrl),
    });
    return client.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ?? 0n,
      chain: this._chain,
    });
  }
}
