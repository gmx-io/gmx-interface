import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { helperToast } from "lib/helperToast";
import { TxnEvent, TxnEventName, WalletTxnCtx } from "lib/transactions";

import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";
import { getDistributionTitle } from "components/UserIncentiveDistribution/utils";

import SpinnerIcon from "img/ic_spinner.svg?react";

export function useClaimFundsTransactionCallback(data: { selectedDistributionIds: string[]; onSuccess: () => void }) {
  const { selectedDistributionIds, onSuccess } = data;

  return useCallback(
    async (event: TxnEvent<WalletTxnCtx>) => {
      switch (event.event) {
        case TxnEventName.Submitted:
          helperToast.info(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-medium">
                <Trans>Processing claim...</Trans>
              </div>
              <div className="flex flex-row gap-10 text-gray-200">
                <Trans>May take a few minutes</Trans>
                <SpinnerIcon className="spin size-15 text-typography-primary" />
              </div>
            </div>
          );

          return;
        case TxnEventName.Error:
          helperToast.error(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-medium">
                <Trans>Failed to claim funds</Trans>
              </div>
              <ToastifyDebug error={event.data.error.message ?? "Unknown error"} />
            </div>
          );

          return;
        case TxnEventName.Sent:
          helperToast.success(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-medium">
                <Trans>Funds claimed</Trans>
              </div>
              <div>
                <Trans>{selectedDistributionIds.map(getDistributionTitle).join(", ")} claimed</Trans>
              </div>
            </div>
          );
          onSuccess();

          return;
      }
    },
    [selectedDistributionIds, onSuccess]
  );
}
