import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { TransferRequests } from "domain/multichain/types";
import type { CreateGlvWithdrawalParams, CreateWithdrawalParams } from "domain/synthetics/markets";
import { buildAndSignMultichainGlvWithdrawalTxn } from "domain/synthetics/markets/createMultichainGlvWithdrawalTxn";
import { buildAndSignMultichainWithdrawalTxn } from "domain/synthetics/markets/createMultichainWithdrawalTxn";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import type { GmPaySource } from "../types";

export function useMultichainWithdrawalExpressTxnParams({
  transferRequests,
  paySource,
  gmParams,
  glvParams,
}: {
  transferRequests: TransferRequests | undefined;
  paySource: GmPaySource;
  gmParams: CreateWithdrawalParams | undefined;
  glvParams: CreateGlvWithdrawalParams | undefined;
}) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();

  const enabled =
    paySource === "gmxAccount" &&
    Boolean(glvParams || gmParams) &&
    transferRequests !== undefined &&
    signer !== undefined;

  const multichainWithdrawalExpressTxnParams = useArbitraryRelayParamsAndPayload({
    isGmxAccount: paySource === "gmxAccount",
    enabled,
    executionFeeAmount: glvParams ? glvParams.executionFee : gmParams?.executionFee,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if (!enabled) {
        throw new Error("Invalid params");
      }

      if (glvParams) {
        const txnData = await buildAndSignMultichainGlvWithdrawalTxn({
          emptySignature: true,
          account: glvParams!.addresses.receiver,
          chainId,
          params: glvParams!,
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

      const txnData = await buildAndSignMultichainWithdrawalTxn({
        emptySignature: true,
        account: gmParams!.addresses.receiver,
        chainId,
        params: gmParams!,
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
