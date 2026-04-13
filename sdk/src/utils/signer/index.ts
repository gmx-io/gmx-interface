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
}

export { PrivateKeySigner } from "./privateKeySigner";
