import { maxUint256, zeroHash } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { RANDOM_WALLET, OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT } from "config/multichain";
import { SendParam } from "domain/multichain/types";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";

export async function stargateTransferFees({
  chainId,
  stargateAddress,
  sendParams,
  tokenAddress,
  disableOverrides = false,
  useSendToken = false,
  additionalValue = 0n,
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
}) {
  const client = getPublicClientWithRpc(chainId);

  // Read quotes in parallel
  const [quoteSend, quoteOft] = await Promise.all([
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

  const value = quoteSend.nativeFee + additionalValue;

  const returnTransferGasLimit = await client
    .estimateContractGas({
      address: stargateAddress,
      abi: abis.IStargate,
      functionName: useSendToken ? "sendToken" : "send",
      account: RANDOM_WALLET.address,
      args: [sendParams, quoteSend, RANDOM_WALLET.address],
      value,
      stateOverride: disableOverrides
        ? undefined
        : [
            {
              address: RANDOM_WALLET.address,
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
    quoteSend,
    quoteOft,
    returnTransferGasLimit,
  };
}
