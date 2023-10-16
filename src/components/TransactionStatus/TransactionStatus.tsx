import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import cx from "classnames";
import { useChainId } from "lib/chains";
import { ImSpinner2 } from "react-icons/im";
import "./TransactionStatus.scss";
import { ReactNode } from "react";

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
    <div className="TransactionStatus">
      <div
        className={cx("TransactionStatus-title", {
          muted: status === "muted",
        })}
      >
        {text}
      </div>
      <div className="TransactionStatus-status">
        {status === "loading" && <ImSpinner2 width={60} height={60} className="spin TransactionStatus-spin" />}
        {status !== "loading" && txnHash && <ExternalLink href={txnLink}>View</ExternalLink>}
      </div>
    </div>
  );
}
