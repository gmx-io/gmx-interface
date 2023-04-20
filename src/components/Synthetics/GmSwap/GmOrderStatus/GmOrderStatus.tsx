import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { RequestStatus } from "components/RequestStatus/RequestStatus";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMarketsInfo } from "domain/synthetics/markets";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useEffect, useState } from "react";
import "./GmOrderStatus.scss";

type Props = {
  isDeposit: boolean;
  firstToken: string;
  secondToken?: string;
  market: string;
  onClose: () => void;
};

export function GmOrderStatus(p: Props) {
  const { chainId } = useChainId();
  const { depositStatuses, withdrawalStatuses, touchDepositStatus, touchWithdrawalStatus } = useSyntheticsEvents();
  const [orderKey, setOrderKey] = useState<string>();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);

  const ordersEvents = p.isDeposit ? depositStatuses : withdrawalStatuses;
  const orderStatus = orderKey ? ordersEvents[orderKey] : undefined;

  const marketInfo = getByKey(marketsInfoData, p.market);

  const marketName = marketInfo?.name || "...";
  const firstToken = getTokenData(tokensData, p.firstToken);
  const secondToken = getTokenData(tokensData, p.secondToken);

  const isProcessing = !orderStatus?.cancelledTxnHash && !orderStatus?.executedTxnHash;

  const tokensText = [firstToken, secondToken]
    .filter(Boolean)
    .map((t) => t!.symbol)
    .join(" and ");

  const orderTypeText = p.isDeposit ? t`Deposit` : t`Withdrawal`;

  function renderCreationStatus() {
    let text = t`Sending ${orderTypeText.toLocaleLowerCase()} ${tokensText} request`;
    let isLoading = true;

    if (orderStatus?.createdTxnHash) {
      isLoading = false;
      text = t`${orderTypeText} ${tokensText} request sent`;
    }

    return <RequestStatus isLoading={isLoading} txnHash={orderStatus?.createdTxnHash} text={text} />;
  }

  function renderExecutionStatus() {
    let text = t`Fulfilling ${orderTypeText.toLowerCase()} ${tokensText} request`;
    let isLoading = false;
    let txnHash: string | undefined;

    if (orderStatus?.createdTxnHash) {
      isLoading = true;
    }

    if (orderStatus?.cancelledTxnHash) {
      text = t`${orderTypeText} cancelled`;
      isLoading = false;
      txnHash = orderStatus.cancelledTxnHash;
    }

    if (orderStatus?.executedTxnHash) {
      text = t`Executed ${orderTypeText.toLowerCase()} ${tokensText}`;
      isLoading = false;
      txnHash = orderStatus.executedTxnHash;
    }

    return <RequestStatus isLoading={isLoading} txnHash={txnHash} text={text} />;
  }

  useEffect(() => {
    if (orderKey) return;

    if (p.isDeposit) {
      const pendingOrder = Object.values(depositStatuses).find(
        (depositStatus) => !depositStatus.isTouched && depositStatus.data.market === p.market
      );

      if (pendingOrder) {
        touchDepositStatus(pendingOrder.key);
        setOrderKey(pendingOrder.key);
      }
    } else {
      const pendingOrder = Object.values(withdrawalStatuses).find(
        (withdrawalStatus) => !withdrawalStatus.isTouched && withdrawalStatus.data.market === p.market
      );

      if (pendingOrder) {
        touchWithdrawalStatus(pendingOrder.key);
        setOrderKey(pendingOrder.key);
      }
    }
  }, [depositStatuses, orderKey, p.isDeposit, p.market, touchDepositStatus, touchWithdrawalStatus, withdrawalStatuses]);

  return (
    <div className="Confirmation-box GmOrderStatus">
      <Modal isVisible={true} setIsVisible={p.onClose} label={t`${orderTypeText} status`} allowContentTouchMove>
        <div className={cx("Confirmation-box-main")}>
          {p.isDeposit && <Trans>Depositing to {marketName}</Trans>}
          {!p.isDeposit && <Trans>Withdrawal from {marketName}</Trans>}
        </div>

        {renderCreationStatus()}
        {renderExecutionStatus()}

        <div className="App-card-divider" />

        <Button className="w-100" variant="primary-action" onClick={p.onClose} disabled={isProcessing}>
          {isProcessing ? t`Processing...` : t`Close`}
        </Button>
      </Modal>
    </div>
  );
}
