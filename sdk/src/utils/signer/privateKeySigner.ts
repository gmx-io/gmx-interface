import { privateKeyToAccount } from "viem/accounts";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "./index";

export class PrivateKeySigner implements IAbstractSigner {
  readonly address: string;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor(privateKey: `0x${string}`) {
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;
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
}
