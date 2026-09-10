/* eslint-disable no-console */
import { ethers } from "ethers";

import { ARBITRUM } from "sdk/configs/chainIds";
import { getContract } from "sdk/configs/contracts";

import { RpcRequest, RpcResponder } from "./types";

const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function hashString(value: string): string {
  return ethers.keccak256(abiCoder.encode(["string"], [value]));
}

function hashData(types: string[], values: unknown[]): string {
  return ethers.keccak256(abiCoder.encode(types, values));
}

const SUBACCOUNT_LIST_KEY = hashString("SUBACCOUNT_LIST");
const MAX_ALLOWED_SUBACCOUNT_ACTION_COUNT = hashString("MAX_ALLOWED_SUBACCOUNT_ACTION_COUNT");
const SUBACCOUNT_ACTION_COUNT = hashString("SUBACCOUNT_ACTION_COUNT");
const SUBACCOUNT_EXPIRES_AT = hashString("SUBACCOUNT_EXPIRES_AT");
const SUBACCOUNT_INTEGRATION_ID = hashString("SUBACCOUNT_INTEGRATION_ID");
export const SUBACCOUNT_ORDER_ACTION_HASH = hashString("SUBACCOUNT_ORDER_ACTION");

export function subaccountListKey(account: string): string {
  return hashData(["bytes32", "address"], [SUBACCOUNT_LIST_KEY, account]);
}

export function maxAllowedSubaccountActionCountKey(account: string, subaccount: string): string {
  return hashData(
    ["bytes32", "address", "address", "bytes32"],
    [MAX_ALLOWED_SUBACCOUNT_ACTION_COUNT, account, subaccount, SUBACCOUNT_ORDER_ACTION_HASH]
  );
}

export function subaccountActionCountKey(account: string, subaccount: string): string {
  return hashData(
    ["bytes32", "address", "address", "bytes32"],
    [SUBACCOUNT_ACTION_COUNT, account, subaccount, SUBACCOUNT_ORDER_ACTION_HASH]
  );
}

export function subaccountExpiresAtKey(account: string, subaccount: string): string {
  return hashData(
    ["bytes32", "address", "address", "bytes32"],
    [SUBACCOUNT_EXPIRES_AT, account, subaccount, SUBACCOUNT_ORDER_ACTION_HASH]
  );
}

export function subaccountIntegrationIdKey(account: string, subaccount: string): string {
  return hashData(["bytes32", "address", "address"], [SUBACCOUNT_INTEGRATION_ID, account, subaccount]);
}

export const ARBITRUM_CONTRACTS = {
  DataStore: getContract(ARBITRUM, "DataStore"),
  SubaccountRouter: getContract(ARBITRUM, "SubaccountRouter"),
  SubaccountGelatoRelayRouter: getContract(ARBITRUM, "SubaccountGelatoRelayRouter"),
  MultichainSubaccountRouter: getContract(ARBITRUM, "MultichainSubaccountRouter"),
};

const IFACE = new ethers.Interface([
  "function containsAddress(bytes32 setKey, address value) view returns (bool)",
  "function getUint(bytes32 key) view returns (uint256)",
  "function getBytes32(bytes32 key) view returns (bytes32)",
  "function getAddress(bytes32 key) view returns (address)",
  "function subaccountApprovalNonces(address account) view returns (uint256)",
  "function traderReferralCodes(address account) view returns (bytes32)",
  "function gasEstimateL1Component(address to, bool contractCreation, bytes data) payable returns (uint64 gasEstimateForL1, uint256 baseFee, uint256 l1BaseFeeEstimate)",
  "function removeSubaccount(address subaccount)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function getEthBalance(address account) view returns (uint256)",
  "function getBlockNumber() view returns (uint256)",
  "function arbBlockNumber() view returns (uint256)",
  "function getCurrentBlockTimestamp() view returns (uint256)",
  "function aggregate((address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)",
  "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) view returns ((bool success, bytes returnData)[] returnData)",
]);

