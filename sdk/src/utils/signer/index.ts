export type TypedDataDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type TypedDataTypes = Record<string, { name: string; type: string }[]>;

export interface IAbstractSigner {
  readonly address: string;
  signTypedData(domain: TypedDataDomain, types: TypedDataTypes, value: Record<string, any>): Promise<string>;
  signMessage(message: string): Promise<string>;
  sendTransaction?(tx: { to: string; data: string; value?: bigint }): Promise<string | { hash: string }>;
}

export { PrivateKeySigner } from "./privateKeySigner";
