import { encodeAbiParameters, encodeFunctionData, zeroAddress } from "viem";

import { abis } from "abis";
import type { AnyChainId, SettlementChainId, SourceChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { getLayerZeroEndpointId } from "configs/multichain";
import { getToken } from "configs/tokens";
import type { IRpc } from "utils/rpc";
import type { IAbstractSigner } from "utils/signer";

import { estimateMultichainDepositComposeGas } from "./estimateComposeGas";
import { quoteStargateSend } from "./quotes";
import { getMultichainTransferSendParams, quoteFromNativeFee, type SendParam } from "./sendParams";

export type BridgeOutParams = {
  token: string;
  amount: bigint;
  minAmountOut: bigint;
  provider: string;
  data: string;
};

export type BuildTxnResult = {
  to: string;
  data: string;
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
};

/**
 * Wallet sits on the settlement chain and funds the GMX account directly via
 * `MultichainTransferRouter.multicall([sendWnt|sendTokens, bridgeIn])`.
 */
export function buildSameChainDepositTxn(request: SameChainDepositRequest): BuildTxnResult {
  const { chainId, tokenAddress, amount, account } = request;
  const multichainVault = getContract(chainId, "MultichainVault");
  const router = getContract(chainId, "MultichainTransferRouter");

  const isNative = tokenAddress === zeroAddress;
  let depositTokenAddress = tokenAddress;
  let sendCall: string;

  if (isNative) {
    const wrappedAddress = getToken(chainId, tokenAddress).wrappedAddress;
    if (!wrappedAddress) {
      throw new Error(`No wrappedAddress configured for native token on chain ${chainId}`);
    }
    depositTokenAddress = wrappedAddress;
    sendCall = encodeFunctionData({
      abi: abis.MultichainTransferRouter,
      functionName: "sendWnt",
      args: [multichainVault, amount],
    });
  } else {
    sendCall = encodeFunctionData({
      abi: abis.MultichainTransferRouter,
      functionName: "sendTokens",
      args: [tokenAddress, multichainVault, amount],
    });
  }

  const bridgeInCall = encodeFunctionData({
    abi: abis.MultichainTransferRouter,
    functionName: "bridgeIn",
    args: [account, depositTokenAddress],
  });

  const data = encodeFunctionData({
    abi: abis.MultichainTransferRouter,
    functionName: "multicall",
    args: [[sendCall, bridgeInCall]],
  });

  return {
    to: router,
    data,
    value: isNative ? amount : 0n,
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
    abi: abis.MultichainTransferRouter,
    functionName: "transferOut",
    args: [bridgeOutParams],
  });

  return { to: router, data, value: 0n };
}

export type CrossChainDepositRequest = {
  /** Settlement chain id (destination). */
  chainId: SettlementChainId;
  /** Source chain id (where the wallet sits). */
  srcChainId: SourceChainId;
  /** Account that will own the deposited balance on the settlement chain. */
  account: string;
  /** Settlement-chain token address (wrapped or native) — used for compose gas estimation. */
  tokenAddress: string;
  /** Source-chain Stargate pool address handling this token (called by the wallet on source chain). */
  sourceStargatePoolAddress: string;
  /**
   * Destination-chain Stargate pool address (the OApp delivering `lzCompose` on settlement chain).
   * Required when `composeGas` is not pre-computed; the source pool is always different from the
   * destination pool in cross-chain Stargate v2 deployments.
   */
  destinationStargatePoolAddress?: string;
  /** True if the source-chain token is native (zero address). Adds amount to msg.value. */
  isNativeOnSource: boolean;
  amount: bigint;
  /** "trade" → IStargate.sendToken, "platform" → IStargate.send. Defaults to "trade". */
  tokenKind?: "trade" | "platform";
  /** Pre-computed compose gas; if omitted we estimate via `destinationRpc`. */
  composeGas?: bigint;
  /** Pre-computed Stargate native fee on source chain; if omitted we quote via `sourceRpc`. */
  nativeFee?: bigint;
  /** Native-token gas drop on destination chain. */
  nativeDropAmount?: bigint;
  /** Optional encoded payload appended to the deposit message (`abi.encode(account, data)`). */
  innerData?: string;
};

