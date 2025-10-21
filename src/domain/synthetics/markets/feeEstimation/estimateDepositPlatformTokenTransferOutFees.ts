import { maxUint256, zeroHash } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMultichainTokenId, OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT, RANDOM_WALLET } from "config/multichain";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { expandDecimals } from "sdk/utils/numbers";

export async function estimateDepositPlatformTokenTransferOutFees({
  fromChainId,
  toChainId,
  marketOrGlvAddress,
}: {
  fromChainId: SettlementChainId | SourceChainId;
  toChainId: SettlementChainId | SourceChainId;
  marketOrGlvAddress: string;
}): Promise<{
  platformTokenReturnTransferGasLimit: bigint;
  platformTokenReturnTransferNativeFee: bigint;
}> {
  const settlementChainClient = getPublicClientWithRpc(fromChainId);

  const settlementChainMarketTokenId = getMultichainTokenId(fromChainId, marketOrGlvAddress);

  if (!settlementChainMarketTokenId) {
    throw new Error("Settlement chain market token ID not found");
  }

  const returnTransferSendParams = getMultichainTransferSendParams({
    dstChainId: toChainId,
    account: RANDOM_WALLET.address,
    srcChainId: fromChainId,
    amountLD: expandDecimals(1, settlementChainMarketTokenId.decimals),
    isToGmx: false,
    // TODO MLTCH check that all gm and glv transfers are manual gas
    isManualGas: true,
  });

  const primaryStargateQuoteSend = await settlementChainClient.readContract({
    address: settlementChainMarketTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [returnTransferSendParams, false],
  });

  const returnTransferNativeFee = primaryStargateQuoteSend.nativeFee;

  // The txn of stargate itself what will it take
  const returnTransferGasLimit = await settlementChainClient
    .estimateContractGas({
      address: settlementChainMarketTokenId.stargate,
      abi: abis.IStargate,
      functionName: "send",
      account: RANDOM_WALLET.address,
      args: [returnTransferSendParams, primaryStargateQuoteSend, RANDOM_WALLET.address],
      value: primaryStargateQuoteSend.nativeFee, // + tokenAmount if native
      stateOverride: [
        {
          address: RANDOM_WALLET.address,
          balance: maxUint256,
        },
        {
          address: settlementChainMarketTokenId.address,
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
    platformTokenReturnTransferGasLimit: returnTransferGasLimit,
    platformTokenReturnTransferNativeFee: returnTransferNativeFee,
  };
}
