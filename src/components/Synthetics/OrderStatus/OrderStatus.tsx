import { t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import { useContractEvents } from "domain/synthetics/contractEvents";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { RequestStatus } from "components/RequestStatus/RequestStatus";
import { useEffect, useState } from "react";
import { useChainId } from "lib/chains";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { OrderType, isIncreaseOrder, isSwapOrder } from "domain/synthetics/orders";
import { BigNumber } from "ethers";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { formatTokenAmount, formatUsd } from "lib/numbers";

type Props = {
  orderType: OrderType;
  marketAddress?: string;
  isLong?: boolean;
  initialCollateralAddress?: string;
  initialCollateralAmount?: BigNumber;
  toSwapTokenAddress?: string;
  sizeDeltaUsd?: BigNumber;
  onClose: () => void;
};

export function OrderStatus(p: Props) {
  const [orderKey, setOrderKey] = useState<string>();
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { orderStatuses, touchOrderStatus } = useContractEvents();

  const orderStatus = orderKey ? orderStatuses[orderKey] : undefined;

  const market = getMarket(marketsData, p.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const initialCollateralToken = getTokenData(tokensData, p.initialCollateralAddress);
  const toSwapToken = getTokenData(tokensData, p.toSwapTokenAddress);

  const longText = p.isLong ? t`Long` : t`Short`;

  const isProcessing = !orderStatus?.cancelledTxnHash && !orderStatus?.executedTxnHash;

  function renderTitle() {
    if (isSwapOrder(p.orderType)) {
      if (!initialCollateralToken || !toSwapToken || !p.initialCollateralAmount) return t`Unknown order`;

      return t`Swap ${formatTokenAmount(
        p.initialCollateralAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.symbol
      )} for ${toSwapToken.symbol}`;
    }

    if (!indexToken) return t`Unknown order`;

    const orderTypeText = isIncreaseOrder(p.orderType) ? t`Increasing` : t`Decreasing`;

    return t`${orderTypeText} ${indexToken?.symbol} ${longText} by ${formatUsd(p.sizeDeltaUsd)}`;
  }

  function renderCreationStatus() {
    let text = "";
    let isLoading = true;

    if (isSwapOrder(p.orderType)) {
      if (!initialCollateralToken || !toSwapToken) return null;

      text = t`Sending swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} request`;

      if (orderStatus?.createdTxnHash) {
        isLoading = false;
        text = t`Swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} request sent`;
      }
    } else {
      if (!indexToken) return null;

      const orderTypeText = isIncreaseOrder(p.orderType) ? t`Increase` : t`Decrease`;

      text = t`Sending ${orderTypeText.toLowerCase()} ${indexToken.symbol} ${longText} request`;

      if (orderStatus?.createdTxnHash) {
        isLoading = false;
        text = t`${orderTypeText} ${indexToken.symbol} ${longText} request sent`;
      }
    }

    return <RequestStatus isLoading={isLoading} txnHash={orderStatus?.createdTxnHash} text={text} />;
  }

  function renderExecutionStatus() {
    let text = "";
    let isLoading = false;
    let txnHash: string | undefined;

    if (orderStatus?.createdTxnHash) {
      isLoading = true;
    }

    if (orderStatus?.executedTxnHash || orderStatus?.cancelledTxnHash) {
      isLoading = false;
      txnHash = orderStatus?.executedTxnHash || orderStatus?.cancelledTxnHash;
    }

    if (isSwapOrder(p.orderType)) {
      if (!initialCollateralToken || !toSwapToken) return null;

      text = t`Fulfilling swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} request`;

      if (orderStatus?.cancelledTxnHash) {
        text = t`Swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} cancelled`;
      }

      if (orderStatus?.executedTxnHash) {
        text = t`Swapped ${initialCollateralToken.symbol} for ${toSwapToken.symbol}`;
      }
    } else {
      if (!indexToken) return null;

      const orderTypeText = isIncreaseOrder(p.orderType) ? t`Increase` : t`Decrease`;

      text = t`Fulfilling ${orderTypeText.toLowerCase()} ${indexToken.symbol} ${longText} request`;

      if (orderStatus?.cancelledTxnHash) {
        text = t`${orderTypeText} ${indexToken.symbol} ${longText} cancelled`;
      }

      if (orderStatus?.executedTxnHash) {
        const orderTypeText = isIncreaseOrder(p.orderType) ? t`Increased` : t`Decreased`;
        text = t`${orderTypeText} ${indexToken.symbol} ${longText}`;
      }
    }

    return <RequestStatus isLoading={isLoading} txnHash={txnHash} text={text} />;
  }

  useEffect(() => {
    if (orderKey) return;

    const matchedPendingOrderStatus = Object.values(orderStatuses).find((orderStatus) => {
      if (
        !orderStatus.isTouched &&
        orderStatus.data.orderType === p.orderType &&
        (!p.marketAddress || orderStatus.data.market === p.marketAddress) &&
        (typeof p.isLong === "undefined" || orderStatus.data.isLong === p.isLong)
      ) {
        return true;
      }

      return false;
    });

    if (matchedPendingOrderStatus) {
      touchOrderStatus(matchedPendingOrderStatus.key);
      setOrderKey(matchedPendingOrderStatus.key);
    }
  }, [
    orderKey,
    orderStatuses,
    p.initialCollateralAddress,
    p.initialCollateralAmount,
    p.isLong,
    p.marketAddress,
    p.orderType,
    p.sizeDeltaUsd,
    touchOrderStatus,
  ]);

  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={p.onClose} label={t`Order status`} allowContentTouchMove>
        <div className="Confirmation-box-main">{renderTitle()}</div>

        {renderCreationStatus()}
        {renderExecutionStatus()}

        <div className="App-card-divider" />
        <SubmitButton onClick={p.onClose} disabled={isProcessing}>
          {isProcessing ? t`Processing...` : t`Close`}
        </SubmitButton>
      </Modal>
    </div>
  );
}
