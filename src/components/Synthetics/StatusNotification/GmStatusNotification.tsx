import { Trans, t } from "@lingui/macro";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import { convertTokenAddress } from "config/tokens";
import {
  PendingDepositData,
  PendingWithdrawalData,
  getPendingDepositKey,
  getPendingWithdrawalKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import { MarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useEffect, useMemo, useState } from "react";
import { useToastAutoClose } from "./useToastAutoClose";
import { StatusNotification } from "./StatusNotification";

export type Props = {
  toastTimestamp: number;
  pendingDepositData?: PendingDepositData;
  pendingWithdrawalData?: PendingWithdrawalData;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
};

export function GmStatusNotification({
  toastTimestamp,
  pendingDepositData,
  pendingWithdrawalData,
  marketsInfoData,
  tokensData,
}: Props) {
  const { chainId } = useChainId();
  const { depositStatuses, withdrawalStatuses, setDepositStatusViewed, setWithdrawalStatusViewed } =
    useSyntheticsEvents();

  const isDeposit = Boolean(pendingDepositData);

  const [depositStatusKey, setDepositStatusKey] = useState<string>();
  const [withdrawalStatusKey, setWithdrawalStatusKey] = useState<string>();

  const depositStatus = getByKey(depositStatuses, depositStatusKey);
  const withdrawalStatus = getByKey(withdrawalStatuses, withdrawalStatusKey);

  const isCompleted = isDeposit ? Boolean(depositStatus?.executedTxnHash) : Boolean(withdrawalStatus?.executedTxnHash);

  const hasError = isDeposit ? Boolean(depositStatus?.cancelledTxnHash) : Boolean(withdrawalStatus?.cancelledTxnHash);

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
        return t`Unknown buy GM order`;
      }

      let longToken: TokenData | undefined;
      let shortToken: TokenData | undefined;

      if (pendingDepositData.initialLongTokenAmount > 0) {
        longToken = getByKey(
          tokensData,
          convertTokenAddress(
            chainId,
            pendingDepositData.initialLongTokenAddress,
            pendingDepositData.shouldUnwrapNativeToken ? "native" : "wrapped"
          )
        );
      }

      if (pendingDepositData.initialShortTokenAmount > 0) {
        shortToken = getByKey(
          tokensData,
          convertTokenAddress(
            chainId,
            pendingDepositData.initialShortTokenAddress,
            pendingDepositData.shouldUnwrapNativeToken ? "native" : "wrapped"
          )
        );
      }

      const marketInfo = getByKey(marketsInfoData, pendingDepositData.marketAddress);
      const indexName = marketInfo ? getMarketIndexName(marketInfo) : "";
      const poolName = marketInfo ? getMarketPoolName(marketInfo) : "";

      let tokensText = "";
      if (marketInfo?.isSameCollaterals) {
        tokensText = longToken?.symbol ?? "";
      } else {
        tokensText = [longToken, shortToken]
          .filter(Boolean)
          .map((token) => token?.symbol)
          .join(" and ");
      }

      return (
        <Trans>
          <div className="inline-flex">
            Buying GM:&nbsp;<span>{indexName}</span>
            <span className="subtext gm-toast">[{poolName}]</span>
          </div>{" "}
          <span>with {tokensText}</span>
        </Trans>
      );
    } else {
      if (!pendingWithdrawalData) {
        return t`Unknown sell GM order`;
      }

      const marketInfo = getByKey(marketsInfoData, pendingWithdrawalData.marketAddress);
      const indexName = marketInfo ? getMarketIndexName(marketInfo) : "";
      const poolName = marketInfo ? getMarketPoolName(marketInfo) : "";

      return (
        <Trans>
          <div className="inline-flex">
            Selling GM:&nbsp;<span>{indexName}</span>
            <span className="subtext gm-toast">[{poolName}]</span>
          </div>
        </Trans>
      );
    }
  }, [chainId, isDeposit, marketsInfoData, pendingDepositData, pendingWithdrawalData, tokensData]);

  const creationStatus = useMemo(() => {
    let text = "";
    let status: TransactionStatusType = "loading";
    let createdTxnHash: string | undefined;

    if (isDeposit) {
      text = t`Sending Buy request`;

      if (depositStatus?.createdTxnHash) {
        text = t`Buy request sent`;
        status = "success";
        createdTxnHash = depositStatus?.createdTxnHash;
      }
    } else {
      text = t`Sending Sell request`;

      if (withdrawalStatus?.createdTxnHash) {
        text = t`Sell request sent`;
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
      text = t`Fulfilling Buy request`;

      if (depositStatus?.createdTxnHash) {
        status = "loading";
      }

      if (depositStatus?.executedTxnHash) {
        text = t`Buy order executed`;
        status = "success";
        txnHash = depositStatus?.executedTxnHash;
      }

      if (depositStatus?.cancelledTxnHash) {
        text = t`Buy order cancelled`;
        status = "error";
        txnHash = depositStatus?.cancelledTxnHash;
      }
    } else {
      text = t`Fulfilling Sell request`;

      if (withdrawalStatus?.createdTxnHash) {
        status = "loading";
      }

      if (withdrawalStatus?.executedTxnHash) {
        text = t`Sell order executed`;
        status = "success";
        txnHash = withdrawalStatus?.executedTxnHash;
      }

      if (withdrawalStatus?.cancelledTxnHash) {
        text = t`Sell order cancelled`;
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
          (status) => !status.isViewed && status.data && getPendingDepositKey(status.data) === pendingDepositKey
        )?.key;

        if (matchedStatusKey) {
          setDepositStatusKey(matchedStatusKey);
          setDepositStatusViewed(matchedStatusKey);
        }
      } else {
        if (withdrawalStatusKey) {
          return;
        }

        const matchedStatusKey = Object.values(withdrawalStatuses).find(
          (status) => !status.isViewed && status.data && getPendingWithdrawalKey(status.data) === pendingWithdrawalKey
        )?.key;

        if (matchedStatusKey) {
          setWithdrawalStatusKey(matchedStatusKey);
          setWithdrawalStatusViewed(matchedStatusKey);
        }
      }
    },
    [
      depositStatusKey,
      depositStatuses,
      isDeposit,
      pendingDepositKey,
      pendingWithdrawalKey,
      setDepositStatusViewed,
      setWithdrawalStatusViewed,
      toastTimestamp,
      withdrawalStatusKey,
      withdrawalStatuses,
    ]
  );

  useToastAutoClose(isCompleted, toastTimestamp);

  return (
    <StatusNotification title={title} hasError={hasError}>
      {creationStatus}
      {executionStatus}
    </StatusNotification>
  );
}
