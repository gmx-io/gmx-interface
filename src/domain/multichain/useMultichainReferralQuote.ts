import { useMemo } from "react";
import { zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { FAKE_INPUT_AMOUNT_MAP, getMappedTokenId, isSettlementChain, RANDOM_WALLET } from "config/multichain";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getRawRelayerParams, type GlobalExpressParams, type RelayParamsPayload } from "domain/synthetics/express";
import { signRegisterCode, signSetTraderReferralCode } from "domain/synthetics/express/expressOrderUtils";
import { convertToUsd, getMidPrice } from "domain/tokens";
import { useChainId } from "lib/chains";
import { numberToBigint } from "lib/numbers";
import { type AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { encodeReferralCode } from "sdk/utils/referrals";
import { nowInSeconds } from "sdk/utils/time";

import { MultichainActionType, type MultichainAction } from "./codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "./estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "./getSendParams";
import type { SendParam } from "./types";

export type MultichainReferralQuoteResult = {
  nativeFee: bigint;
  amount: bigint;
  composeGas: bigint;
};

export function useMultichainReferralQuote({
  depositTokenAddress,
  actionType,
  referralCode,
  enabled = true,
}: {
  depositTokenAddress: string | undefined;
  actionType: MultichainActionType.RegisterCode | MultichainActionType.SetTraderReferralCode | undefined;
  referralCode: string | undefined;
  enabled?: boolean;
}): AsyncResult<MultichainReferralQuoteResult> & {
  networkFeeUsd: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const referralCodeHex = useMemo(() => (referralCode ? encodeReferralCode(referralCode) : undefined), [referralCode]);

  const simulationSigner = RANDOM_WALLET;

  const sourceChainDepositTokenId = useMemo(() => {
    if (depositTokenAddress === undefined || srcChainId === undefined || !isSettlementChain(chainId)) {
      return undefined;
    }

    return getMappedTokenId(chainId as SettlementChainId, depositTokenAddress, srcChainId as SourceChainId);
  }, [chainId, depositTokenAddress, srcChainId]);

  const result = useThrottledAsync(
    async ({ params: p }): Promise<MultichainReferralQuoteResult> => {
      if (p.sourceChainDepositTokenId === undefined) {
        throw new Error("sourceChainDepositTokenId is undefined");
      }

      const rawRelayParamsPayload = getRawRelayerParams({
        chainId: p.chainId,
        gasPaymentTokenAddress: p.globalExpressParams.gasPaymentTokenAddress,
        relayerFeeTokenAddress: p.globalExpressParams.relayerFeeTokenAddress,
        feeParams: {
          feeToken: p.globalExpressParams.relayerFeeTokenAddress,
          feeAmount: 0n,
          feeSwapPath: [],
        },
        externalCalls: getEmptyExternalCallsPayload(),
        tokenPermits: [],
      });

      const relayParams: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      let signature: string;
      if (p.actionType === MultichainActionType.RegisterCode) {
        signature = await signRegisterCode({
          chainId: p.chainId,
          srcChainId: p.srcChainId,
          signer: p.simulationSigner,
          relayParams,
          referralCode: p.referralCodeHex,
          shouldUseSignerMethod: true,
        });
      } else if (p.actionType === MultichainActionType.SetTraderReferralCode) {
        signature = await signSetTraderReferralCode({
          chainId: p.chainId,
          srcChainId: p.srcChainId,
          signer: p.simulationSigner,
          relayParams,
          referralCode: p.referralCodeHex,
          shouldUseSignerMethod: true,
        });
      } else {
        throw new Error("Unsupported multichain referral action type");
      }

      const fullAction: MultichainAction = {
        actionType: p.actionType,
        actionData: {
          relayParams,
          signature,
          referralCode: p.referralCodeHex,
        },
      };

      const composeGas = await estimateMultichainDepositNetworkComposeGas({
        action: fullAction,
        chainId: p.chainId,
        account: p.simulationSigner.address,
        srcChainId: p.srcChainId,
        tokenAddress: p.depositTokenAddress,
        settlementChainPublicClient: getPublicClientWithRpc(p.chainId),
      });

      const sourceChainStargateAddress = p.sourceChainDepositTokenId.stargate;
      const sourceChainClient = getPublicClientWithRpc(p.srcChainId);

      const tokenAmount =
        FAKE_INPUT_AMOUNT_MAP[p.sourceChainDepositTokenId.symbol] ??
        numberToBigint(0.02, p.sourceChainDepositTokenId.decimals);

      const sendParamsWithRoughAmount = getMultichainTransferSendParams({
        isToGmx: true,
        dstChainId: p.chainId,
        account: p.simulationSigner.address,
        // TODO MLTCH take into account LD
        amountLD: tokenAmount,
        srcChainId: p.srcChainId,
        composeGas,
        action: fullAction,
      });

      const [limit, oftFeeDetails] = await sourceChainClient.readContract({
        address: sourceChainStargateAddress,
        abi: abis.IStargate,
        functionName: "quoteOFT",
        args: [sendParamsWithRoughAmount],
      });

      let negativeFee = 0n;
      for (const oftFeeDetail of oftFeeDetails) {
        negativeFee += oftFeeDetail.feeAmountLD;
      }

      const minAmount = limit.minAmountLD === 0n ? 1n : limit.minAmountLD;

      let amountBeforeFee = minAmount - negativeFee;
      amountBeforeFee = amountBeforeFee * 15n;

      const sendParamsWithMinimumAmount: SendParam = {
        ...sendParamsWithRoughAmount,
        amountLD: amountBeforeFee,
        minAmountLD: 0n,
      };

      const quoteSend = await sourceChainClient.readContract({
        address: sourceChainStargateAddress,
        abi: abis.IStargate,
        functionName: "quoteSend",
        args: [sendParamsWithMinimumAmount, false],
      });

      return {
        nativeFee: quoteSend.nativeFee,
        amount: amountBeforeFee,
        composeGas,
      };
    },
    {
      throttleMs: 1000,
      params:
        enabled &&
        srcChainId !== undefined &&
        globalExpressParams !== undefined &&
        simulationSigner !== undefined &&
        actionType !== undefined &&
        referralCodeHex !== undefined &&
        account !== undefined &&
        sourceChainDepositTokenId !== undefined &&
        depositTokenAddress !== undefined
          ? {
              chainId,
              srcChainId,
              globalExpressParams,
              simulationSigner,
              actionType,
              referralCodeHex,
              account,
              sourceChainDepositTokenId,
              depositTokenAddress,
            }
          : undefined,
    }
  );

  const networkFeeUsd = useMemo(() => {
    if (result.data === undefined || globalExpressParams?.tokensData[zeroAddress]?.prices === undefined) {
      return undefined;
    }

    return convertToUsd(result.data.nativeFee, 18, getMidPrice(globalExpressParams.tokensData[zeroAddress].prices));
  }, [globalExpressParams?.tokensData, result.data]);

  return {
    ...result,
    networkFeeUsd,
  };
}

export function createRelayEmptyParamsPayload(
  chainId: SettlementChainId,
  globalExpressParams: GlobalExpressParams
): RelayParamsPayload {
  const rawRelayParamsPayload = getRawRelayerParams({
    chainId,
    gasPaymentTokenAddress: globalExpressParams.gasPaymentTokenAddress,
    relayerFeeTokenAddress: globalExpressParams.relayerFeeTokenAddress,
    feeParams: {
      feeToken: globalExpressParams.relayerFeeTokenAddress,
      feeAmount: 0n,
      feeSwapPath: [],
    },
    externalCalls: getEmptyExternalCallsPayload(),
    tokenPermits: [],
  });

  return {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };
}