const SELECTORS = {
  containsAddress: IFACE.getFunction("containsAddress")!.selector,
  getUint: IFACE.getFunction("getUint")!.selector,
  getBytes32: IFACE.getFunction("getBytes32")!.selector,
  getAddress: IFACE.getFunction("getAddress")!.selector,
  subaccountApprovalNonces: IFACE.getFunction("subaccountApprovalNonces")!.selector,
  traderReferralCodes: IFACE.getFunction("traderReferralCodes")!.selector,
  gasEstimateL1Component: IFACE.getFunction("gasEstimateL1Component")!.selector,
  removeSubaccount: IFACE.getFunction("removeSubaccount")!.selector,
  balanceOf: IFACE.getFunction("balanceOf")!.selector,
  allowance: IFACE.getFunction("allowance")!.selector,
  getEthBalance: IFACE.getFunction("getEthBalance")!.selector,
  getBlockNumber: IFACE.getFunction("getBlockNumber")!.selector,
  arbBlockNumber: IFACE.getFunction("arbBlockNumber")!.selector,
  getCurrentBlockTimestamp: IFACE.getFunction("getCurrentBlockTimestamp")!.selector,
  aggregate: IFACE.getFunction("aggregate")!.selector,
  aggregate3: IFACE.getFunction("aggregate3")!.selector,
};

const ZERO_HASH = "0x" + "0".repeat(64);

function normalizeAddress(value: string): string | undefined {
  try {
    return ethers.getAddress(value);
  } catch {
    return undefined;
  }
}

function isSameAddress(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) {
    return false;
  }
  return normalizeAddress(a) === normalizeAddress(b);
}

export type SubaccountOnchainState = {
  active: boolean;
  maxAllowedCount: bigint;
  currentActionsCount: bigint;
  expiresAt: bigint;
  approvalNonce: bigint;
  multichainApprovalNonce: bigint;
  integrationId: string;
};

export type SentTransaction = {
  chainId: number;
  to: string | undefined;
  data: string;
  from: string | undefined;
  hash: string;
};

export type SignedTypedDataRecord = {
  from: string;
  payload: {
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    domain: Record<string, unknown>;
    message: Record<string, unknown>;
  };
  signature: string;
};

export type MockChainOptions = {
  walletPrivateKey: string;
  subaccountAddress?: string;
  onchain?: Partial<SubaccountOnchainState>;
};

/** Synthetic, stateful chain: the test sets the state it wants and the mock derives every answer. */
export class MockChain implements RpcResponder {
  wallet: ethers.Wallet;
  account: string;
  subaccountAddress: string | undefined;

  onchain: SubaccountOnchainState = {
    active: false,
    maxAllowedCount: 0n,
    currentActionsCount: 0n,
    expiresAt: 0n,
    approvalNonce: 0n,
    multichainApprovalNonce: 0n,
    integrationId: ZERO_HASH,
  };

  balances: Record<string, bigint> = {};
  defaultBalance = 10n * 10n ** 18n;

  /** ERC20 balances: token address -> holder -> amount. Unset pairs read as 0. */
  tokenBalances: Record<string, Record<string, bigint>> = {};
  /** DataStore uint slots by key, for everything outside the subaccount keys resolved below. */
  dataStoreUints: Record<string, bigint> = {};
  /** DataStore address slots by key. Unset keys read as the zero address. */
  dataStoreAddresses: Record<string, string> = {};

  rejectTypedDataSign = false;
  rejectMessageSign = false;
  rejectSendTransaction = false;
  estimateGasError: string | undefined = undefined;
  sendTransactionError: string | undefined = undefined;

  sentTransactions: SentTransaction[] = [];
  signedTypedData: SignedTypedDataRecord[] = [];
  signedMessages: { from: string; data: string; signature: string }[] = [];
  unknownMethods = new Set<string>();
  /** `eth_call` selectors no branch answers — they silently decode as empty data. */
  unknownCallSelectors = new Set<string>();
  rpcLog: { method: string; error?: string }[] = [];

  private blockNumber = 1000;

  constructor(options: MockChainOptions) {
    this.wallet = new ethers.Wallet(options.walletPrivateKey);
    this.account = this.wallet.address;
    this.subaccountAddress = options.subaccountAddress;
    Object.assign(this.onchain, options.onchain);
  }

  setBalance(address: string, value: bigint) {
    this.balances[ethers.getAddress(address)] = value;
  }

  setTokenBalance({ token, holder, value }: { token: string; holder: string; value: bigint }) {
    const byHolder = this.tokenBalances[ethers.getAddress(token)] ?? {};
    byHolder[ethers.getAddress(holder)] = value;
    this.tokenBalances[ethers.getAddress(token)] = byHolder;
  }

