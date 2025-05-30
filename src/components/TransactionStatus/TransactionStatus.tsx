import cx from "classnames";
import { ReactNode } from "react";
import { ImSpinner2 } from "react-icons/im";

import { getExplorerUrl } from "config/chains";
import { useChainId } from "lib/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";

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
    <div className="text-sm flex w-full items-center justify-between gap-8 py-2 text-14">
      <div
        className={cx({
          "opacity-50": status === "muted",
        })}
      >
        {text}
      </div>
      <div className="flex flex-shrink-0 items-center justify-center">
        {status === "loading" && <ImSpinner2 width={60} height={60} className="spin size-15 text-white" />}
        {status !== "loading" && _txnLink && <ExternalLink href={_txnLink}>View</ExternalLink>}
      </div>
    </div>
  );
}
