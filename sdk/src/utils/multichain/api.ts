import { encodeAbiParameters, encodeFunctionData, type Hex, zeroAddress } from "viem";

import { getAbi } from "abis/getAbi";
import type { AnyChainId, SettlementChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { getLayerZeroEndpointId } from "configs/multichain";
import { getToken } from "configs/tokens";
import { buildTokenPermitsCall, encodeExchangeRouterMulticall } from "utils/orderTransactions/utils";
import type { IAbstractSigner } from "utils/signer";
import type { SignedTokenPermit } from "utils/tokens/types";

export type BridgeFeeParams = {
  feeToken: string;
  feeAmount: bigint;
  feeSwapPath: string[];
  minOutputAmount: bigint;
};

export type BridgeOutParams = {
  token: string;
  amount: bigint;
  minAmountOut: bigint;
  provider: string;
  data: string;
  bridgeFee?: BridgeFeeParams;
};

export type BuildTxnResult = {
  to: Hex;
  data: Hex;
  value: bigint;
};

export type SameChainDepositRequest = {
  /** Settlement chain id where MultichainTransferRouter lives. */
  chainId: SettlementChainId;
  /** Token to deposit. Use the zero address for native currency (auto-wrapped via sendWnt). */
  tokenAddress: string;
  amount: bigint;
  /** Receiving GMX account address (typically the same as `signer.address`). */
  account: string;
  /** Signed GMX Router permits for `tokenAddress`, so the deposit needs no approval transaction */
  tokenPermits?: SignedTokenPermit[];
};

/**
 * Wallet sits on the settlement chain and funds the GMX account directly via
 * `MultichainTransferRouter.multicall([sendWnt|sendTokens, bridgeIn])`, or via ExchangeRouter when it carries permits.
 */
export function buildSameChainDepositTxn(request: SameChainDepositRequest): BuildTxnResult {
  const { chainId, tokenAddress, amount, account, tokenPermits = [] } = request;
  const multichainVault = getContract(chainId, "MultichainVault");
  const router = getContract(chainId, "MultichainTransferRouter");

  const isNative = tokenAddress === zeroAddress;

  if (!isNative && tokenPermits.length > 0) {
    return buildSameChainDepositWithPermitsTxn({ chainId, tokenAddress, amount, account, tokenPermits });
  }

  let depositTokenAddress = tokenAddress;
  let sendCall: string;

  if (isNative) {
    const wrappedAddress = getToken(chainId, tokenAddress).wrappedAddress;
    if (!wrappedAddress) {
      throw new Error(`No wrappedAddress configured for native token on chain ${chainId}`);
    }
    depositTokenAddress = wrappedAddress;
    sendCall = encodeFunctionData({
      abi: getAbi(chainId, "MultichainTransferRouter"),
      functionName: "sendWnt",
      args: [multichainVault, amount],
    });
  } else {
    sendCall = encodeFunctionData({
      abi: getAbi(chainId, "MultichainTransferRouter"),
      functionName: "sendTokens",
      args: [tokenAddress, multichainVault, amount],
    });
  }

  const bridgeInCall = encodeFunctionData({
    abi: getAbi(chainId, "MultichainTransferRouter"),
    functionName: "bridgeIn",
    args: [account, depositTokenAddress],
  });

  const data = encodeFunctionData({
    abi: getAbi(chainId, "MultichainTransferRouter"),
    functionName: "multicall",
    args: [[sendCall, bridgeInCall]],
  });

  return {
    to: router,
    data,
    value: isNative ? amount : 0n,
  };
}

/**
 * MultichainTransferRouter can't run the permit, so ExchangeRouter sets the allowance, pulls the tokens into
 * MultichainVault and calls `bridgeIn` through ExternalHandler. `bridgeIn` is permissionless and credits any account
 * with what reached the vault unrecorded, so it must stay in the same transaction as the transfer.
 */
function buildSameChainDepositWithPermitsTxn({
  chainId,
  tokenAddress,
  amount,
  account,
  tokenPermits,
}: Required<SameChainDepositRequest>): BuildTxnResult {
  const transferRouter = getContract(chainId, "MultichainTransferRouter");

  const bridgeInCall = encodeFunctionData({
    abi: getAbi(chainId, "MultichainTransferRouter"),
    functionName: "bridgeIn",
    args: [account, tokenAddress],
  });

  const { callData } = encodeExchangeRouterMulticall(chainId, [
    buildTokenPermitsCall(tokenPermits),
    { method: "sendTokens", params: [tokenAddress, getContract(chainId, "MultichainVault"), amount] },
    { method: "makeExternalCalls", params: [[transferRouter], [bridgeInCall], [], []] },
  ]);

  return {
    to: getContract(chainId, "ExchangeRouter"),
    data: callData,
    value: 0n,
  };
}

export function getEmptyBridgeFeeParams(): BridgeFeeParams {
  return {
    feeToken: zeroAddress,
    feeAmount: 0n,
    feeSwapPath: [],
    minOutputAmount: 0n,
  };
}

export function buildSameChainWithdrawBridgeOutParams(params: {
  tokenAddress: string;
  amount: bigint;
}): BridgeOutParams {
  return {
    token: params.tokenAddress,
    amount: params.amount,
    minAmountOut: params.amount,
    data: "0x",
    provider: zeroAddress,
  };
}

export type SameChainWithdrawRequest = {
  chainId: SettlementChainId;
  bridgeOutParams: BridgeOutParams;
};

/**
 * Encodes `MultichainTransferRouter.transferOut(BridgeOutParams)` as a classic wallet tx.
 */
export function buildSameChainWithdrawTxn(request: SameChainWithdrawRequest): BuildTxnResult {
  const { chainId, bridgeOutParams } = request;
  const router = getContract(chainId, "MultichainTransferRouter");

  const data = encodeFunctionData({
    abi: getAbi(chainId, "MultichainTransferRouter"),
    functionName: "transferOut",
    args: [{ ...bridgeOutParams, bridgeFee: bridgeOutParams.bridgeFee ?? getEmptyBridgeFeeParams() }],
  });

  return { to: router, data, value: 0n };
}

export const DEFAULT_CROSS_CHAIN_WITHDRAW_SLIPPAGE_BPS = 50;

/**
 * `BridgeOutParams.data` for cross-chain delivery is a single `uint32 dstEid`
 * pointing at the destination LayerZero endpoint; the on-chain provider takes
 * care of building the actual Stargate `sendParams`. Wrap into a relayed
 * express transaction via `buildAndSignBridgeOutTxn` from
 * `utils/express/utils/bridgeOutUtils`.
 */
export function buildCrossChainWithdrawBridgeOutParams(params: {
  /** Settlement-chain token address being withdrawn. */
  tokenAddress: string;
  amount: bigint;
  /** Destination chain id (where the user receives funds). */
  dstChainId: AnyChainId;
  /** Settlement-chain Stargate pool address handling this token. */
  stargateAddress: string;
  /** Slippage tolerance in basis points for `minAmountOut`. Default 50; 0 = no slippage allowed. */
  slippageBps?: number;
}): BridgeOutParams {
  const {
    tokenAddress,
    amount,
    dstChainId,
    stargateAddress,
    slippageBps = DEFAULT_CROSS_CHAIN_WITHDRAW_SLIPPAGE_BPS,
  } = params;

  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000) {
    throw new Error(`slippageBps must be an integer in range [0, 10000), got ${slippageBps}`);
  }

  const dstEid = getLayerZeroEndpointId(dstChainId);
  if (dstEid === undefined) {
    throw new Error(`No LayerZero endpoint id for destination chain ${dstChainId}`);
  }

  const minAmountOut = slippageBps > 0 ? (amount * (10_000n - BigInt(slippageBps))) / 10_000n : amount;

  return {
    token: tokenAddress,
    amount,
    minAmountOut,
    provider: stargateAddress,
    data: encodeAbiParameters([{ type: "uint32", name: "dstEid" }], [dstEid]),
  };
}

async function sendBuiltTxn(signer: IAbstractSigner, txn: BuildTxnResult): Promise<string> {
  if (!signer.sendTransaction) {
    throw new Error("Signer does not support sendTransaction; use the build* helpers and submit via your wallet.");
  }
  const result = await signer.sendTransaction({ to: txn.to, data: txn.data, value: txn.value });
  return typeof result === "string" ? result : result.hash;
}

export async function executeSameChainDeposit(
  signer: IAbstractSigner,
  request: SameChainDepositRequest
): Promise<string> {
  return sendBuiltTxn(signer, buildSameChainDepositTxn(request));
}

export async function executeSameChainWithdraw(
  signer: IAbstractSigner,
  request: SameChainWithdrawRequest
): Promise<string> {
  return sendBuiltTxn(signer, buildSameChainWithdrawTxn(request));
}
