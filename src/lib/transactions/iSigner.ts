import {
  AddressLike,
  BigNumberish,
  BrowserProvider,
  AbstractSigner as EthersSigner,
  JsonRpcProvider,
  TransactionRequest,
} from "ethers";
import {
  Account,
  Chain,
  Client,
  PrivateKeyAccount,
  PublicActions,
  StateOverride,
  Transport,
  WalletActions,
  WalletRpcSchema,
  PublicClient as ViemPublicClient,
  zeroAddress,
} from "viem";

import { mustNeverExist } from "lib/types";
import { SignatureDomain, SignatureTypes } from "lib/wallets/signing";

export type ISignerSendTransactionParams = Pick<
  TransactionRequest,
  "to" | "data" | "value" | "gasLimit" | "gasPrice" | "nonce" | "from" | "maxFeePerGas" | "maxPriorityFeePerGas"
>;

export type ISignerEstimateGasParams = ISignerSendTransactionParams & {
  stateOverride?: StateOverride;
};

export type ISignerSendTransactionResult = {
  hash: string | undefined;
  wait: () => Promise<
    | {
        blockNumber: number;
        status: number | null;
      }
    | undefined
    | null
  >;
};

type ViemSigner = Client<
  Transport,
  Chain,
  Account,
  WalletRpcSchema,
  WalletActions<Chain, Account> & PublicActions<Transport, Chain, Account>
>;

/**
 * Abstraction above ethers and viem signers
 */
export interface ISignerInterface {
  address: string;
  sendTransaction: (params: ISignerSendTransactionParams) => Promise<ISignerSendTransactionResult>;
  estimateGas: (params: ISignerEstimateGasParams) => Promise<bigint>;
  provider: this;
}

export class ISigner implements ISignerInterface {
  private readonly type: "ethers" | "viem" | "viemPublicClient" | "privateKeyAccount";
  private readonly signer: EthersSigner | ViemSigner | ViemPublicClient | PrivateKeyAccount;

  private _address: string;

  get address() {
    return this._address;
  }

  getAddress() {
    return this._address;
  }

  private constructor({
    ethersSigner,
    viemSigner,
    viemPublicClient,
    privateKeyAccount,
  }: {
    ethersSigner?: EthersSigner;
    viemSigner?: ViemSigner;
    viemPublicClient?: ViemPublicClient;
    privateKeyAccount?: PrivateKeyAccount;
  }) {
    if (ethersSigner) {
      this.type = "ethers";
      this.signer = ethersSigner;
    } else if (viemSigner) {
      this.type = "viem";
      this.signer = viemSigner;
    } else if (viemPublicClient) {
      this.type = "viemPublicClient";
      this.signer = viemPublicClient;
    } else if (privateKeyAccount) {
      this.type = "privateKeyAccount";
      this.signer = privateKeyAccount;
    }
  }

  static async from({
    ethersSigner,
    viemSigner,
    viemPublicClient,
  }: {
    ethersSigner?: EthersSigner;
    viemSigner?: ViemSigner;
    viemPublicClient?: ViemPublicClient;
  }) {
    const gmxSigner = new ISigner({ ethersSigner, viemSigner, viemPublicClient });
    await gmxSigner
      .match<string>({
        viem: (signer: ViemSigner) => signer.account.address,
        ethers: (signer: EthersSigner) => signer.getAddress(),
        viemPublicClient: () => zeroAddress,
        privateKeyAccount: (signer: PrivateKeyAccount) => signer.address,
      })
      .then((address) => (gmxSigner._address = address));
    return gmxSigner;
  }

  static fromPrivateKeyAccount(privateKeyAccount: PrivateKeyAccount): ISigner {
    const gmxSigner = new ISigner({ privateKeyAccount });
    gmxSigner._address = privateKeyAccount.address;
    return gmxSigner;
  }

