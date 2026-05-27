import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { getExplorerUrl } from "config/chains";
import { useChainId } from "lib/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";

import CheckCircleIcon from "img/ic_check_circle.svg?react";
import CloseCircleIcon from "img/ic_close_circle.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

export type TransactionStatusType = "muted" | "loading" | "success" | "error";

type Props = {
  status: TransactionStatusType;
  text: ReactNode;
  txnHash?: string;
  txnLink?: string;
};

export function TransactionStatus({ status, text, txnHash, txnLink }: Props) {
  const { chainId } = useChainId();

  const _txnLink = txnLink ?? (txnHash ? `${getExplorerUrl(chainId)}tx/${txnHash}` : undefined);

  return (
    <div className="text-body-small flex w-full items-center justify-between gap-8 py-2 text-14">
      <div className="flex items-center gap-6">
        {status === "loading" && <SpinnerIcon className="spin size-15 shrink-0 text-typography-primary" />}
        {status === "success" && <CheckCircleIcon className="size-15 shrink-0 text-green-500" />}
        {status === "error" && <CloseCircleIcon className="size-15 shrink-0 text-red-500" />}
        {status === "muted" && <div className="size-15 shrink-0" aria-hidden />}
        <div>{text}</div>
      </div>
      {_txnLink && (
        <div className="flex flex-shrink-0 items-center justify-center">
          <ExternalLink href={_txnLink}>
            <Trans>View</Trans>
          </ExternalLink>
        </div>
      )}
    </div>
  );
}
