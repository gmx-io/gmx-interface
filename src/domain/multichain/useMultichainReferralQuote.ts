import { Contract } from "ethers";
import { useMemo } from "react";
import { zeroAddress } from "viem";
import { usePublicClient } from "wagmi";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { FAKE_INPUT_AMOUNT_MAP, IStargateAbi, type MultichainTokenId } from "config/multichain";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  getRawRelayerParams,
  type GlobalExpressParams,
  type RawRelayParamsPayload,
  type RelayParamsPayload,
} from "domain/synthetics/express";
import { convertToUsd, getMidPrice } from "domain/tokens";
import { numberToBigint } from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { type AsyncResult, useThrottledAsync } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getEmptyExternalCallsPayload } from "sdk/utils/orderTransactions";
import { nowInSeconds } from "sdk/utils/time";
import type { IStargate } from "typechain-types-stargate";

import { type MultichainAction } from "./codecs/CodecUiHelper";
import { estimateMultichainDepositNetworkComposeGas } from "./estimateMultichainDepositNetworkComposeGas";
import { getMultichainTransferSendParams } from "./getSendParams";
import type { SendParam } from "./types";

export type MultichainReferralQuoteResult = {
  nativeFee: bigint;
  amount: bigint;
  composeGas: bigint;
};

export type SignActionFn = (params: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId;
  signer: ReturnType<typeof import("config/multichain").RANDOM_WALLET.connect>;
  relayParams: RelayParamsPayload;
  referralCode: string;
  shouldUseSignerMethod?: boolean;
}) => Promise<string>;

export type CreateActionFn = (params: {
  relayParams: RelayParamsPayload;
  signature: string;
  referralCode: string;
}) => MultichainAction;

export function useMultichainReferralQuote({
  chainId,
  srcChainId,
  referralCodeHex,
  depositTokenAddress,
  sourceChainTokenId,
  simulationSigner,
  signAction,
  createAction,
  enabled = true,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId | undefined;
  referralCodeHex: string | undefined;
  depositTokenAddress: string | undefined;
  sourceChainTokenId: MultichainTokenId | undefined;
  simulationSigner: ReturnType<typeof import("config/multichain").RANDOM_WALLET.connect> | undefined;
  signAction: SignActionFn;
  createAction: CreateActionFn;
  enabled?: boolean;
}): AsyncResult<MultichainReferralQuoteResult> & {
  networkFeeUsd: bigint | undefined;
} {
  const { account, signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const settlementChainPublicClient = usePublicClient({ chainId });
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const result = useThrottledAsync(
    async ({ params: p }): Promise<MultichainReferralQuoteResult> => {
      if (p.sourceChainTokenId === undefined) {
        throw new Error("sourceChainTokenId is undefined");
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
      }) as RawRelayParamsPayload;

      const relayParams: RelayParamsPayload = {
        ...rawRelayParamsPayload,
        deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
      };

      const signature = await p.signAction({
        chainId: p.chainId,
        srcChainId: p.srcChainId,
        signer: p.simulationSigner,
        relayParams,
        referralCode: p.referralCodeHex,
        shouldUseSignerMethod: true,
      });

      const action = p.createAction({
        relayParams,
        signature,
        referralCode: p.referralCodeHex,
      });

      const composeGas = await estimateMultichainDepositNetworkComposeGas({
        action,
        chainId: p.chainId,
        account: p.simulationSigner.address,
        srcChainId: p.srcChainId,
        tokenAddress: p.depositTokenAddress,
        settlementChainPublicClient: p.settlementChainPublicClient,
      });

      const sourceChainStargateAddress = p.sourceChainTokenId.stargate;

      const iStargateInstance = new Contract(
        sourceChainStargateAddress,
        IStargateAbi,
        p.signer
      ) as unknown as IStargate;

      const tokenAmount =
        FAKE_INPUT_AMOUNT_MAP[p.sourceChainTokenId.symbol] ?? numberToBigint(0.02, p.sourceChainTokenId.decimals);

      const sendParamsWithRoughAmount = getMultichainTransferSendParams({
        isToGmx: true,
        dstChainId: p.chainId,
        account: p.simulationSigner.address,
        amountLD: tokenAmount,
        srcChainId: p.srcChainId,
        composeGas,
        action,
      });

      const [limit, oftFeeDetails] = await iStargateInstance.quoteOFT(sendParamsWithRoughAmount);

      let negativeFee = 0n;
      for (const oftFeeDetail of oftFeeDetails) {
        negativeFee += oftFeeDetail[0];
      }

      const minAmount = limit.minAmountLD === 0n ? 1n : limit.minAmountLD;

      let amountBeforeFee = minAmount - negativeFee;
      amountBeforeFee = (amountBeforeFee * 15n) / 10n;

      const sendParamsWithMinimumAmount: SendParam = {
        ...sendParamsWithRoughAmount,
        amountLD: amountBeforeFee,
        minAmountLD: 0n,
      };

      const quoteSend = await iStargateInstance.quoteSend(sendParamsWithMinimumAmount, false);

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
        provider !== undefined &&
        srcChainId !== undefined &&
        settlementChainPublicClient !== undefined &&
        globalExpressParams !== undefined &&
        simulationSigner !== undefined &&
        referralCodeHex !== undefined &&
        account !== undefined &&
        sourceChainTokenId !== undefined &&
        depositTokenAddress !== undefined &&
        signer !== undefined
          ? {
              provider,
              chainId,
              srcChainId,
              settlementChainPublicClient,
              globalExpressParams,
              simulationSigner,
              referralCodeHex,
              account,
              sourceChainTokenId,
              depositTokenAddress,
              signAction,
              createAction,
              signer,
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

export function createRelayParamsPayload(
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
  }) as RawRelayParamsPayload;

  return {
    ...rawRelayParamsPayload,
    deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };
}