  static fromViemSigner(viemSigner: ViemSigner): ISigner {
    const gmxSigner = new ISigner({ viemSigner });
    gmxSigner._address = viemSigner.account.address;
    return gmxSigner;
  }

  async sendTransaction(params: ISignerSendTransactionParams): Promise<ISignerSendTransactionResult> {
    return this.match<ISignerSendTransactionResult>({
      viem: async (signer: ViemSigner) =>
        signer
          .sendTransaction({
            to: await toAddress(params.to),
            data: (params.data ?? undefined) as string | undefined,
            value: toBigInt(params.value),
            gas: toBigInt(params.gasLimit),
            gasPrice: toBigInt(params.gasPrice),
            maxFeePerGas: toBigInt(params.maxFeePerGas) as undefined,
            maxPriorityFeePerGas: toBigInt(params.maxPriorityFeePerGas) as undefined,
            nonce: params.nonce !== undefined ? Number(params.nonce) : undefined,
          })
          .then((hash) => ({
            hash,
            wait: () =>
              signer.waitForTransactionReceipt({ hash }).then((receipt) => ({
                blockNumber: Number(receipt.blockNumber),
                status: receipt.status === "success" ? 1 : 0,
              })),
          })),
      ethers: (signer: EthersSigner) =>
        signer
          .sendTransaction({
            to: params.to,
            data: params.data,
            value: params.value,
            gasLimit: params.gasLimit,
            gasPrice: params.gasPrice,
            maxFeePerGas: params.maxFeePerGas,
            maxPriorityFeePerGas: params.maxPriorityFeePerGas,
            nonce: params.nonce !== undefined ? Number(params.nonce) : undefined,
          })
          .then(({ hash, wait }) => ({
            hash,
            wait: () =>
              wait().then((receipt) =>
                receipt
                  ? {
                      blockNumber: Number(receipt.blockNumber),
                      status: receipt.status === 1 ? 1 : 0,
                    }
                  : undefined
              ),
          })),
    });
  }

  async estimateGas(params: ISignerEstimateGasParams): Promise<bigint> {
    return this.match<bigint>({
      viem: async (signer: ViemSigner) =>
        signer.estimateGas({
          to: await toAddress(params.to),
          data: (params.data ?? undefined) as string | undefined,
          value: toBigInt(params.value),
          account: await toAddress(params.from),
          gas: toBigInt(params.gasLimit),
          gasPrice: toBigInt(params.gasPrice),
          maxFeePerGas: toBigInt(params.maxFeePerGas) as undefined,
          maxPriorityFeePerGas: toBigInt(params.maxPriorityFeePerGas) as undefined,
          nonce: params.nonce !== undefined ? Number(params.nonce) : undefined,
          stateOverride: params.stateOverride,
        }),
      ethers: (signer: EthersSigner) => {
        if (params.stateOverride?.length) {
          throw new Error("State override is not supported for ethers signer");
        }
        return signer.estimateGas({
          to: params.to,
          data: params.data,
          value: params.value,
          gasLimit: params.gasLimit,
          gasPrice: params.gasPrice,
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
          from: params.from,
        });
      },
    });
  }

  async call(params: ISignerSendTransactionParams): Promise<string> {
    return this.match<string>({
      viem: async (signer: ViemSigner) =>
        await signer
          .call({
            to: await toAddress(params.to),
            data: (params.data ?? undefined) as string | undefined,
            value: toBigInt(params.value),
            account: await toAddress(params.from),
            gas: toBigInt(params.gasLimit),
            gasPrice: toBigInt(params.gasPrice),
            maxFeePerGas: toBigInt(params.maxFeePerGas) as undefined,
            maxPriorityFeePerGas: toBigInt(params.maxPriorityFeePerGas) as undefined,
            nonce: params.nonce !== undefined ? Number(params.nonce) : undefined,
          })
          .then(({ data }) => data ?? "0x"),
      ethers: (signer: EthersSigner) =>
        signer.call({
          to: params.to,
          data: params.data,
          value: params.value,
          gasLimit: params.gasLimit,
          gasPrice: params.gasPrice,
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
          from: params.from,
          nonce: params.nonce !== undefined ? Number(params.nonce) : undefined,
        }),
    });
  }

