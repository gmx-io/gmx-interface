import { t } from "@lingui/macro";

import Modal from "components/Modal/Modal";
import { useContractEventsContext } from "domain/synthetics/contractEvents";

import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { RequestStatus } from "components/RequestStatus/RequestStatus";
import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { getMarketName, useMarketsData } from "domain/synthetics/markets";

type Props = {
  isDeposit: boolean;
  firstToken: string;
  secondToken?: string;
  market: string;
  onClose: () => void;
};

export function GmOrderStatus(p: Props) {
  const [orderKey, setOrderKey] = useState<string>();

  const { chainId } = useChainId();

  const tokensData = useAvailableTokensData(chainId);
  const marketsData = useMarketsData(chainId);

  const { getPendingOrders, getOrderEvents, setIsOrderViewed } = useContractEventsContext();

  const { createdTxnHash, cancelledTxnHash, executedTxnHash } = getOrderEvents(orderKey) || {};

  const orderTypeText = p.isDeposit ? t`Deposit` : t`Withdrawal`;

  function getOrderStatusText(stage: "creating" | "execution") {
    const marketName = getMarketName(marketsData, tokensData, p.market);

    const firstToken = getTokenData(tokensData, p.firstToken);
    const secondToken = getTokenData(tokensData, p.secondToken);

    if (!marketName) {
      return t`Unknown order`;
    }

    const tokensText = [firstToken, secondToken]
      .filter(Boolean)
      .map((t) => t!.symbol)
      .join(" and ");

    if (stage === "creating") {
      if (orderKey) {
        return t`${orderTypeText} ${tokensText} request sent`;
      }

      return t`Sending ${orderTypeText.toLocaleLowerCase()} ${tokensText} request`;
    }

    if (stage === "execution") {
      if (cancelledTxnHash) {
        return t`${orderTypeText} cancelled`;
      }

      if (executedTxnHash) {
        return t`Executed ${orderTypeText.toLowerCase()} ${tokensText}`;
      }

      return t`Fulfilling ${orderTypeText.toLowerCase()} ${tokensText} request`;
    }

    return t`Unknown order`;
  }

  const isProcessing = !cancelledTxnHash && !executedTxnHash;

  useEffect(() => {
    const pendingOrder = getPendingOrders()[0];

    if (pendingOrder) {
      setIsOrderViewed(pendingOrder.key);

      if (pendingOrder.key !== orderKey) {
        setOrderKey(pendingOrder.key);
      }
    }
  }, [getPendingOrders, orderKey, setIsOrderViewed]);

  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={p.onClose} label={t`${orderTypeText} status`} allowContentTouchMove>
        <RequestStatus text={getOrderStatusText("creating")} txnHash={createdTxnHash} isLoading={!createdTxnHash} />

        <RequestStatus
          text={getOrderStatusText("execution")}
          isLoading={Boolean(orderKey && !executedTxnHash && !cancelledTxnHash)}
          txnHash={cancelledTxnHash || executedTxnHash}
        />

        <div className="App-card-divider" />

        <SubmitButton onClick={p.onClose} disabled={isProcessing}>
          {isProcessing ? t`Processing...` : t`Close`}
        </SubmitButton>
      </Modal>
    </div>
  );
}
