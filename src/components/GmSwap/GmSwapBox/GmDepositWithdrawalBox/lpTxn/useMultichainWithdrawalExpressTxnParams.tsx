import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { TransferRequests } from "domain/multichain/types";
import type { CreateGlvWithdrawalParams, CreateWithdrawalParams } from "domain/synthetics/markets";
import { buildAndSignMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { buildAndSignMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import type { GmPaySource } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

export function useMultichainWithdrawalExpressTxnParams({
  transferRequests,
  paySource,
  params,
  isGlv,
  isWithdrawal,
}: {
  transferRequests: TransferRequests | undefined;
  paySource: GmPaySource;
  params: CreateWithdrawalParams | CreateGlvWithdrawalParams | undefined;
  isGlv: boolean;
  isWithdrawal: boolean;
}) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();

  const enabled =
    paySource === "gmxAccount" &&
    isWithdrawal &&
    Boolean(params) &&
    transferRequests !== undefined &&
    signer !== undefined;

  const multichainWithdrawalExpressTxnParams = useArbitraryRelayParamsAndPayload({
    isGmxAccount: paySource === "gmxAccount",
    enabled,
    executionFeeAmount: params?.executionFee,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if (!enabled) {
        throw new Error("Invalid params");
      }

      if (isGlv) {
        const glvParams = params as CreateGlvWithdrawalParams;
        const txnData = await buildAndSignMultichainGlvWithdrawalTxn({
          emptySignature: true,
          account: glvParams.addresses.receiver,
          chainId,
          params: glvParams,
          srcChainId,
          relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
          relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
          relayParams: {
            ...relayParams,
            deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          },
          signer,
          transferRequests,
        });

        return {
          txnData,
        };
      }

      const gmParams = params as CreateWithdrawalParams;
      const txnData = await buildAndSignMultichainWithdrawalTxn({
        emptySignature: true,
        account: gmParams.addresses.receiver,
        chainId,
        params: gmParams,
        srcChainId,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayParams: {
          ...relayParams,
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
        },
        signer,
        transferRequests,
      });

      return {
        txnData,
      };
    },
  });

  return multichainWithdrawalExpressTxnParams;
}
