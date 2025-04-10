import { ethers, Signer } from "ethers";
import { extendError } from "lib/errors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import GelatoRelayRouterABI from "sdk/abis/GelatoRelayRouter.json";
import { getContract } from "sdk/configs/contracts";
import { MarketsInfoData } from "sdk/types/markets";
import { SignedTokenPermit, TokensData } from "sdk/types/tokens";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { withRetry, zeroHash } from "viem";
import {
  buildAndSignExpressCancelOrderTxn,
  buildAndSignExpressCreateOrderTxn,
  buildAndSignExpressUpdateOrderTxn,
  getExpressOrderOracleParams,
  RelayFeeParams,
  sendExpressTxn,
} from "./expressOrderUtils";
import { Subaccount } from "./subaccountUtils";
import {
  BatchOrderTxnEventParams,
  makeSimulation,
  sendBatchOrderWalletTxn,
  TxnCallback,
  TxnEventName,
} from "./walletTxnBuilder";

export type ExpressParams = {
  subaccount: Subaccount | undefined;
  relayFeeParams: RelayFeeParams;
  tokenPermits: SignedTokenPermit[];
};

export async function sendUniversalBatchTxn({
  chainId,
  signer,
  batchParams,
  tokensData,
  marketsInfoData,
  blockTimestampData,
  skipSimulation,
  callback,
  expressParams,
  __type = "createOrder",
}: {
  chainId: number;
  signer: Signer;
  batchParams: BatchOrderTxnParams;
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  blockTimestampData: BlockTimestampData | undefined;
  skipSimulation: boolean;
  expressParams: ExpressParams | undefined;
  callback: TxnCallback<BatchOrderTxnEventParams> | undefined;
  __type?: "createOrder" | "updateOrder" | "cancelOrder";
}) {
  const baseEventParams: BatchOrderTxnEventParams = {
    type: "batchOrder",
    mode: expressParams ? "express" : "wallet",
    chainId,
    signer,
    params: batchParams,
  };

  try {
    const simulation = !skipSimulation
      ? makeSimulation({
          chainId,
          signer,
          params: batchParams,
          blockTimestampData,
          tokensData,
        })
      : () => Promise.resolve(undefined);

    simulation()
      .then(() => {
        callback?.({
          txnParams: baseEventParams,
          event: TxnEventName.TxnSimulated,
          data: {},
        });
      })
      .catch((error) => {
        throw extendError(error, {
          errorContext: "simulation",
        });
      });

    const isNativePayment = batchParams.createOrderParams.some((p) => p.tokenTransfersParams?.isNativePayment);
    const isExpressAllowed = expressParams !== undefined && !isNativePayment;

    if (isExpressAllowed) {
      const { subaccount, relayFeeParams, tokenPermits } = expressParams;
      const relayContractAddress = getContract(
        chainId,
        subaccount?.address ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
      );
      const relayCotnract = new ethers.Contract(relayContractAddress, GelatoRelayRouterABI.abi, signer);
      const userNonce = await relayCotnract.userNonces(await signer.getAddress());

      let signedTxnData;
      if (__type === "createOrder") {
        signedTxnData = await buildAndSignExpressCreateOrderTxn({
          chainId,
          relayFeeParams,
          signer,
          subaccount,
          relayParamsPayload: {
            oracleParams: getExpressOrderOracleParams({
              chainId,
              createOrderParams: batchParams.createOrderParams,
              marketsInfoData,
              tokensData,
              gasPaymentTokenAddress: relayFeeParams.feeParams.feeToken,
              feeSwapPath: relayFeeParams.feeParams.feeSwapPath,
              feeTokenAddress: relayFeeParams.relayFeeToken,
            }),
            tokenPermits: tokenPermits ?? [],
            externalCalls: relayFeeParams.externalCalls,
            fee: relayFeeParams.feeParams,
            userNonce: userNonce,
          },
          orderPayload: batchParams.createOrderParams[0].orderPayload,
        });
      } else if (__type === "updateOrder") {
        signedTxnData = await buildAndSignExpressUpdateOrderTxn({
          chainId,
          relayFeeParams,
          signer,
          subaccount,
          relayParamsPayload: {
            oracleParams: getExpressOrderOracleParams({
              chainId,
              createOrderParams: [],
              marketsInfoData,
              tokensData,
              gasPaymentTokenAddress: relayFeeParams.feeParams.feeToken,
              feeSwapPath: relayFeeParams.feeParams.feeSwapPath,
              feeTokenAddress: relayFeeParams.relayFeeToken,
            }),
            tokenPermits: tokenPermits ?? [],
            externalCalls: relayFeeParams.externalCalls,
            fee: relayFeeParams.feeParams,
            userNonce: userNonce,
          },
          orderKey: batchParams.updateOrderParams[0].params.orderKey,
          increaseExecutionFee: batchParams.updateOrderParams[0].params.executionFeeTopUp !== 0n,
          updateOrderParams: batchParams.updateOrderParams[0].updatePayload,
        });
      } else {
        signedTxnData = await buildAndSignExpressCancelOrderTxn({
          chainId,
          relayFeeParams,
          signer,
          subaccount,
          relayParamsPayload: {
            oracleParams: getExpressOrderOracleParams({
              chainId,
              createOrderParams: [],
              marketsInfoData,
              tokensData,
              gasPaymentTokenAddress: relayFeeParams.feeParams.feeToken,
              feeSwapPath: relayFeeParams.feeParams.feeSwapPath,
              feeTokenAddress: relayFeeParams.relayFeeToken,
            }),
            tokenPermits: [],
            externalCalls: relayFeeParams.externalCalls,
            fee: relayFeeParams.feeParams,
            userNonce: userNonce,
          },
          orderKey: batchParams.cancelOrderParams[0].orderKey,
        });
      }

      const createdAt = Date.now();

      await withRetry(
        () =>
          sendExpressTxn({
            chainId,
            txnData: signedTxnData,
          }).then(async () => {
            callback?.({
              event: TxnEventName.TxnSent,
              txnParams: baseEventParams,
              data: {
                txnHash: zeroHash,
                blockNumber: BigInt(await signer.provider!.getBlockNumber()),
                createdAt,
              },
            });
          }),
        {
          retryCount: 3,
        }
      );
    } else {
      return sendBatchOrderWalletTxn({
        chainId,
        signer,
        params: batchParams,
        simulation,
        callback,
      });
    }
  } catch (error) {
    callback?.({
      txnParams: baseEventParams,
      event: TxnEventName.TxnError,
      data: {
        error,
      },
    });

    throw error;
  }
}
