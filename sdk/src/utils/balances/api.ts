import { encodeFunctionData } from "viem";

import ERC20ABI from "abis/Token";
import { ContractsChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { IHttp } from "utils/http/types";
import { MaxUint256 } from "utils/numbers";
import type { IAbstractSigner } from "utils/signer";

export type ApproveTokenParams = {
  tokenAddress: string;
  spender: SpenderType;
  amount?: bigint;
};

export type ApproveTokenResult = {
  to: string;
  data: string;
  value: bigint;
};

/** Chain-agnostic ERC20.approve params — `spender` is any address, no SDK-side resolution. */
export type Erc20ApproveParams = {
  tokenAddress: string;
  spender: string;
  amount?: bigint;
};

export type WalletBalance = {
  symbol: string;
  address: string;
  decimals: number;
  balance: bigint;
};

export type TokenAllowance = {
  symbol: string;
  address: string;
  decimals: number;
  allowance: bigint;
};

export type SpenderType = "router";

function parseWalletBalances(raw: any[]): WalletBalance[] {
  return raw.map((item) => ({
    symbol: item.symbol,
    address: item.address,
    decimals: item.decimals,
    balance: BigInt(item.balance),
  }));
}

function parseAllowances(raw: any[]): TokenAllowance[] {
  return raw.map((item) => ({
    symbol: item.symbol,
    address: item.address,
    decimals: item.decimals,
    allowance: BigInt(item.allowance),
  }));
}

export async function fetchWalletBalances(ctx: { api: IHttp }, params: { address: string }): Promise<WalletBalance[]> {
  return ctx.api.fetchJson<WalletBalance[]>("/balances/wallet", {
    query: { address: params.address },
    transform: parseWalletBalances,
  });
}

export async function fetchAllowances(
  ctx: { api: IHttp },
  params: { address: string; spender: SpenderType }
): Promise<TokenAllowance[]> {
  return ctx.api.fetchJson<TokenAllowance[]>("/allowances", {
    query: { address: params.address, spender: params.spender },
    transform: parseAllowances,
  });
}

function resolveSpenderAddress(chainId: ContractsChainId, spender: SpenderType): string {
  switch (spender) {
    case "router":
      return getContract(chainId, "SyntheticsRouter");
    default:
      throw new Error(`Invalid spender: ${spender}`);
  }
}

export function buildApproveTransaction(
  ctx: { chainId: ContractsChainId },
  params: ApproveTokenParams
): ApproveTokenResult {
  const spenderAddress = resolveSpenderAddress(ctx.chainId, params.spender);
  return buildErc20ApproveTxn({
    tokenAddress: params.tokenAddress,
    spender: spenderAddress,
    amount: params.amount,
  });
}

/**
 * Pure encoder for `ERC20.approve(spender, amount)`. Works on any chain — the spender is supplied
 * by the caller (e.g. a Stargate Pool on a source chain), so no SDK-side address registry is touched.
 */
export function buildErc20ApproveTxn(params: Erc20ApproveParams): ApproveTokenResult {
  const data = encodeFunctionData({
    abi: ERC20ABI,
    functionName: "approve",
    args: [params.spender, params.amount ?? MaxUint256],
  });

  return {
    to: params.tokenAddress,
    data,
    value: 0n,
  };
}

/** Build + sign + send `ERC20.approve` via the provided signer. Returns the tx hash. */
export async function executeErc20Approve(signer: IAbstractSigner, params: Erc20ApproveParams): Promise<string> {
  if (!signer.sendTransaction) {
    throw new Error("Signer does not support sendTransaction; use buildErc20ApproveTxn and submit via your wallet.");
  }
  const txn = buildErc20ApproveTxn(params);
  const result = await signer.sendTransaction({ to: txn.to, data: txn.data, value: txn.value });
  return typeof result === "string" ? result : result.hash;
}
