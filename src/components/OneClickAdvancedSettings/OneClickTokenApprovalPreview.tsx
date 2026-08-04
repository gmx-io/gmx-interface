import { Trans } from "@lingui/macro";
import cx from "classnames";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";

import TokenIcon from "components/TokenIcon/TokenIcon";

import SpinnerIcon from "img/ic_spinner.svg?react";

export function OneClickTokenApprovalPreview({ className }: { className?: string }) {
  const { oneClickTokenApproval } = useSubaccountContext();

  if (!oneClickTokenApproval?.canBatch || oneClickTokenApproval.pendingTokens.length === 0) {
    return null;
  }

  return (
    <div
      className={cx("mt-8 rounded-8 border-1/2 border-slate-600 bg-slate-950/40 p-10", className)}
      data-qa="one-click-token-approval-preview"
    >
      <div className="text-13 font-medium text-typography-primary">
        <Trans>Optional token approvals</Trans>
      </div>
      <div className="mt-2 text-12 text-typography-secondary">
        <Trans>Approve One-Click gas payment tokens in one wallet confirmation.</Trans>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {oneClickTokenApproval.pendingTokens.map((token) => (
          <div key={token.address} className="flex items-center justify-between gap-8 text-12">
            <div className="flex items-center gap-6 text-typography-primary">
              <TokenIcon symbol={token.symbol} displaySize={16} />
              <span>{token.symbol}</span>
            </div>
            <span className="text-typography-secondary">
              <Trans>Unlimited</Trans>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-6 text-12 text-typography-secondary">
        {oneClickTokenApproval.isApproving && <SpinnerIcon className="size-14 animate-spin" />}
        <span>
          {oneClickTokenApproval.isApproving ? (
            <Trans>Confirm the optional approval in your wallet</Trans>
          ) : (
            <Trans>Skipping this request won't interrupt One-Click setup.</Trans>
          )}
        </span>
      </div>
    </div>
  );
}
