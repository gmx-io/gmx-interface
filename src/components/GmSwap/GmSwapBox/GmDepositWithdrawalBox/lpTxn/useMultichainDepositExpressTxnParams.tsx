import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import type { CreateDepositParamsStruct, CreateGlvDepositParamsStruct } from "domain/synthetics/markets";
import { buildAndSignMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { buildAndSignMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";
import type { IRelayUtils } from "typechain-types/MultichainGmRouter";

import type { GmPaySource } from "../types";

export function useMultichainDepositExpressTxnParams({
  transferRequests,
  paySource,
  gmParams,
  glvParams,
}: {
  transferRequests: IRelayUtils.TransferRequestsStruct;
  paySource: GmPaySource;
  gmParams: CreateDepositParamsStruct | undefined;
  glvParams: CreateGlvDepositParamsStruct | undefined;
}) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();

  const multichainDepositExpressTxnParams = useArbitraryRelayParamsAndPayload({
    isGmxAccount: paySource === "gmxAccount",
    enabled: paySource === "gmxAccount",
    executionFeeAmount: glvParams ? glvParams.executionFee : gmParams?.executionFee,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if ((!gmParams && !glvParams) || !signer) {
        throw new Error("Invalid params");
      }

      if (glvParams) {
        const txnData = await buildAndSignMultichainGlvDepositTxn({
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

      const txnData = await buildAndSignMultichainDepositTxn({
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

  return multichainDepositExpressTxnParams;
}
