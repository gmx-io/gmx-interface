import { t } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { RequestStatus } from "components/RequestStatus/RequestStatus";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useMarkets } from "domain/synthetics/markets";
import { OrderType, isIncreaseOrderType, isSwapOrderType } from "domain/synthetics/orders";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useEffect, useState } from "react";
import "./OrderStatus.scss";

type Props = {
  orderType: OrderType;
  marketAddress?: string;
  isLong?: boolean;
  initialCollateralAddress?: string;
  initialCollateralAmount?: BigNumber;
  toSwapTokenAddress?: string;
  sizeDeltaUsd?: BigNumber;
  isVisible: boolean;
  onClose: () => void;
};

export function OrderStatus(p: Props) {
  const [orderKey, setOrderKey] = useState<string>();
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarkets(chainId);
  const { orderStatuses, touchOrderStatus } = useSyntheticsEvents();

  const orderStatus = orderKey ? orderStatuses[orderKey] : undefined;

  const market = getByKey(marketsData, p.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress, "native");
  const initialCollateralToken = getTokenData(tokensData, p.initialCollateralAddress);
  const toSwapToken = getTokenData(tokensData, p.toSwapTokenAddress);

  const longText = p.isLong ? t`Long` : t`Short`;

  const isProcessing = !orderStatus?.cancelledTxnHash && !orderStatus?.executedTxnHash;

  function renderTitle() {
    if (isSwapOrderType(p.orderType)) {
      if (!initialCollateralToken || !toSwapToken || !p.initialCollateralAmount) return t`Unknown order`;

      return t`Swap ${formatTokenAmount(
        p.initialCollateralAmount,
        initialCollateralToken.decimals,
        initialCollateralToken.symbol
      )} for ${toSwapToken.symbol}`;
    }

    if (!indexToken) return t`Unknown order`;

    const orderTypeText = isIncreaseOrderType(p.orderType) ? t`Increasing` : t`Decreasing`;

    return t`${orderTypeText} ${indexToken?.symbol} ${longText} by ${formatUsd(p.sizeDeltaUsd)}`;
  }

  function renderCreationStatus() {
    let text = "";
    let isLoading = true;

    if (isSwapOrderType(p.orderType)) {
      if (!initialCollateralToken || !toSwapToken) return null;

      text = t`Sending swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} request`;

      if (orderStatus?.createdTxnHash) {
        isLoading = false;
        text = t`Swap ${initialCollateralToken.symbol} for ${toSwapToken.symbol} request sent`;
      }
    } else {
      if (!indexToken) return null;

      const orderTypeText = isIncreaseOrderType(p.orderType) ? t`Increase` : t`Decrease`;

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

    if (isSwapOrderType(p.orderType)) {
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

      const orderTypeText = isIncreaseOrderType(p.orderType) ? t`Increase` : t`Decrease`;

      text = t`Fulfilling ${orderTypeText.toLowerCase()} ${indexToken.symbol} ${longText} request`;

      if (orderStatus?.cancelledTxnHash) {
        text = t`${orderTypeText} ${indexToken.symbol} ${longText} cancelled`;
      }

      if (orderStatus?.executedTxnHash) {
        const orderTypeText = isIncreaseOrderType(p.orderType) ? t`Increased` : t`Decreased`;
        text = t`${orderTypeText} ${indexToken.symbol} ${longText}`;
      }
    }

    return <RequestStatus isLoading={isLoading} txnHash={txnHash} text={text} />;
  }

  useEffect(
    function resetOrderKey() {
      if (!p.isVisible && orderKey) setOrderKey(undefined);
    },
    [orderKey, p.isVisible]
  );

  useEffect(
    function initOrderKey() {
      if (!p.isVisible || orderKey) return;

      const matchedPendingOrderStatus = Object.values(orderStatuses).find((orderStatus) => {
        if (
          !orderStatus.isTouched &&
          !orderStatus.cancelledTxnHash &&
          !orderStatus.executedTxnHash &&
          orderStatus.data.orderType === p.orderType &&
          (!p.marketAddress || orderStatus.data.marketAddress === p.marketAddress) &&
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
    },
    [
      orderKey,
      orderStatuses,
      p.initialCollateralAddress,
      p.initialCollateralAmount,
      p.isLong,
      p.isVisible,
      p.marketAddress,
      p.orderType,
      p.sizeDeltaUsd,
      touchOrderStatus,
    ]
  );

  return (
    <div className="Confirmation-box OrderStatus">
      <Modal isVisible={p.isVisible} setIsVisible={p.onClose} label={t`Order status`} allowContentTouchMove>
        {p.isVisible && (
          <>
            <div className="Confirmation-box-main">{renderTitle()}</div>
            {renderCreationStatus()}
            {renderExecutionStatus()}

            <div className="App-card-divider" />
            <Button className="w-100" variant="primary-action" onClick={p.onClose} disabled={isProcessing}>
              {isProcessing ? t`Processing...` : t`Close`}
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
