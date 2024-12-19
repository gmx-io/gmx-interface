import { Trans, t } from "@lingui/macro";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";
import { convertTokenAddress } from "config/tokens";
import {
  PendingDepositData,
  PendingShiftData,
  PendingWithdrawalData,
  getPendingDepositKey,
  getPendingShiftKey,
  getPendingWithdrawalKey,
  useSyntheticsEvents,
} from "context/SyntheticsEvents";
import {
  GlvAndGmMarketsInfoData,
  getGlvDisplayName,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { StatusNotification } from "./StatusNotification";
import { useToastAutoClose } from "./useToastAutoClose";

export type Props = {
  toastTimestamp: number;
  pendingDepositData?: PendingDepositData;
  pendingWithdrawalData?: PendingWithdrawalData;
  pendingShiftData?: PendingShiftData;
  marketsInfoData?: GlvAndGmMarketsInfoData;
  tokensData?: TokensData;
};

function select<A, B, C>(
  deposit: A,
  withdrawal: B,
  shift: C,
  operation: "deposit" | "withdrawal" | "shift"
): A | B | C {
  if (operation === "deposit") {
    return deposit;
  } else if (operation === "withdrawal") {
    return withdrawal;
  } else {
    return shift;
  }
}

export function GmStatusNotification({
  toastTimestamp,
  pendingDepositData,
  pendingWithdrawalData,
  pendingShiftData,
  marketsInfoData,
  tokensData,
}: Props) {
  const { chainId } = useChainId();
  const {
    depositStatuses,
    withdrawalStatuses,
    shiftStatuses,
    //
    setDepositStatusViewed,
    setWithdrawalStatusViewed,
    setShiftStatusViewed,
  } = useSyntheticsEvents();

  let operation: "deposit" | "withdrawal" | "shift";
  if (pendingDepositData) {
    operation = "deposit";
  } else if (pendingWithdrawalData) {
    operation = "withdrawal";
  } else {
    operation = "shift";
  }

  const [depositStatusKey, setDepositStatusKey] = useState<string>();
  const [withdrawalStatusKey, setWithdrawalStatusKey] = useState<string>();
  const [shiftStatusKey, setShiftStatusKey] = useState<string>();

  const depositStatus = getByKey(depositStatuses, depositStatusKey);
  const withdrawalStatus = getByKey(withdrawalStatuses, withdrawalStatusKey);
  const shiftStatus = getByKey(shiftStatuses, shiftStatusKey);

  const isCompleted = select(
    Boolean(depositStatus?.executedTxnHash),
    Boolean(withdrawalStatus?.executedTxnHash),
    Boolean(shiftStatus?.executedTxnHash),
    operation
  );

  const hasError = select(
    Boolean(depositStatus?.cancelledTxnHash),
    Boolean(withdrawalStatus?.cancelledTxnHash),
    Boolean(shiftStatus?.cancelledTxnHash),
    operation
  );

  const pendingDepositKey = useMemo(() => {
    if (pendingDepositData) {
      const key = getPendingDepositKey(pendingDepositData);
      return key;
    }
  }, [pendingDepositData]);

  const pendingWithdrawalKey = useMemo(() => {
    if (pendingWithdrawalData) {
      return getPendingWithdrawalKey(pendingWithdrawalData);
    }
  }, [pendingWithdrawalData]);

  const pendingShiftKey = useMemo(() => {
    if (pendingShiftData) {
      return getPendingShiftKey(pendingShiftData);
    }
  }, [pendingShiftData]);

  const title = useMemo(() => {
    if (operation === "deposit") {
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
      const glv = pendingDepositData.isGlvDeposit ? getByKey(marketsInfoData, pendingDepositData.glvAddress) : null;
      const glvInfo = glv && isGlvInfo(glv) ? glv : null;
      const indexName = glvInfo ? undefined : marketInfo ? getMarketIndexName(marketInfo) : undefined;
      const poolName = marketInfo ? getMarketPoolName(marketInfo) : "";

      let tokensText: string | ReactNode = "";
      if (marketInfo?.isSameCollaterals) {
        tokensText = longToken?.symbol ?? "";
      } else {
        tokensText = [longToken, shortToken]
          .filter(Boolean)
          .map((token) => token?.symbol)
          .join(" and ");
      }

      if (glvInfo && pendingDepositData.isMarketDeposit) {
        const gmMarket = marketsInfoData?.[pendingDepositData.marketAddress];

        if (gmMarket) {
          tokensText = (
            <>
              GM:
              <span className="inline-flex whitespace-nowrap">
                {" "}
                {getMarketIndexName(gmMarket)}
                <PoolName>{getMarketPoolName(gmMarket)}</PoolName>
              </span>
            </>
          );
        }
      }

      if (pendingDepositData.initialLongTokenAddress)
        return (
          <Trans>
            <div className="inline-flex">
              Buying {glvInfo ? getGlvDisplayName(glvInfo) : "GM:"}
              {indexName ? <span>&nbsp;{indexName}</span> : null}
              <PoolName>{poolName}</PoolName>
            </div>{" "}
            <span>with {tokensText}</span>
          </Trans>
        );
    } else if (operation === "withdrawal") {
      if (!pendingWithdrawalData) {
        return t`Unknown sell GM order`;
      }
      const marketInfo = getByKey(marketsInfoData, pendingWithdrawalData.marketAddress);
      const isGlv = marketInfo && isGlvInfo(marketInfo);
      const indexName = isGlv ? undefined : marketInfo ? getMarketIndexName(marketInfo) : undefined;
      const poolName = marketInfo ? getMarketPoolName(marketInfo) : "";

      return (
        <Trans>
          <div className="inline-flex">
            Selling {isGlv ? getGlvDisplayName(marketInfo) : "GM"}
            {indexName && <span>:&nbsp;{indexName}</span>}
            <PoolName>{poolName}</PoolName>
          </div>
        </Trans>
      );
    } else {
      if (!pendingShiftData) {
        return t`Unknown shift GM order`;
      }

      const fromMarketInfo = getByKey(marketsInfoData, pendingShiftData.fromMarket);
      const fromIndexName = fromMarketInfo ? getMarketIndexName(fromMarketInfo) : "";
      const fromPoolName = fromMarketInfo ? getMarketPoolName(fromMarketInfo) : "";

      const toMarketInfo = getByKey(marketsInfoData, pendingShiftData.toMarket);
      const toIndexName = toMarketInfo ? getMarketIndexName(toMarketInfo) : "";
      const toPoolName = toMarketInfo ? getMarketPoolName(toMarketInfo) : "";

      return (
        <Trans>
          Shifting from{" "}
          <span className="inline-flex items-center">
            <span>GM: {fromIndexName}</span>
            <PoolName>{fromPoolName}</PoolName>
          </span>{" "}
          to{" "}
          <span className="inline-flex items-center">
            <span>GM: {toIndexName}</span>
            <PoolName>{toPoolName}</PoolName>
          </span>
        </Trans>
      );
    }
  }, [chainId, marketsInfoData, operation, pendingDepositData, pendingShiftData, pendingWithdrawalData, tokensData]);

  const creationStatus = useMemo(() => {
    let text = "";
    let status: TransactionStatusType = "loading";
    let createdTxnHash: string | undefined;

    if (operation === "deposit") {
      text = t`Sending buy request`;

      if (depositStatus?.createdTxnHash) {
        text = t`Buy request sent`;
        status = "success";
        createdTxnHash = depositStatus?.createdTxnHash;
      }
    } else if (operation === "withdrawal") {
      text = t`Sending sell request`;

      if (withdrawalStatus?.createdTxnHash) {
        text = t`Sell request sent`;
        status = "success";
        createdTxnHash = withdrawalStatus?.createdTxnHash;
      }
    } else {
      text = t`Sending shift request`;

      if (shiftStatus?.createdTxnHash) {
        text = t`Shift request sent`;
        status = "success";
        createdTxnHash = shiftStatus?.createdTxnHash;
      }
    }

    return <TransactionStatus status={status} txnHash={createdTxnHash} text={text} />;
  }, [depositStatus?.createdTxnHash, operation, shiftStatus?.createdTxnHash, withdrawalStatus?.createdTxnHash]);

  const executionStatus = useMemo(() => {
    let text = "";
    let status: TransactionStatusType = "muted";
    let txnHash: string | undefined;

    if (operation === "deposit") {
      text = t`Fulfilling buy request`;

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
    } else if (operation === "withdrawal") {
      text = t`Fulfilling sell request`;

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
    } else {
      text = t`Fulfilling shift request`;

      if (shiftStatus?.createdTxnHash) {
        status = "loading";
      }

      if (shiftStatus?.executedTxnHash) {
        text = t`Shift order executed`;
        status = "success";
        txnHash = shiftStatus?.executedTxnHash;
      }

      if (shiftStatus?.cancelledTxnHash) {
        text = t`Shift order cancelled`;
        status = "error";
        txnHash = shiftStatus?.cancelledTxnHash;
      }
    }

    return <TransactionStatus status={status} txnHash={txnHash} text={text} />;
  }, [
    depositStatus?.cancelledTxnHash,
    depositStatus?.createdTxnHash,
    depositStatus?.executedTxnHash,
    operation,
    shiftStatus?.cancelledTxnHash,
    shiftStatus?.createdTxnHash,
    shiftStatus?.executedTxnHash,
    withdrawalStatus?.cancelledTxnHash,
    withdrawalStatus?.createdTxnHash,
    withdrawalStatus?.executedTxnHash,
  ]);

  useEffect(
    function getStatusKey() {
      if (operation === "deposit") {
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
      } else if (operation === "withdrawal") {
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
      } else {
        if (shiftStatusKey) {
          return;
        }

        const matchedStatusKey = Object.values(shiftStatuses).find(
          (status) => !status.isViewed && status.data && getPendingShiftKey(status.data) === pendingShiftKey
        )?.key;

        if (matchedStatusKey) {
          setShiftStatusKey(matchedStatusKey);
          setShiftStatusViewed(matchedStatusKey);
        }
      }
    },
    [
      depositStatusKey,
      depositStatuses,
      operation,
      pendingDepositKey,
      pendingShiftKey,
      pendingWithdrawalKey,
      setDepositStatusViewed,
      setShiftStatusViewed,
      setWithdrawalStatusViewed,
      shiftStatusKey,
      shiftStatuses,
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

function PoolName({ children }: { children: ReactNode }) {
  return children ? <span className="ml-2 text-12 font-normal text-white">[{children}]</span> : null;
}