  setDataStoreUint(key: string, value: bigint) {
    this.dataStoreUints[key] = value;
  }

  setDataStoreAddress(key: string, value: string) {
    this.dataStoreAddresses[key] = ethers.getAddress(value);
  }

  async handle(chainId: number, { method, params = [] }: RpcRequest): Promise<unknown> {
    try {
      const result = await this.dispatch(chainId, method, params as unknown[]);
      this.rpcLog.push({ method });
      return result;
    } catch (error) {
      this.rpcLog.push({ method, error: (error as Error).message });
      throw error;
    }
  }

  private rpcError(message: string, code = -32000): never {
    const error = new Error(message) as Error & { rpcCode: number };
    error.rpcCode = code;
    throw error;
  }

  private async dispatch(chainId: number, method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case "eth_chainId":
        return "0x" + chainId.toString(16);
      case "net_version":
        return String(chainId);
      case "eth_accounts":
        return [this.account];
      case "eth_blockNumber":
        this.blockNumber += 1;
        return "0x" + this.blockNumber.toString(16);
      case "eth_getBlockByNumber":
      case "eth_getBlockByHash":
        return this.getBlock();
      case "eth_gasPrice":
        return "0x5f5e100";
      case "eth_maxPriorityFeePerGas":
        return "0xf4240";
      case "eth_getBalance": {
        const address = normalizeAddress(params[0] as string);
        const balance =
          address !== undefined && address in this.balances ? this.balances[address] : this.defaultBalance;
        return "0x" + balance.toString(16);
      }
      case "eth_getCode":
        return "0x";
      case "eth_getTransactionCount":
        return "0x0";
      case "eth_estimateGas":
        if (this.estimateGasError) {
          this.rpcError(this.estimateGasError);
        }
        return "0x30d40";
      case "eth_call":
        return this.handleCall(params[0] as { to?: string; data?: string; input?: string });
      case "eth_getLogs":
        return [];
      case "eth_sendTransaction":
        return this.handleSendTransaction(chainId, params[0] as { to?: string; data?: string; from?: string });
      case "eth_getTransactionReceipt":
        return this.getReceipt(params[0] as string);
      case "eth_getTransactionByHash":
        return this.getTransactionByHash(params[0] as string);
      case "eth_sign": {
        return this.signMessage(params[0] as string, params[1] as string);
      }
      case "personal_sign": {
        return this.signMessage(params[1] as string, params[0] as string);
      }
      case "eth_signTypedData_v4":
        return this.signTypedData(params[0] as string, params[1] as string);
      default:
        this.unknownMethods.add(method);
        return null;
    }
  }

  private getBlock() {
    this.blockNumber += 1;
    const hexNumber = "0x" + this.blockNumber.toString(16);
    return {
      number: hexNumber,
      hash: ethers.keccak256(ethers.toUtf8Bytes(`block-${this.blockNumber}`)),
      parentHash: ethers.keccak256(ethers.toUtf8Bytes(`block-${this.blockNumber - 1}`)),
      timestamp: "0x" + Math.floor(Date.now() / 1000).toString(16),
      nonce: "0x0000000000000000",
      difficulty: "0x0",
      gasLimit: "0x1c9c380",
      gasUsed: "0x5208",
      miner: "0x0000000000000000000000000000000000000000",
      extraData: "0x",
      baseFeePerGas: "0x5f5e100",
      transactions: [],
      logsBloom: "0x" + "0".repeat(512),
      receiptsRoot: ZERO_HASH,
      sha3Uncles: ZERO_HASH,
      stateRoot: ZERO_HASH,
      transactionsRoot: ZERO_HASH,
      size: "0x220",
      uncles: [],
    };
  }

  private async signMessage(from: string, data: string): Promise<string> {
    if (this.rejectMessageSign) {
      this.rpcError("User rejected the request.", 4001);
    }
    if (!isSameAddress(from, this.account)) {
      this.rpcError(`Unknown signer: ${from}`);
    }

    const signature = await this.wallet.signMessage(ethers.getBytes(data));
    this.signedMessages.push({ from, data, signature });
    return signature;
  }

  private async signTypedData(from: string, payloadJson: string): Promise<string> {
    if (this.rejectTypedDataSign) {
      this.rpcError("User rejected the request.", 4001);
    }
    if (!isSameAddress(from, this.account)) {
      this.rpcError(`Unknown signer: ${from}`);
    }

    const payload = JSON.parse(payloadJson) as SignedTypedDataRecord["payload"];
    const types = { ...payload.types };
    delete (types as Record<string, unknown>).EIP712Domain;

    const signature = await this.wallet.signTypedData(payload.domain as ethers.TypedDataDomain, types, payload.message);
    this.signedTypedData.push({ from, payload, signature });
    return signature;
  }

  private handleSendTransaction(chainId: number, tx: { to?: string; data?: string; from?: string }): string {
    if (this.rejectSendTransaction) {
      this.rpcError("User rejected the request.", 4001);
    }
    if (this.sendTransactionError) {
      this.rpcError(this.sendTransactionError);
    }

    const hash = ethers.keccak256(ethers.toUtf8Bytes(`txn-${this.sentTransactions.length}-${tx.data ?? ""}`));
    this.sentTransactions.push({ chainId, to: tx.to, data: tx.data ?? "0x", from: tx.from, hash });

    if (
      isSameAddress(tx.to, ARBITRUM_CONTRACTS.SubaccountRouter) &&
      (tx.data ?? "").startsWith(SELECTORS.removeSubaccount)
    ) {
      this.onchain.active = false;
    }

    return hash;
  }

  private getReceipt(hash: string) {
    const txn = this.sentTransactions.find((t) => t.hash === hash);
    if (!txn) {
      return null;
    }

    this.blockNumber += 1;
    return {
      transactionHash: hash,
      transactionIndex: "0x0",
      blockHash: ethers.keccak256(ethers.toUtf8Bytes(`block-${this.blockNumber}`)),
      blockNumber: "0x" + this.blockNumber.toString(16),
      from: txn.from ?? this.account,
      to: txn.to ?? null,
      cumulativeGasUsed: "0x5208",
      gasUsed: "0x5208",
      effectiveGasPrice: "0x5f5e100",
      contractAddress: null,
      logs: [],
      logsBloom: "0x" + "0".repeat(512),
      status: "0x1",
      type: "0x2",
    };
  }

  private getTransactionByHash(hash: string) {
    const txn = this.sentTransactions.find((t) => t.hash === hash);
    if (!txn) {
      return null;
    }
    return {
      hash,
      nonce: "0x0",
      blockHash: ethers.keccak256(ethers.toUtf8Bytes(`block-${this.blockNumber}`)),
      blockNumber: "0x" + this.blockNumber.toString(16),
      transactionIndex: "0x0",
      from: txn.from ?? this.account,
      to: txn.to ?? null,
      value: "0x0",
      gas: "0x30d40",
      gasPrice: "0x5f5e100",
      maxFeePerGas: "0x5f5e100",
      maxPriorityFeePerGas: "0xf4240",
      input: txn.data,
      chainId: "0x" + txn.chainId.toString(16),
      type: "0x2",
      v: "0x0",
      r: ZERO_HASH,
      s: ZERO_HASH,
      accessList: [],
    };
  }

  private handleCall(call: { to?: string; data?: string; input?: string }): string {
    const data = call.data ?? call.input ?? "0x";
    const to = call.to;
    return this.executeCall(to, data);
  }

  private executeCall(to: string | undefined, data: string): string {
    const selector = data.slice(0, 10);

    switch (selector) {
      case SELECTORS.aggregate: {
        const [calls] = IFACE.decodeFunctionData("aggregate", data) as unknown as [
          { target: string; callData: string }[],
        ];
        const returnData = calls.map((innerCall) => this.executeCall(innerCall.target, innerCall.callData));
        return IFACE.encodeFunctionResult("aggregate", [BigInt(this.blockNumber), returnData]);
      }
      case SELECTORS.aggregate3: {
        const [calls] = IFACE.decodeFunctionData("aggregate3", data) as unknown as [
          { target: string; allowFailure: boolean; callData: string }[],
        ];
        const results = calls.map((innerCall) => ({
          success: true,
          returnData: this.executeCall(innerCall.target, innerCall.callData),
        }));
        return IFACE.encodeFunctionResult("aggregate3", [results]);
      }
      case SELECTORS.containsAddress: {
        const [setKey, value] = IFACE.decodeFunctionData("containsAddress", data) as unknown as [string, string];
        const isActive =
          setKey === subaccountListKey(this.account) &&
          isSameAddress(value, this.subaccountAddress) &&
          this.onchain.active;
        return IFACE.encodeFunctionResult("containsAddress", [isActive]);
      }
      case SELECTORS.getUint: {
        const [key] = IFACE.decodeFunctionData("getUint", data) as unknown as [string];
        return IFACE.encodeFunctionResult("getUint", [this.resolveUintKey(key)]);
      }
      case SELECTORS.getAddress: {
        const [key] = IFACE.decodeFunctionData("getAddress", data) as unknown as [string];
        return IFACE.encodeFunctionResult("getAddress", [this.dataStoreAddresses[key] ?? ethers.ZeroAddress]);
      }
      case SELECTORS.balanceOf: {
        const [holder] = IFACE.decodeFunctionData("balanceOf", data) as unknown as [string];
        const token = to === undefined ? undefined : normalizeAddress(to);
        const balance = token === undefined ? 0n : this.tokenBalances[token]?.[ethers.getAddress(holder)] ?? 0n;
        return IFACE.encodeFunctionResult("balanceOf", [balance]);
      }
      case SELECTORS.getBlockNumber: {
        return IFACE.encodeFunctionResult("getBlockNumber", [BigInt(this.blockNumber)]);
      }
      case SELECTORS.arbBlockNumber: {
        return IFACE.encodeFunctionResult("arbBlockNumber", [BigInt(this.blockNumber)]);
      }
      case SELECTORS.getCurrentBlockTimestamp: {
        return IFACE.encodeFunctionResult("getCurrentBlockTimestamp", [BigInt(Math.floor(Date.now() / 1000))]);
      }
      case SELECTORS.getEthBalance: {
        const [holder] = IFACE.decodeFunctionData("getEthBalance", data) as unknown as [string];
        const address = normalizeAddress(holder);
        const balance =
          address !== undefined && address in this.balances ? this.balances[address] : this.defaultBalance;
        return IFACE.encodeFunctionResult("getEthBalance", [balance]);
      }
      case SELECTORS.allowance: {
        return IFACE.encodeFunctionResult("allowance", [ethers.MaxUint256]);
      }
      case SELECTORS.getBytes32: {
        const [key] = IFACE.decodeFunctionData("getBytes32", data) as unknown as [string];
        const value =
          this.subaccountAddress && key === subaccountIntegrationIdKey(this.account, this.subaccountAddress)
            ? this.onchain.integrationId
            : ZERO_HASH;
        return IFACE.encodeFunctionResult("getBytes32", [value]);
      }
      case SELECTORS.gasEstimateL1Component: {
        return IFACE.encodeFunctionResult("gasEstimateL1Component", [10_000n, 100_000_000n, 100_000_000n]);
      }
      case SELECTORS.traderReferralCodes: {
        return IFACE.encodeFunctionResult("traderReferralCodes", [ZERO_HASH]);
      }
      case SELECTORS.subaccountApprovalNonces: {
        let nonce = 0n;
        if (isSameAddress(to, ARBITRUM_CONTRACTS.SubaccountGelatoRelayRouter)) {
          nonce = this.onchain.approvalNonce;
        } else if (isSameAddress(to, ARBITRUM_CONTRACTS.MultichainSubaccountRouter)) {
          nonce = this.onchain.multichainApprovalNonce;
        }
        return IFACE.encodeFunctionResult("subaccountApprovalNonces", [nonce]);
      }
      default:
        this.unknownCallSelectors.add(selector);
        return "0x";
    }
  }

  private resolveUintKey(key: string): bigint {
    if (key in this.dataStoreUints) {
      return this.dataStoreUints[key];
    }

    if (!this.subaccountAddress) {
      return 0n;
    }

    if (key === maxAllowedSubaccountActionCountKey(this.account, this.subaccountAddress)) {
      return this.onchain.maxAllowedCount;
    }
    if (key === subaccountActionCountKey(this.account, this.subaccountAddress)) {
      return this.onchain.currentActionsCount;
    }
    if (key === subaccountExpiresAtKey(this.account, this.subaccountAddress)) {
      return this.onchain.expiresAt;
    }

    return 0n;
  }
}

