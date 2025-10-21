import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { buildReverseSwapStrategy } from "sdk/utils/swap/buildSwapStrategy";
import { nowInSeconds } from "sdk/utils/time";

import { getRawRelayerParams } from "../../express";
import { GlobalExpressParams, RawRelayParamsPayload, RelayParamsPayload } from "../../express/types";
import { signCreateWithdrawal } from "../signCreateWithdrawal";
import { CreateWithdrawalParams } from "../types";

export async function estimateWithdrawalPlatformTokenTransferInFees({
  chainId,
  srcChainId,
  marketTokenAmount,
  fullWntFee,
  params,
  secondaryOrPrimaryOutputTokenAddress,
  globalExpressParams,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  marketTokenAmount: bigint;
  fullWntFee: bigint;
  params: CreateWithdrawalParams;
  secondaryOrPrimaryOutputTokenAddress: string;
  globalExpressParams: GlobalExpressParams;
}): Promise<{
  platformTokenTransferInGasLimit: bigint;
  platformTokenTransferInNativeFee: bigint;
  platformTokenTransferInComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
}> {
  const settlementWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];

  // const marketConfig = MARKETS[chainId][marketAddress];

  // By default pay with short token
  // const feeTokenAddress = isShortTokenBeingTransferred ? marketConfig.shortTokenAddress : marketConfig.longTokenAddress;

  const feeSwapStrategy = buildReverseSwapStrategy({
    chainId,
    amountOut: fullWntFee,
    tokenIn: globalExpressParams.tokensData[secondaryOrPrimaryOutputTokenAddress],
    tokenOut: settlementWrappedTokenData,
    marketsInfoData: globalExpressParams.marketsInfoData,
    swapOptimizationOrder: ["length"],
    externalSwapQuoteParams: undefined,
    isAtomicSwap: true,
  });

  const returnRawRelayParamsPayload: RawRelayParamsPayload =
    convertTokenAddress(chainId, secondaryOrPrimaryOutputTokenAddress, "wrapped") === settlementWrappedTokenData.address
      ? getRawRelayerParams({
          chainId,
          gasPaymentTokenAddress: settlementWrappedTokenData.address,
          relayerFeeTokenAddress: settlementWrappedTokenData.address,
          feeParams: {
            feeToken: settlementWrappedTokenData.address,
            feeAmount: fullWntFee,
            feeSwapPath: [],
          },
          externalCalls: getEmptyExternalCallsPayload(),
          tokenPermits: [],
        })
      : getRawRelayerParams({
          chainId,
          gasPaymentTokenAddress: feeSwapStrategy.swapPathStats!.tokenInAddress,
          relayerFeeTokenAddress: feeSwapStrategy.swapPathStats!.tokenOutAddress,
          feeParams: {
            feeToken: feeSwapStrategy.swapPathStats!.tokenInAddress,
            feeAmount: feeSwapStrategy.amountIn,
            feeSwapPath: feeSwapStrategy.swapPathStats!.swapPath,
          },
          externalCalls: getEmptyExternalCallsPayload(),
          tokenPermits: [],
        });

  const returnRelayParamsPayload: RelayParamsPayload = {
    ...returnRawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const vaultAddress = getContract(chainId, "WithdrawalVault");
  const transferRequests = getTransferRequests([
    {
      to: vaultAddress,
      token: params.addresses.market,
      amount: marketTokenAmount,
    },
  ]);

  const signature = await signCreateWithdrawal({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: returnRelayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.Withdrawal,
    actionData: {
      relayParams: returnRelayParamsPayload,
      transferRequests,
      params,
      signature,
    },
  };

  const composeGas = await estimateMultichainDepositNetworkComposeGas({
    action,
    chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    tokenAddress: params.addresses.market,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const returnTransferSendParams = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: marketTokenAmount,
    isToGmx: true,
    // TODO MLTCH check that all gm and glv transfers are manual gas
    isManualGas: true,
    action,
    composeGas,
  });

  const sourceChainClient = getPublicClientWithRpc(srcChainId);
  const sourceChainTokenId = getMappedTokenId(chainId, params.addresses.market, srcChainId);
  if (!sourceChainTokenId) {
    throw new Error("Source chain token ID not found");
  }

  const platformTokenTransferInQuoteSend = await sourceChainClient.readContract({
    address: sourceChainTokenId.stargate,
    abi: abis.IStargate,
    functionName: "quoteSend",
    args: [returnTransferSendParams, false],
  });

  // No need to quote OFT because we are using our own contracts that do not apply any fees

  const platformTokenTransferInNativeFee = platformTokenTransferInQuoteSend.nativeFee;

  // The txn of stargate itself what will it take
  const platformTokenTransferInGasLimit = await sourceChainClient
    .estimateContractGas({
      address: sourceChainTokenId.stargate,
      abi: abis.IStargate,
      functionName: "send",
      account: params.addresses.receiver,
      args: [returnTransferSendParams, platformTokenTransferInQuoteSend, params.addresses.receiver],
      value: platformTokenTransferInQuoteSend.nativeFee,
      // No need to override state because we are using the users account on source chain
      // where tokens already are an initial state
    })
    .then(applyGasLimitBuffer);

  return {
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    platformTokenTransferInComposeGas: composeGas,
    relayParamsPayload: returnRelayParamsPayload,
  };
}
