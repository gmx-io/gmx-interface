import { Abi, Address, createPublicClient, createWalletClient, http, PublicClient, WalletClient } from "viem";

import { BATCH_CONFIGS } from "configs/batch";
import { getChain } from "configs/chains";
import { Accounts } from "modules/accounts/accounts";
import { Markets } from "modules/markets";
import { Oracle } from "modules/oracle";
import { Orders } from "modules/orders/orders";
import { Positions } from "modules/positions/positions";
import { Tokens } from "modules/tokens/tokens";
import { Trades } from "modules/trades/trades";
import { Utils } from "modules/utils/utils";
import type { GmxSdkConfig } from "types/sdk";
import { callContract, CallContractOpts } from "utils/callContract";
import { MAX_TIMEOUT, Multicall, MulticallRequestConfig } from "utils/multicall";

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
          batch: BATCH_CONFIGS[this.config.chainId].http,
          timeout: MAX_TIMEOUT,
        }),
        pollingInterval: undefined,
        batch: BATCH_CONFIGS[this.config.chainId].client,
        chain: getChain(this.config.chainId),
      });
    this.walletClient =
      config.walletClient ??
      createWalletClient({
        account: config.account as Address,
        chain: getChain(config.chainId),
        transport: http(config.rpcUrl, {
          retryCount: 0,
          retryDelay: 10000000,
          batch: BATCH_CONFIGS[config.chainId].http,
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
    return getChain(this.chainId);
  }

  get account() {
    return this.config.account as Address;
  }
}
