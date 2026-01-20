import { Abi, Address, createPublicClient, createWalletClient, http, PublicClient, WalletClient } from "viem";

import { callContract, CallContractOpts } from "clients/v1/callContract";
import { Accounts } from "clients/v1/modules/accounts/accounts";
import { Markets } from "clients/v1/modules/markets";
import { Oracle } from "clients/v1/modules/oracle";
import { Orders } from "clients/v1/modules/orders/orders";
import { Positions } from "clients/v1/modules/positions/positions";
import { Tokens } from "clients/v1/modules/tokens/tokens";
import { Trades } from "clients/v1/modules/trades/trades";
import { Utils } from "clients/v1/modules/utils/utils";
import { MAX_TIMEOUT, Multicall, MulticallRequestConfig } from "clients/v1/multicall";
import { BATCH_CONFIGS } from "configs/batch";
import { getViemChain } from "configs/chains";
import type { GmxSdkConfig } from "./types";

export class GmxSdk {
  public readonly markets = new Markets(this);
  public readonly tokens = new Tokens(this);
  public readonly positions = new Positions(this);
  public readonly orders = new Orders(this);
  public readonly trades = new Trades(this);
  public readonly accounts = new Accounts(this);
  public readonly utils = new Utils(this);
  public readonly oracle: Oracle;

  public publicClient: PublicClient;
  public walletClient: WalletClient;

  constructor(public config: GmxSdkConfig) {
    this.oracle = new Oracle(this);

    this.publicClient =
      config.publicClient ??
      createPublicClient({
        transport: http(this.config.rpcUrl, {
          // retries works strangely in viem, so we disable them
          retryCount: 0,
          retryDelay: 10000000,
          batch: BATCH_CONFIGS[this.config.chainId]?.http,
          timeout: MAX_TIMEOUT,
        }),
        pollingInterval: undefined,
        batch: BATCH_CONFIGS[this.config.chainId]?.client,
        chain: getViemChain(this.config.chainId),
      });
    this.walletClient =
      config.walletClient ??
      createWalletClient({
        account: config.account as Address,
        chain: getViemChain(config.chainId),
        transport: http(config.rpcUrl, {
          retryCount: 0,
          retryDelay: 10000000,
          batch: BATCH_CONFIGS[config.chainId]?.http,
          timeout: MAX_TIMEOUT,
        }),
      });
  }

  setAccount(account: Address) {
    this.config.account = account;
  }

  async executeMulticall<T = any>(request: MulticallRequestConfig<any>) {
    const multicall = await Multicall.getInstance(this);
    return multicall?.call(request, MAX_TIMEOUT) as Promise<T>;
  }

  async callContract(address: Address, abi: Abi, method: string, params: any[], opts?: CallContractOpts) {
    return callContract(this, address, abi, method, params, opts);
  }

  get chainId() {
    return this.config.chainId;
  }

  get chain() {
    return getViemChain(this.chainId);
  }

  get account() {
    return this.config.account as Address;
  }
}
