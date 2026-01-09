import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { getRawRelayerParams } from "domain/synthetics/express/relayParamsUtils";
import { GlobalExpressParams, RelayParamsPayload } from "domain/synthetics/express/types";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getWrappedToken } from "sdk/configs/tokens";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";

import { signCreateGlvWithdrawal } from "../signCreateGlvWithdrawal";
import { CreateGlvWithdrawalParams } from "../types";
import { stargateTransferFees } from "./stargateTransferFees";

export async function estimateGlvWithdrawalPlatformTokenTransferInFees({
  chainId,
  srcChainId,
  marketTokenAmount,
  fullWntFee,
  params,
  secondaryOrPrimaryOutputTokenAddress: _secondaryOrPrimaryOutputTokenAddress,
  globalExpressParams,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  marketTokenAmount: bigint;
  fullWntFee: bigint;
  params: CreateGlvWithdrawalParams;
  secondaryOrPrimaryOutputTokenAddress: string;
  globalExpressParams: GlobalExpressParams;
}): Promise<{
  platformTokenTransferInGasLimit: bigint;
  platformTokenTransferInNativeFee: bigint;
  platformTokenTransferInComposeGas: bigint;
  relayParamsPayload: RelayParamsPayload;
}> {
  const settlementWrappedTokenData = globalExpressParams.tokensData[getWrappedToken(chainId).address];

  const rawRelayParamsPayload = getRawRelayerParams({
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
  });

  const relayParamsPayload: RelayParamsPayload = {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const vaultAddress = getContract(chainId, "GlvVault");
  const transferRequests = getTransferRequests([
    {
      to: vaultAddress,
      token: params.addresses.glv,
      amount: marketTokenAmount,
    },
  ]);

  if (!transferRequests) {
    throw new Error("Transfer requests not found");
  }

  const signature = await signCreateGlvWithdrawal({
    chainId,
    srcChainId,
    signer: RANDOM_WALLET,
    relayParams: relayParamsPayload,
    transferRequests,
    params,
    shouldUseSignerMethod: true,
  });

  const action: MultichainAction = {
    actionType: MultichainActionType.GlvWithdrawal,
    actionData: {
      relayParams: relayParamsPayload,
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
    tokenAddress: params.addresses.glv,
    settlementChainPublicClient: getPublicClientWithRpc(chainId),
  });

  const sendParams = getMultichainTransferSendParams({
    dstChainId: chainId,
    account: RANDOM_WALLET.address,
    srcChainId,
    amountLD: marketTokenAmount,
    isToGmx: true,
    isManualGas: true,
    action,
    composeGas,
    nativeDropAmount: fullWntFee,
  });

  const sourceChainTokenId = getMappedTokenId(chainId, params.addresses.glv, srcChainId);

  if (!sourceChainTokenId) {
    throw new Error("Source chain token ID not found");
  }

  const { nativeFee: platformTokenTransferInNativeFee, transferGasLimit: platformTokenTransferInGasLimit } =
    await stargateTransferFees({
      chainId: srcChainId,
      stargateAddress: sourceChainTokenId.stargate,
      sendParams,
      tokenAddress: params.addresses.glv,
      isPlatformToken: true,
      account: params.addresses.receiver,
    });

  return {
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    platformTokenTransferInComposeGas: composeGas,
    relayParamsPayload,
  };
}
