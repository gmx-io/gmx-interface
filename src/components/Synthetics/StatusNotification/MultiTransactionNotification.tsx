import cx from "classnames";
import { useMemo } from "react";
import { useToastAutoClose } from "./useToastAutoClose";
import { TransactionStatus } from "components/TransactionStatus/TransactionStatus";
import { useMultiTransactions } from "context/MultiTransactionsContext/MultiTransactionsProvider";

type Props = {
  toastId: number;
  transactionKeys: string[];
  statusMessages: {
    [key: string]: {
      loading: string;
      success: string;
      error?: string;
    };
  };
  title: string;
};

export default function MultiTransactionNotification({ toastId, transactionKeys, statusMessages, title }: Props) {
  const { transactions: transactionStatuses } = useMultiTransactions();
  const isCompleted = useMemo(() => {
    return transactionKeys.every((key) => transactionStatuses[key]?.status === "success");
  }, [transactionKeys, transactionStatuses]);

  const hasError = useMemo(() => {
    return Object.values(transactionStatuses).some((status) => status.status === "error");
  }, [transactionStatuses]);

  useToastAutoClose(isCompleted, toastId);

  return (
    <div className="StatusNotification">
      <div className="StatusNotification-content">
        <div className="StatusNotification-title">{title}</div>
        <div className="StatusNotification-items">
          {transactionKeys.map((key) => {
            const transaction = transactionStatuses?.[key];
            const message = statusMessages[key];

            return (
              <TransactionStatus
                key={key}
                status={transaction?.status}
                txnHash={transaction?.hash}
                text={message[transaction?.status]}
              />
            );
          })}
        </div>
      </div>

      <div className={cx("StatusNotification-background", { error: hasError })}></div>
    </div>
  );
}