export type CrossChainDepositResult = BuildTxnResult & {
  sendParams: SendParam;
  nativeFee: bigint;
  composeGas: bigint;
};

/**
 * Builds a Stargate `send` / `sendToken` transaction on the source chain that bridges funds
 * into the GMX account on the destination settlement chain.
 *
 * RPCs:
 *  - `destinationRpc`: settlement chain — used to estimate compose gas (omitted if `composeGas` is provided)
 *  - `sourceRpc`: source chain — used to quote the LayerZero native fee from Stargate
 */
export async function buildCrossChainDepositTxn(
  request: CrossChainDepositRequest,
  rpcs?: { sourceRpc?: IRpc; destinationRpc?: IRpc }
): Promise<CrossChainDepositResult> {
  rpcs = rpcs ?? {};
  const {
    chainId,
    srcChainId,
    account,
    tokenAddress,
    sourceStargatePoolAddress,
    isNativeOnSource,
    amount,
    tokenKind = "trade",
    nativeDropAmount,
    innerData,
  } = request;

  let composeGas = request.composeGas;
  if (composeGas === undefined) {
    if (!rpcs.destinationRpc) {
      throw new Error("destinationRpc or precomputed composeGas is required");
    }
    if (!request.destinationStargatePoolAddress) {
      throw new Error("destinationStargatePoolAddress or precomputed composeGas is required");
    }
    composeGas = await estimateMultichainDepositComposeGas(rpcs.destinationRpc, {
      chainId,
      account,
      srcChainId,
      tokenAddress,
      destinationStargatePoolAddress: request.destinationStargatePoolAddress,
      innerData,
    });
  }

  const sendParams = getMultichainTransferSendParams({
    dstChainId: chainId,
    account,
    srcChainId,
    amountLD: amount,
    composeGas,
    isToGmx: true,
    isManualGas: true,
    nativeDropAmount,
    innerData,
  });

  let nativeFee = request.nativeFee;
  if (nativeFee === undefined) {
    if (!rpcs.sourceRpc) {
      throw new Error("sourceRpc or precomputed nativeFee is required");
    }
    const quote = await quoteStargateSend(rpcs.sourceRpc, {
      stargateAddress: sourceStargatePoolAddress,
      sendParams,
    });
    nativeFee = quote.nativeFee;
  }

  const functionName = tokenKind === "platform" ? "send" : "sendToken";

  const data = encodeFunctionData({
    abi: abis.IStargate,
    functionName,
    args: [sendParams, quoteFromNativeFee(nativeFee), account],
  });

  const value = nativeFee + (isNativeOnSource ? amount : 0n);

  return {
    to: sourceStargatePoolAddress,
    data,
    value,
    sendParams,
    nativeFee,
    composeGas,
  };
}

/**
 * `BridgeOutParams.data` for cross-chain delivery is a single `uint32 dstEid`
 * pointing at the destination LayerZero endpoint; the on-chain provider takes
 * care of building the actual Stargate `sendParams`. Wrap into a Gelato-relayed
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
  /** Slippage tolerance in basis points for `minAmountOut`. Default 0 = no slippage allowed. */
  slippageBps?: number;
}): BridgeOutParams {
  const { tokenAddress, amount, dstChainId, stargateAddress, slippageBps = 0 } = params;

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

export type ExecuteCrossChainDepositResult = {
  txnHash: string;
  composeGas: bigint;
  nativeFee: bigint;
  sendParams: SendParam;
};

export async function executeCrossChainDeposit(
  signer: IAbstractSigner,
  request: CrossChainDepositRequest,
  rpcs?: { sourceRpc?: IRpc; destinationRpc?: IRpc }
): Promise<ExecuteCrossChainDepositResult> {
  const built = await buildCrossChainDepositTxn(request, rpcs);
  const txnHash = await sendBuiltTxn(signer, { to: built.to, data: built.data, value: built.value });
  return {
    txnHash,
    composeGas: built.composeGas,
    nativeFee: built.nativeFee,
    sendParams: built.sendParams,
  };
}
