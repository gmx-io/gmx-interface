import { maxUint256, zeroHash } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { OFTFeeDetail, QuoteOft, SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { bigMath } from "sdk/utils/bigmath";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/utils/numbers";

const LZ_NATIVE_FEE_BUFFER_BPS = 1000n; // 10%

export async function stargateTransferFees({
  chainId,
  stargateAddress,
  sendParams,
  tokenAddress,
  disableOverrides = false,
  useSendToken = false,
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
  /**
   * Disable state overrides (useful when estimating from real user account)
   */
  disableOverrides?: boolean;
  /**
   * Use sendToken function instead of send
   */
  useSendToken?: boolean;
  /**
   * Additional value to add to nativeFee (e.g., for native token transfers)
   */
  additionalValue?: bigint;
  account?: string;
}): Promise<{
  nativeFee: bigint;
  quoteOft: QuoteOft;
  transferGasLimit: bigint;
}> {
  const client = getPublicClientWithRpc(chainId);

  // Read quotes in parallel
  const [quoteSend, quoteOftRaw] = await Promise.all([
    client.readContract({
      address: stargateAddress,
      abi: abis.IStargate,
      functionName: "quoteSend",
      args: [sendParams, false],
    }),
    client.readContract({
      address: stargateAddress,
      abi: abis.IStargate,
      functionName: "quoteOFT",
      args: [sendParams],
    }),
  ]);

  const quoteOft: QuoteOft = {
    limit: quoteOftRaw[0],
    oftFeeDetails: quoteOftRaw[1] as OFTFeeDetail[],
    receipt: quoteOftRaw[2],
  };

  const nativeFeeBuffer = bigMath.mulDiv(quoteSend.nativeFee, LZ_NATIVE_FEE_BUFFER_BPS, BASIS_POINTS_DIVISOR_BIGINT);
  const adjustedNativeFee = quoteSend.nativeFee + nativeFeeBuffer;
  const value = adjustedNativeFee + additionalValue;

  const transferGasLimit = await client
    .estimateContractGas({
      address: stargateAddress,
      abi: abis.IStargate,
      functionName: useSendToken ? "sendToken" : "send",
      account: account,
      args: [sendParams, sendQuoteFromNative(adjustedNativeFee), account],
      value,
      stateOverride: disableOverrides
        ? undefined
        : [
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
          ],
    })
    .then(applyGasLimitBuffer);

  return {
    nativeFee: adjustedNativeFee,
    quoteOft,
    transferGasLimit,
  };
}