export const GELATO_RELAY_HOST = "api.gelato.cloud";

const GELATO_ERRORS_IFACE = new ethers.Interface([
  "error InsufficientMultichainBalance(address account, address token, uint256 balance, uint256 amount)",
]);

export type RelaySentTransaction = {
  chainId: string;
  to: string;
  data: string;
  taskId: string;
};

/** The relay is chain-agnostic — the chain a transaction targets comes in `params.chainId`. */
export class MockGelatoRelay implements RpcResponder {
  chain: MockChain;

  simulateInsufficientBalanceForToken: string | undefined = undefined;

  sentTransactions: RelaySentTransaction[] = [];
  rpcLog: { method: string; error?: string }[] = [];
  /** Relay methods no branch answers — they are rejected with -32601. */
  unknownMethods = new Set<string>();

  constructor(chain: MockChain) {
    this.chain = chain;
  }

  async handle(_chainId: number, { method, params = {} }: RpcRequest): Promise<unknown> {
    const relayParams = params as Record<string, unknown>;

    switch (method) {
      case "relayer_sendTransaction": {
        if (this.simulateInsufficientBalanceForToken) {
          const revertData = GELATO_ERRORS_IFACE.encodeErrorResult("InsufficientMultichainBalance", [
            this.chain.account,
            this.simulateInsufficientBalanceForToken,
            0n,
            10n ** 6n,
          ]);
          this.rpcError(method, "Transaction reverted on simulation.", 4211, revertData);
        }

        const to = relayParams.to as string;
        const data = (relayParams.data as string) ?? "0x";
        const taskId = ethers.keccak256(ethers.toUtf8Bytes(`gelato-task-${this.sentTransactions.length}-${data}`));
        this.sentTransactions.push({ chainId: String(relayParams.chainId), to, data, taskId });

        if (
          isSameAddress(to, ARBITRUM_CONTRACTS.MultichainSubaccountRouter) ||
          isSameAddress(to, ARBITRUM_CONTRACTS.SubaccountGelatoRelayRouter)
        ) {
          this.chain.onchain.active = false;
        }

        this.rpcLog.push({ method });
        return taskId;
      }
      case "relayer_getStatus": {
        const taskId = relayParams.id as string;
        const known = this.sentTransactions.find((t) => t.taskId === taskId);

        if (!known) {
          this.rpcError(method, "Unknown transaction id", 4207);
        }

        this.rpcLog.push({ method });
        return {
          id: taskId,
          chainId: Number(known.chainId),
          createdAt: Date.now(),
          status: 200,
          receipt: this.buildRawReceipt(known),
        };
      }
      default:
        this.unknownMethods.add(method);
        this.rpcError(method, "Method not found.", -32601);
    }
  }

