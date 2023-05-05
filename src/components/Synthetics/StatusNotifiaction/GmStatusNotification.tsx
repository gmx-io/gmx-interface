import { t } from "@lingui/macro";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import { convertTokenAddress } from "config/tokens";
import {
  PendingDepositData,
  PendingWithdrawalData,
  getPendingDepositKey,
  getPendingWithdrawalKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useEffect, useMemo, useState } from "react";

export type Props = {
  pendingDepositData?: PendingDepositData;
  pendingWithdrawalData?: PendingWithdrawalData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
};

export function GmStatusNotification({
  pendingDepositData,
  pendingWithdrawalData,
  marketsInfoData,
  tokensData,
}: Props) {
  const { chainId } = useChainId();
  const { depositStatuses, withdrawalStatuses, touchDepositStatus, touchWithdrawalStatus } = useSyntheticsEvents();

  const isDeposit = Boolean(pendingDepositData);

  const [depositStatusKey, setDepositStatusKey] = useState<string>();
  const [withdrawalStatusKey, setWithdrawalStatusKey] = useState<string>();

  const depositStatus = getByKey(depositStatuses, depositStatusKey);
  const withdrawalStatus = getByKey(withdrawalStatuses, withdrawalStatusKey);

  const pendingDepositKey = useMemo(() => {
    if (pendingDepositData) {
      return getPendingDepositKey(pendingDepositData);
    }
  }, [pendingDepositData]);

  const pendingWithdrawalKey = useMemo(() => {
    if (pendingWithdrawalData) {
      return getPendingWithdrawalKey(pendingWithdrawalData);
    }
  }, [pendingWithdrawalData]);

  const title = useMemo(() => {
    if (isDeposit) {
      if (!pendingDepositData) {
        return t`Unknown deposit`;
      }

      let longToken: TokenData | undefined;
      let shortToken: TokenData | undefined;

      if (pendingDepositData.initialLongTokenAmount.gt(0)) {
        longToken = getByKey(
          tokensData,
          convertTokenAddress(
            chainId,
            pendingDepositData.initialLongTokenAddress,
            pendingDepositData.shouldUnwrapNativeToken ? "native" : "wrapped"
          )
        );
      }

      if (pendingDepositData.initialShortTokenAmount.gt(0)) {
        shortToken = getByKey(
          tokensData,
          convertTokenAddress(
            chainId,
            pendingDepositData.initialShortTokenAddress,
            pendingDepositData.shouldUnwrapNativeToken ? "native" : "wrapped"
          )
        );
      }

      const tokensText = [longToken, shortToken]
        .filter(Boolean)
        .map((token) => token?.symbol)
        .join(" and ");

      const marketInfo = getByKey(marketsInfoData, pendingDepositData.marketAddress);

      return t`Depositing ${tokensText} to ${marketInfo?.name}`;
    } else {
      if (!pendingWithdrawalData) {
        return t`Unknown withdrawal`;
      }

      const marketInfo = getByKey(marketsInfoData, pendingWithdrawalData.marketAddress);

      return t`Withdrawing from ${marketInfo?.name}`;
    }
  }, [chainId, isDeposit, marketsInfoData, pendingDepositData, pendingWithdrawalData, tokensData]);

  const creationStatus = useMemo(() => {
    let text = "";
    let status: TransactionStatusType = "loading";
    let createdTxnHash: string | undefined;

    if (isDeposit) {
      text = t`Sending Deposit request`;

      if (depositStatus?.createdTxnHash) {
        text = t`Deposit request sent`;
        status = "success";
        createdTxnHash = depositStatus?.createdTxnHash;
      }
    } else {
      text = t`Sending Withdrawal request`;

      if (withdrawalStatus?.createdTxnHash) {
        text = t`Withdrawal request sent`;
        status = "success";
        createdTxnHash = withdrawalStatus?.createdTxnHash;
      }
    }

    return <TransactionStatus status={status} txnHash={createdTxnHash} text={text} />;
  }, [depositStatus?.createdTxnHash, isDeposit, withdrawalStatus?.createdTxnHash]);

  const executionStatus = useMemo(() => {
    let text = "";
    let status: TransactionStatusType = "muted";
    let txnHash: string | undefined;

    if (isDeposit) {
      text = t`Fulfilling Deposit request`;

      if (depositStatus?.createdTxnHash) {
        status = "loading";
      }

      if (depositStatus?.executedTxnHash) {
        text = t`Deposit executed`;
        status = "success";
        txnHash = depositStatus?.executedTxnHash;
      }

      if (depositStatus?.cancelledTxnHash) {
        text = t`Deposit cancelled`;
        status = "error";
        txnHash = depositStatus?.cancelledTxnHash;
      }
    } else {
      text = t`Fulfilling Withdrawal request`;

      if (withdrawalStatus?.createdTxnHash) {
        status = "loading";
      }

      if (withdrawalStatus?.executedTxnHash) {
        text = t`Withdrawal executed`;
        status = "success";
        txnHash = withdrawalStatus?.executedTxnHash;
      }

      if (withdrawalStatus?.cancelledTxnHash) {
        text = t`Withdrawal cancelled`;
        status = "error";
        txnHash = withdrawalStatus?.cancelledTxnHash;
      }
    }

    return <TransactionStatus status={status} txnHash={txnHash} text={text} />;
  }, [depositStatus, isDeposit, withdrawalStatus]);

  useEffect(
    function getStatusKey() {
      if (isDeposit) {
        if (depositStatusKey) {
          return;
        }

        const matchedStatusKey = Object.values(depositStatuses).find(
          (status) => !status.isTouched && getPendingDepositKey(status.data) === pendingDepositKey
        )?.key;

        if (matchedStatusKey) {
          setDepositStatusKey(matchedStatusKey);
          touchDepositStatus(matchedStatusKey);
        }
      } else {
        if (withdrawalStatusKey) {
          return;
        }

        const matchedStatusKey = Object.values(withdrawalStatuses).find(
          (status) => !status.isTouched && getPendingWithdrawalKey(status.data) === pendingWithdrawalKey
        )?.key;

        if (matchedStatusKey) {
          setWithdrawalStatusKey(matchedStatusKey);
          touchWithdrawalStatus(matchedStatusKey);
        }
      }
    },
    [
      depositStatusKey,
      depositStatuses,
      isDeposit,
      pendingDepositKey,
      pendingWithdrawalKey,
      touchDepositStatus,
      touchWithdrawalStatus,
      withdrawalStatusKey,
      withdrawalStatuses,
    ]
  );

  return (
    <div className="StatusNotification">
      <div className="StatusNotification-title">{title}</div>

      <div className="StatusNotification-items">
        {creationStatus}
        {executionStatus}
      </div>
    </div>
  );
}
