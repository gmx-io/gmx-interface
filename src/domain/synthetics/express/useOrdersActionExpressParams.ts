import type { Provider } from "ethers";
import { useCallback } from "react";

import {
  makeSelectExpressGlobalParamsForGasPaymentToken,
  selectGmxAccountExpressGlobalParams,
  selectGmxAccountGasPaymentToken,
  selectSettlementChainExpressGlobalParams,
  selectSettlementChainGasPaymentToken,
  selectUnavailableGasPaymentTokenAddresses,
  selectUnavailableGasPaymentTokens,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectSrcChainId,
  selectSubaccountForMultichainAction,
  selectSubaccountForSettlementChainAction,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectExpressOrdersEnabled } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useCalcSelector, useSelector } from "context/SyntheticsStateContext/utils";
import type { TokenData } from "domain/tokens";
import type { WalletSigner } from "lib/wallets";
import type { Order } from "sdk/utils/orders/types";
import { BatchOrderTxnParams, getBatchTotalPayCollateralAmount, getIsEmptyBatch } from "sdk/utils/orderTransactions";

import {
  estimateWithOtherFeeBalanceFallback,
  FeeBalanceEstimate,
  FeeBalanceExpressParams,
  getFeeBalanceDecision,
  getOrdersActionFeeBalance,
} from "./feeBalance";
import { estimateWithGmxAccountGasPaymentTokenFallback } from "./gasPaymentTokenFallback";
import type { GlobalExpressParams } from "./types";
import { useEstimateBatchExpressParamsWithApprovedGasToken } from "./useGasPaymentTokenFallback";
import { ExpressOrdersParamsResult, useExpressOrdersParams } from "./useRelayerFeeHandler";

export function useEstimateOrdersActionExpressParams() {
  const calcSelector = useCalcSelector();
  const estimateExpressParams = useEstimateBatchExpressParamsWithApprovedGasToken();

  return useCallback(
    async ({
      signer,
      provider,
      batchParams,
      orders,
    }: {
      signer: WalletSigner;
      provider: Provider;
      batchParams: BatchOrderTxnParams;
      orders: Pick<Order, "srcChainId">[];
    }): Promise<FeeBalanceExpressParams & { unavailableGasPaymentToken: TokenData | undefined }> => {
      const chainId = calcSelector(selectChainId);
      const feeBalance = getOrdersActionFeeBalance({
        chainId,
        srcChainId: calcSelector(selectSrcChainId),
        isExpressEnabled: calcSelector(selectExpressOrdersEnabled),
        orders,
      });

      const result = await estimateWithOtherFeeBalanceFallback({
        ...feeBalance,
        tokensData: calcSelector(selectTokensData),
        estimate: async (isGmxAccount) => {
          const globalExpressParams = calcSelector(
            isGmxAccount ? selectGmxAccountExpressGlobalParams : selectSettlementChainExpressGlobalParams
          );

          if (!globalExpressParams) {
            return undefined;
          }

          const estimateWith = (nextGlobalExpressParams: GlobalExpressParams | undefined) =>
            estimateExpressParams({
              signer,
              chainId,
              batchParams,
              globalExpressParams: nextGlobalExpressParams,
              requireValidations: false,
              provider,
              isGmxAccount,
              subaccount: calcSelector(
                isGmxAccount ? selectSubaccountForMultichainAction : selectSubaccountForSettlementChainAction
              ),
            });

          if (!isGmxAccount) {
            return estimateWith(globalExpressParams);
          }

          return estimateWithGmxAccountGasPaymentTokenFallback({
            chainId,
            globalExpressParams,
            payAmounts: getBatchTotalPayCollateralAmount(batchParams),
            estimate: estimateWith,
            getGlobalExpressParamsForGasPaymentToken: (gasPaymentTokenAddress) =>
              calcSelector(makeSelectExpressGlobalParamsForGasPaymentToken(gasPaymentTokenAddress)),
            unavailableTokenAddresses: calcSelector(selectUnavailableGasPaymentTokenAddresses),
          });
        },
      });

      const gasPaymentToken = calcSelector(
        result.isGmxAccount ? selectGmxAccountGasPaymentToken : selectSettlementChainGasPaymentToken
      );
      const isGasPaymentTokenUnavailable =
        gasPaymentToken !== undefined &&
        calcSelector(selectUnavailableGasPaymentTokens)[gasPaymentToken.address] !== undefined;

      return { ...result, unavailableGasPaymentToken: isGasPaymentTokenUnavailable ? gasPaymentToken : undefined };
    },
    [calcSelector, estimateExpressParams]
  );
}

export function useOrdersActionExpressParams({
  orders,
  orderParams,
  label,
  canSwitchGasPaymentToken,
}: {
  orders: Pick<Order, "srcChainId">[];
  orderParams: BatchOrderTxnParams | undefined;
  label: string;
  canSwitchGasPaymentToken: boolean;
}): ExpressOrdersParamsResult & { isGmxAccount: boolean } {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const isExpressEnabled = useSelector(selectExpressOrdersEnabled);
  const tokensData = useSelector(selectTokensData);
  const feeBalance = getOrdersActionFeeBalance({ chainId, srcChainId, isExpressEnabled, orders });
  const { isGmxAccount } = feeBalance;

  const ownBalanceResult = useExpressOrdersParams({
    orderParams,
    label,
    isGmxAccount,
    canSwitchGasPaymentToken,
    gasPaymentTokenFallback: "approvedToken",
  });

  const canUseOtherBalance = feeBalance.canUseOtherBalance && !getIsEmptyBatch(orderParams);
  const own = getSettledEstimate(ownBalanceResult);
  const { shouldEstimateOtherBalance } = getFeeBalanceDecision({
    isGmxAccount,
    canUseOtherBalance,
    own,
    other: undefined,
    tokensData,
  });

  const otherBalanceResult = useExpressOrdersParams({
    orderParams: shouldEstimateOtherBalance ? orderParams : undefined,
    label,
    isGmxAccount: !isGmxAccount,
    canSwitchGasPaymentToken: canSwitchGasPaymentToken && !isGmxAccount,
    gasPaymentTokenFallback: "approvedToken",
  });

  const { payer } = getFeeBalanceDecision({
    isGmxAccount,
    canUseOtherBalance,
    own,
    other: shouldEstimateOtherBalance ? getSettledEstimate(otherBalanceResult) : undefined,
    tokensData,
  });

  if (payer === "other") {
    return { ...otherBalanceResult, isGmxAccount: !isGmxAccount };
  }

  if (payer === undefined && own.isSettled) {
    return {
      ...ownBalanceResult,
      expressParams: undefined,
      isGmxAccount,
      isLoading: true,
      isMultichainSubmitDisabled: true,
    };
  }

  return { ...ownBalanceResult, isGmxAccount };
}

function getSettledEstimate(result: ExpressOrdersParamsResult): FeeBalanceEstimate {
  return {
    expressParams: result.expressParams,
    isSettled: !result.isLoading && !result.isMultichainSubmitDisabled,
  };
}
