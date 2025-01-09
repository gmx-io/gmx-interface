import cx from "classnames";
import { ReactNode } from "react";
import { ImSpinner2 } from "react-icons/im";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { useChainId } from "lib/chains";

export type TransactionStatusType = "muted" | "loading" | "success" | "error";

type Props = {
  status: TransactionStatusType;
  text: ReactNode;
  txnHash?: string;
};

export function TransactionStatus({ status, text, txnHash }: Props) {
  const { chainId } = useChainId();

  const txnLink = `${getExplorerUrl(chainId)}tx/${txnHash}`;

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
        {status !== "loading" && txnHash && (
          <ExternalLink className="!text-white" href={txnLink}>
            View
          </ExternalLink>
        )}
      </div>
    </div>
  );
}
