import { ReactNode } from "react";

import { getExplorerUrl } from "config/chains";
import { useChainId } from "lib/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";

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
      <div>{text}</div>
      <div className="flex flex-shrink-0 items-center justify-center">
        {status === "loading" && <SpinnerIcon className="spin size-15 text-typography-primary" />}
        {status !== "loading" && _txnLink && <ExternalLink href={_txnLink}>View</ExternalLink>}
      </div>
    </div>
  );
}
