import { ethers, Signer } from "ethers";
import { extendError } from "lib/errors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import GelatoRelayRouterABI from "sdk/abis/GelatoRelayRouter.json";
import { getContract } from "sdk/configs/contracts";
import { MarketsInfoData } from "sdk/types/markets";
import { SignedTokenPermit, TokensData } from "sdk/types/tokens";
import { BatchOrderTxnParams } from "sdk/utils/orderTransactions";
import { withRetry } from "viem";
import {
  buildAndSignExpressCreateOrderTxn,
  getExpressOrderOracleParams,
  RelayFeeParams,
  sendExpressTxn,
} from "./expressOrderUtils";
import { Subaccount } from "./subaccountUtils";
import { makeSimulation, sendBatchOrderWalletTxn, TxnCallback, TxnEventName } from "./walletTxnBuilder";

export type ExpressParams = {
  subaccount: Subaccount | undefined;
  relayFeeParams: RelayFeeParams;
  tokenPermits: SignedTokenPermit[];
  relayRouterNonce: bigint;
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
}: {
  chainId: number;
  signer: Signer;
  batchParams: BatchOrderTxnParams;
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  blockTimestampData: BlockTimestampData | undefined;
  skipSimulation: boolean;
  expressParams: ExpressParams | undefined;
  callback: TxnCallback<BatchOrderTxnParams> | undefined;
}) {
  try {
    const primaryOrderParams = batchParams.createOrderParams[0];

    if (!primaryOrderParams) {
      throw new Error("No primary order params");
    }

    const isNativePayment = primaryOrderParams.tokenTransfersParams?.isNativePayment;

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
          event: TxnEventName.TxnSimulated,
          data: {
            params: batchParams,
          },
        });
      })
      .catch((error) => {
        throw extendError(error, {
          errorContext: "simulation",
        });
      });

    const isExpressAllowed = expressParams !== undefined && !isNativePayment;

    if (isExpressAllowed) {
      const { subaccount, relayFeeParams, tokenPermits } = expressParams;
      const relayContractAddress = getContract(
        chainId,
        subaccount?.address ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
      );
      const relayCotnract = new ethers.Contract(relayContractAddress, GelatoRelayRouterABI.abi, signer);
      const userNonce = await relayCotnract.userNonces(await signer.getAddress());

      const signedTxnData = await buildAndSignExpressCreateOrderTxn({
        chainId,
        relayFeeParams,
        signer,
        subaccount,
        relayParamsPayload: {
          oracleParams: getExpressOrderOracleParams({
            chainId,
            initialCollateralAddress: primaryOrderParams.orderPayload.addresses.initialCollateralToken,
            collateralSwapPath: primaryOrderParams.orderPayload.addresses.swapPath,
            gasPaymentTokenAddress: relayFeeParams.feeParams.feeToken,
            feeSwapPath: relayFeeParams.feeParams.feeSwapPath,
            marketsInfoData,
          }),
          tokenPermits: tokenPermits ?? [],
          externalCalls: relayFeeParams.externalCalls,
          fee: relayFeeParams.feeParams,
          userNonce: userNonce,
        },
        orderPayload: primaryOrderParams.orderPayload,
      });

      // TODO: Fallbaclk to general txn
      await withRetry(
        () =>
          sendExpressTxn({
            chainId,
            txnData: signedTxnData,
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
      event: TxnEventName.TxnError,
      data: {
        params: batchParams,
        error,
      },
    });

    throw error;
  }
}
