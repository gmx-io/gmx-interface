import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { AggregatedPositionData } from "domain/synthetics/positions";
import { formatUsdAmount } from "domain/synthetics/tokens";
import { AiOutlineEdit } from "react-icons/ai";

export type CommonProps = {
  position: AggregatedPositionData;
  positionOrders?: any[];
  hideActions?: boolean;
  showPnlAfterFees?: boolean;
  onClosePositionClick: () => void;
  onEditCollateralClick: () => void;
  onShareClick: () => void;
  onSelectMarketClick: () => void;
  onOrdersClick: () => void;
};

export function NetValue(p: {
  position: AggregatedPositionData;
  showPnlAfterFees?: boolean;
  tooltipPosition: "left-bottom" | "right-bottom";
}) {
  return (
    <Tooltip
      handle={formatUsdAmount(p.position.netValue)}
      position={p.tooltipPosition}
      handleClassName="plain"
      renderContent={() => (
        <div>
          {p.showPnlAfterFees
            ? t`Net Value: Initial Collateral + PnL - Fees`
            : t`Net Value: Initial Collateral + PnL - Borrow Fee`}
          <br />
          <br />
          <StatsTooltipRow
            label={t`Initial Collateral`}
            value={formatUsdAmount(p.position.collateralUsd)}
            showDollar={false}
          />
          <StatsTooltipRow label={t`PnL`} value={formatUsdAmount(p.position?.pnl)} showDollar={false} />
          <StatsTooltipRow
            label={t`Borrow fee:`}
            value={formatUsdAmount(p.position.pendingBorrowingFees?.mul(-1))}
            showDollar={false}
          />
          <StatsTooltipRow label={t`Open + Close fee`} showDollar={false} value={"-$0.00"} />
          <StatsTooltipRow
            label={t`PnL After Fees`}
            value={formatUsdAmount(p.position.pnlAfterFees)}
            showDollar={false}
          />
        </div>
      )}
    />
  );
}

export function Collateral(p: {
  position: AggregatedPositionData;
  hideActions?: boolean;
  onEditClick: () => void;
  tooltipPosition: "left-bottom" | "right-bottom";
}) {
  const { position, hideActions, onEditClick } = p;

  return (
    <>
      <Tooltip
        handle={`${formatUsdAmount(position.collateralUsdAfterFees)}`}
        position={p.tooltipPosition}
        handleClassName={cx("plain", { negative: position.hasLowCollateral })}
        renderContent={() => {
          return (
            <>
              {position.hasLowCollateral && (
                <div>
                  <Trans>
                    WARNING: This position has a low amount of collateral after deducting fees, deposit more collateral
                    to reduce the position's liquidation risk.
                  </Trans>
                  <br />
                  <br />
                </div>
              )}

              <StatsTooltipRow
                label={t`Initial Collateral`}
                value={formatUsdAmount(position.collateralUsd)}
                showDollar={false}
              />

              <StatsTooltipRow label={t`Borrow Fee`} showDollar={false} value={"..."} />
              <StatsTooltipRow showDollar={false} label={t`Borrow Fee / Day`} value={"..."} />

              <br />

              <StatsTooltipRow
                label={t`Collateral In`}
                value={position.collateralToken?.symbol || "..."}
                showDollar={false}
              />

              <br />
              <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
            </>
          );
        }}
      />
      {!hideActions && (
        <span className="edit-icon" onClick={onEditClick}>
          <AiOutlineEdit fontSize={16} />
        </span>
      )}
    </>
  );
}

export function PositionOrders(p: {}) {
  return null;
  // return (
  //   <div onClick={() => p.onOrdersClick()}>
  //     <Tooltip
  //       handle={t`Orders (${p.positionOrders.length})`}
  //       position="left-bottom"
  //       handleClassName={cx(["Exchange-list-info-label", "Exchange-position-list-orders", "plain", "clickable"], {
  //         muted: !hasOrderError,
  //         negative: hasOrderError,
  //       })}
  //       renderContent={() => {
  //         return (
  //           <>
  //             <strong>
  //               <Trans>Active Orders</Trans>
  //             </strong>
  //             {positionOrders.map((order) => {
  //               return (
  //                 <div
  //                   key={`${order.isLong}-${order.type}-${order.index}`}
  //                   className="Position-list-order active-order-tooltip"
  //                 >
  //                   {order.triggerAboveThreshold ? ">" : "<"} {formatAmount(order.triggerPrice, 30, 2, true)}:
  //                   {order.type === INCREASE ? " +" : " -"}${formatAmount(order.sizeDelta, 30, 2, true)}
  //                   {order.error && <div className="negative active-oredr-error">{order.error}</div>}
  //                 </div>
  //               );
  //             })}
  //           </>
  //         );
  //       }}
  //     />
  //   </div>
  // );
}
