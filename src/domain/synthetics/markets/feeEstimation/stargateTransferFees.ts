import { maxUint256, StateOverride, zeroHash } from "viem";

import type { AnyChainId, SettlementChainId, SourceChainId } from "config/chains";
import { OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { bigMath } from "sdk/utils/bigmath";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/utils/numbers";

const LZ_NATIVE_FEE_BUFFER_BPS = 1000n; // 10%

function applyBufferBps(value: bigint, bufferBps: bigint): bigint {
  const buffer = bigMath.mulDiv(value, bufferBps, BASIS_POINTS_DIVISOR_BIGINT);
  return value + buffer;
}

export async function fetchLayerZeroNativeFee({
  chainId,
  stargateAddress,
  sendParams,
}: {
  chainId: AnyChainId;
  stargateAddress: string;
  sendParams: SendParam;
}): Promise<bigint> {
  const client = getPublicClientWithRpc(chainId);
  const result = await client.readContract({
    address: stargateAddress,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [sendParams, false],
  });
  return applyBufferBps(result.nativeFee, LZ_NATIVE_FEE_BUFFER_BPS);
}

export async function stargateTransferFees({
  chainId,
  stargateAddress,
  sendParams,
  tokenAddress,
  isPlatformToken = false,
  forceFullOverride = false,
  additionalValue = 0n,
  account = RANDOM_WALLET.address,
}: {
  chainId: SettlementChainId | SourceChainId;
  /**
   * From chain stargate address
   */
  stargateAddress: string;
  sendParams: SendParam;
  /**
   * From chain token address
   */
  tokenAddress: string;
  isPlatformToken?: boolean;
  /**
   * For platform tokens this can only be turned on if we transfer from settlement chain. Because on settlement chains stargate != token address, so we can safely override token code.
   * For trade tokens does changes nothing.
   */
  forceFullOverride?: boolean;
  /**
   * Additional value to add to nativeFee (e.g., for native token transfers)
   */
  additionalValue?: bigint;
  /**
   * Always pass account if platform token is used, because we dont override account balance for platform tokens.
   */
  account?: string;
}): Promise<{
  nativeFee: bigint;
  amountReceivedLD: bigint;
  transferGasLimit: bigint;
}> {
  const client = getPublicClientWithRpc(chainId);
  if (isPlatformToken && !account) {
    throw new Error("Account is required if platform token is used");
  }

  // Read quotes in parallel
  const [nativeFee, amountReceivedLD] = await Promise.all([
    fetchLayerZeroNativeFee({ chainId, stargateAddress, sendParams }),
    isPlatformToken
      ? Promise.resolve(sendParams.amountLD)
      : client
          .readContract({
            address: stargateAddress,
            abi: abis.IStargate,
            functionName: "quoteOFT",
            args: [sendParams],
          })
          .then((result) => result[2].amountReceivedLD),
  ]);

  const value = nativeFee + additionalValue;

  const transferGasLimit = await client
    .estimateContractGas({
      address: stargateAddress,
      abi: abis.IStargate,
      functionName: isPlatformToken ? "send" : "sendToken",
      account: account,
      args: [sendParams, sendQuoteFromNative(nativeFee), account],
      value,
      stateOverride:
        isPlatformToken && !forceFullOverride
          ? getPlatformTokenStateOverride(account)
          : getTradeTokenStateOverride(account, tokenAddress),
    })
    .then(applyGasLimitBuffer);

  return {
    nativeFee,
    amountReceivedLD,
    transferGasLimit,
  };
}

function getPlatformTokenStateOverride(account: string): StateOverride {
  return [
    {
      address: account,
      balance: maxUint256,
    },
  ];
}

function getTradeTokenStateOverride(account: string, tokenAddress: string): StateOverride {
  return [
    {
      address: account,
      balance: maxUint256,
    },
    {
      address: tokenAddress,
      code: OVERRIDE_ERC20_BYTECODE,
      state: [
        {
          slot: RANDOM_SLOT,
          value: zeroHash,
        },
      ],
    },
  ];
}
