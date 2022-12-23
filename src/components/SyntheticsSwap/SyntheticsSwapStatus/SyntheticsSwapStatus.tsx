import { t } from "@lingui/macro";

import Modal from "components/Modal/Modal";
import { useContractEventsContext } from "domain/synthetics/contractEvents";

import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { RequestStatus } from "components/RequestStatus/RequestStatus";
import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { getTokenData, useAvailableTradeTokensData } from "domain/synthetics/tokens";

type Props = {
  isSwap: boolean;
  isLong: boolean;
  fromToken?: string;
  toToken?: string;
  onClose: () => void;
};

export function SyntheticSwapStatus(p: Props) {
  const [orderKey, setOrderKey] = useState<string>();

  const { chainId } = useChainId();
  const tokensData = useAvailableTradeTokensData(chainId);

  const { getPendingOrders, getOrderEvents, setIsOrderViewed } = useContractEventsContext();

  const { createdTxnHash, cancelledTxnHash, executedTxnHash } = getOrderEvents(orderKey) || {};

  function getOrderStatusText(stage: "creating" | "execution") {
    const from = getTokenData(tokensData, p.fromToken);
    const to = getTokenData(tokensData, p.toToken);

    if (!from || !to) {
      return t`Unknown order`;
    }

    if (p.isSwap) {
      if (stage === "creating") {
        if (orderKey) {
          return t`Swap ${from.symbol} to ${to.symbol} request sent`;
        }

        return t`Sending swap ${from.symbol} to ${to.symbol} request`;
      }

      if (stage === "execution") {
        if (cancelledTxnHash) {
          return t`Swap cancelled`;
        }

        if (executedTxnHash) {
          return t`Swapped ${from.symbol} to ${to.symbol}`;
        }

        return t`Fulfilling swap ${from.symbol} to ${to.symbol} request`;
      }
    }

    const longText = p.isLong ? t`Long` : t`Short`;

    if (stage === "creating") {
      if (orderKey) {
        return t`${longText} ${to.symbol} request sent`;
      }

      return t`Sending ${longText} ${to.symbol} request`;
    }

    if (stage === "execution") {
      if (cancelledTxnHash) {
        return t`${longText} ${to.symbol} cancelled`;
      }

      if (executedTxnHash) {
        return t`${longText} ${to.symbol} executed`;
      }

      return t`Fulfilling ${longText} ${to.symbol} request`;
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
      <Modal isVisible={true} setIsVisible={p.onClose} label={t`Order status`} allowContentTouchMove>
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