  private rpcError(method: string, message: string, code: number, data?: string): never {
    this.rpcLog.push({ method, error: message });
    const error = new Error(message) as Error & { rpcCode: number; rpcData?: string };
    error.rpcCode = code;
    error.rpcData = data;
    throw error;
  }

  private buildRawReceipt(txn: RelaySentTransaction) {
    return {
      transactionHash: ethers.keccak256(ethers.toUtf8Bytes(`gelato-txn-${txn.taskId}`)),
      transactionIndex: "0x0",
      blockHash: ethers.keccak256(ethers.toUtf8Bytes(`gelato-block-${txn.taskId}`)),
      blockNumber: "0x3e9",
      from: this.chain.account,
      to: txn.to,
      cumulativeGasUsed: "0x5208",
      gasUsed: "0x5208",
      effectiveGasPrice: "0x5f5e100",
      contractAddress: null,
      logs: [],
      logsBloom: "0x" + "0".repeat(512),
      status: "0x1",
      type: "0x2",
    };
  }
}

export const MOCK_ACCOUNT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const SUBACCOUNT_MESSAGE =
  "Generate a GMX 1CT (One-Click Trading) session. Only sign this message on a trusted website.";

export const SEEDED_SUBACCOUNT_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

export const SEEDED_SUBACCOUNT_ADDRESS = new ethers.Wallet(SEEDED_SUBACCOUNT_PRIVATE_KEY).address;

export async function deriveGeneratedSubaccount(walletPrivateKey: string, subaccountMessage: string) {
  const wallet = new ethers.Wallet(walletPrivateKey);
  const signature = await wallet.signMessage(subaccountMessage);
  const privateKey = ethers.keccak256(signature);
  const address = ethers.computeAddress(privateKey);
  return { privateKey, address, signature };
}
