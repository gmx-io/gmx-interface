import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { ImSpinner2 } from "react-icons/im";

import { helperToast } from "lib/helperToast";
import { TxnEvent, TxnEventName, WalletTxnCtx } from "lib/transactions";

import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

export function useClaimFundsTransactionCallback(data: {
  tokens: string[];
  claimableTokenTitles: Record<string, string>;
}) {
  const { tokens, claimableTokenTitles } = data;

  return useCallback(
    async (event: TxnEvent<WalletTxnCtx>) => {
      switch (event.event) {
        case TxnEventName.Submitted:
          helperToast.success(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Processing your claim…</Trans>
              </div>
              <div className="flex flex-row gap-10 text-gray-200">
                <Trans>This may take a few minutes.</Trans>
                <ImSpinner2 width={60} height={60} className="spin size-15 text-white" />
              </div>
            </div>
          );

          return;
        case TxnEventName.Error:
          helperToast.error(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Failed to claim funds</Trans>
              </div>
              <ToastifyDebug error={event.data.error.message ?? "Unknown error"} />
            </div>
          );

          return;
        case TxnEventName.Sent:
          helperToast.success(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Funds claimed</Trans>
              </div>
              <div>
                <Trans>Claimed {tokens.map((token) => claimableTokenTitles[token]).join(", ")} successfully.</Trans>
              </div>
              <div>
                <Trans>Hold the GLV tokens for three months to be eligible for the $500,000 incentive program.</Trans>
              </div>
            </div>
          );

          return;
      }
    },
    [tokens, claimableTokenTitles]
  );
}