  async signTypedData(domain: SignatureDomain, types: SignatureTypes, value: Record<string, any>): Promise<string> {
    return this.match<string>({
      viem: async (signer: ViemSigner) =>
        // TODO: check if primaryType is correct
        signer.signTypedData({ domain, types, message: value, primaryType: Object.keys(types)[0] }),
      ethers: (signer: EthersSigner) => signer.signTypedData(domain, types, value),
      privateKeyAccount: (signer: PrivateKeyAccount) =>
        signer.signTypedData({ domain, types, message: value, primaryType: Object.keys(types)[0] }),
    });
  }

  async send(method: "eth_signTypedData_v4", params: any[]): Promise<string> {
    return this.match<string>({
      viem: async (signer: ViemSigner) => signer.request({ method, params: params as any }),
      ethers: (signer: EthersSigner) => (signer.provider as BrowserProvider | JsonRpcProvider).send(method, params),
    });
  }

  async getBlockNumber(): Promise<number> {
    return this.match<number>({
      viem: async (signer: ViemSigner) => signer.getBlockNumber().then(Number),
      ethers: (signer: EthersSigner) => signer.provider!.getBlockNumber(),
    });
  }

  async getTransaction(hash: string): Promise<ISignerSendTransactionParams | undefined> {
    return this.match<ISignerSendTransactionParams | undefined>({
      viem: async (signer: ViemSigner) =>
        signer
          .getTransaction({
            hash,
          })
          .then((tx): ISignerSendTransactionParams | undefined => ({
            to: tx.to,
            data: tx.input,
            value: tx.value,
            gasLimit: tx.gas,
            gasPrice: tx.gasPrice,
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            from: tx.from,
            nonce: tx.nonce,
          })),
      ethers: (signer: EthersSigner) =>
        signer.provider!.getTransaction(hash).then((tx): ISignerSendTransactionParams | undefined =>
          !tx
            ? undefined
            : {
                to: tx.to,
                data: tx.data,
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                maxFeePerGas: tx.maxFeePerGas,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                from: tx.from,
                nonce: tx.nonce,
              }
        ),
    });
  }

  get provider() {
    return this;
  }

  private async match<T>(branches: {
    viem: (signer: ViemSigner) => T | Promise<T>;
    ethers: (signer: EthersSigner) => T | Promise<T>;
    viemPublicClient?: (signer: ViemPublicClient) => T | Promise<T>;
    privateKeyAccount?: (signer: PrivateKeyAccount) => T | Promise<T>;
  }): Promise<T> {
    switch (this.type) {
      case "ethers":
        return await branches.ethers(this.signer as EthersSigner);
      case "viem":
        return await branches.viem(this.signer as ViemSigner);
      case "viemPublicClient":
        return branches.viemPublicClient
          ? await branches.viemPublicClient(this.signer as ViemPublicClient)
          : await branches.viem(this.signer as ViemSigner);
      case "privateKeyAccount": {
        if (!branches.privateKeyAccount) {
          throw new Error("Private key account branch is not defined");
        }
        return await branches.privateKeyAccount(this.signer as PrivateKeyAccount);
      }
      default: {
        return mustNeverExist(this.type);
      }
    }
  }
}

export async function toAddress(address: AddressLike | undefined | null): Promise<string | undefined> {
  if (address === undefined) {
    return undefined;
  }
  if (typeof address === "string") {
    return address;
  }
  const awaitedAddress = await address;
  if (!awaitedAddress) {
    return undefined;
  }
  if (typeof awaitedAddress === "string") {
    return awaitedAddress;
  }
  return await awaitedAddress.getAddress();
}

function toBigInt(value: BigNumberish | undefined | null): bigint | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return value;
  }

  return BigInt(value);
}
