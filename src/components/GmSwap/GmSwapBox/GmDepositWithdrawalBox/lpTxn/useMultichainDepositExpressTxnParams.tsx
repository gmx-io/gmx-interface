import { useArbitraryRelayParamsAndPayload } from "domain/multichain/arbitraryRelayParams";
import { TransferRequests } from "domain/multichain/types";
import type { CreateDepositParams, CreateGlvDepositParams } from "domain/synthetics/markets";
import { buildAndSignMultichainDepositTxn } from "domain/synthetics/markets/createMultichainDepositTxn";
import { buildAndSignMultichainGlvDepositTxn } from "domain/synthetics/markets/createMultichainGlvDepositTxn";
import type { GmPaySource } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

export function useMultichainDepositExpressTxnParams({
  transferRequests,
  paySource,
  params,
  isGlv,
  isDeposit,
}: {
  transferRequests: TransferRequests | undefined;
  paySource: GmPaySource;
  params: CreateDepositParams | CreateGlvDepositParams | undefined;
  isGlv: boolean;
  isDeposit: boolean;
}) {
  const { chainId, srcChainId } = useChainId();
  const { signer } = useWallet();

  const enabled =
    paySource === "gmxAccount" &&
    Boolean(params) &&
    isDeposit &&
    transferRequests !== undefined &&
    signer !== undefined;

  const multichainDepositExpressTxnParams = useArbitraryRelayParamsAndPayload({
    isGmxAccount: paySource === "gmxAccount",
    enabled,
    executionFeeAmount: params?.executionFee,
    expressTransactionBuilder: async ({ relayParams, gasPaymentParams }) => {
      if (!enabled) {
        throw new Error("Invalid params");
      }

      if (isGlv) {
        const glvParams = params as CreateGlvDepositParams;
        const txnData = await buildAndSignMultichainGlvDepositTxn({
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
      const gmParams = params as CreateDepositParams;
      const txnData = await buildAndSignMultichainDepositTxn({
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

  return multichainDepositExpressTxnParams;
}
