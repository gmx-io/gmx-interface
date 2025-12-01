import { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, RANDOM_WALLET } from "config/multichain";
import { MultichainAction, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "domain/multichain/estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "domain/multichain/getSendParams";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import { sendQuoteFromNative } from "domain/multichain/sendQuoteFromNative";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getWrappedToken } from "sdk/configs/tokens";
import { nowInSeconds } from "sdk/utils/time";

import { GlobalExpressParams, RelayParamsPayload } from "../../express/types";
import { signCreateWithdrawal } from "../signCreateWithdrawal";
import { CreateWithdrawalParams } from "../types";
import { getFeeRelayParams } from "./getFeeRelayParams";

export async function estimateWithdrawalPlatformTokenTransferInFees({
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

  const returnRawRelayParamsPayload = getFeeRelayParams({
    chainId,
    fullWntFee,
    globalExpressParams,
    settlementWrappedTokenData,
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

  if (!transferRequests) {
    throw new Error("Transfer requests not found");
  }

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
  }).catch(() => {
    // eslint-disable-next-line no-console
    console.warn("[multichain-lp] Failed to estimate compose gas on settlement chain");
    return applyGasLimitBuffer(5889082n);
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

  const platformTokenTransferInQuoteSend = await sourceChainClient
    .readContract({
      address: sourceChainTokenId.stargate,
      abi: abis.IStargate,
      functionName: "quoteSend",
      args: [returnTransferSendParams, false],
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.warn("[multichain-lp] Failed to quote send on source chain");
      return sendQuoteFromNative(366102683193600n);
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
    .catch(() => {
      // eslint-disable-next-line no-console
      console.warn("[multichain-lp] Failed to estimate contract gas on source chain");
      return 525841n;
    })
    .then(applyGasLimitBuffer);

  return {
    platformTokenTransferInGasLimit,
    platformTokenTransferInNativeFee,
    platformTokenTransferInComposeGas: composeGas,
    relayParamsPayload: returnRelayParamsPayload,
  };
}
