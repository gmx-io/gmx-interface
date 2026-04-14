import { encodeFunctionData } from "viem";

import { ContractsChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import ERC20ABI from "abis/Token";
import { MaxUint256 } from "utils/numbers";
import { IHttp } from "utils/http/types";

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

export type SpenderType = "router" | "glv";

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

export async function fetchWalletBalances(
  ctx: { api: IHttp },
  params: { address: string }
): Promise<WalletBalance[]> {
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
    case "glv":
      return getContract(chainId, "GlvRouter");
    default:
      throw new Error(`Invalid spender: ${spender}. Must be 'router' or 'glv'`);
  }
}

export function buildApproveTransaction(
  ctx: { chainId: ContractsChainId },
  params: ApproveTokenParams
): ApproveTokenResult {
  const spenderAddress = resolveSpenderAddress(ctx.chainId, params.spender);
  const amount = params.amount ?? MaxUint256;

  const data = encodeFunctionData({
    abi: ERC20ABI,
    functionName: "approve",
    args: [spenderAddress, amount],
  });

  return {
    to: params.tokenAddress,
    data,
    value: 0n,
  };
}
