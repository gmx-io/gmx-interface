import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { Collateral, NetValue, CommonProps, PositionOrders } from "./Common";
import { formatLeverage, formatPnl } from "domain/synthetics/positions";
import { formatUsdAmount } from "domain/synthetics/tokens";

import "./PositionSmall.scss";

export function PositionSmall(p: CommonProps) {
  return (
    <div className="App-card">
      <div className="App-card-title">
        <span className="Exchange-list-title">{p.position.indexToken?.symbol}</span>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Market</Trans>
          </div>
          <div>{p.position.marketName}</div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Leverage</Trans>
          </div>
          <div>
            {formatLeverage(p.position.leverage)}&nbsp;
            <span
              className={cx("Exchange-list-side", {
                positive: p.position.isLong,
                negative: !p.position.isLong,
              })}
            >
              {p.position.isLong ? t`Long` : t`Short`}
            </span>
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Size</Trans>
          </div>
          <div>{formatUsdAmount(p.position.sizeInUsd)}</div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Collateral</Trans>
          </div>
          <div className="position-list-collateral">
            <Collateral
              tooltipPosition="right-bottom"
              position={p.position}
              hideActions={p.hideActions}
              onEditClick={p.onEditCollateralClick}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>PnL</Trans>
          </div>
          <div>
            <span
              className={cx("Exchange-list-info-label", {
                positive: p.position.pnl?.gt(0),
                negative: p.position.pnl && p.position.pnl.lt(0),
                muted: p.position.pnl?.eq(0),
              })}
            >
              {formatPnl(p.position.pnl, p.position.pnlPercentage)}
            </span>
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Net Value</Trans>
          </div>
          <div>
            <NetValue tooltipPosition="right-bottom" position={p.position} showPnlAfterFees={p.showPnlAfterFees} />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Orders</Trans>
          </div>
          <div>
            {!p.positionOrders?.length && "None"}
            <PositionOrders />
          </div>
        </div>
      </div>
      <div className="App-card-divider" />
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Mark Price</Trans>
          </div>
          <div>{formatUsdAmount(p.position.markPrice)}</div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Entry Price</Trans>
          </div>
          <div>{formatUsdAmount(p.position.entryPrice)}</div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Liq. Price</Trans>
          </div>
          <div>{formatUsdAmount(p.position.liqPrice)}</div>
        </div>
      </div>
      {!p.hideActions && (
        <>
          <div className="App-card-divider"></div>
          <div className="App-card-options Position-buttons-container">
            <button
              className="App-button-option App-card-option"
              disabled={p.position.sizeInUsd.eq(0)}
              onClick={p.onClosePositionClick}
            >
              <Trans>Close</Trans>
            </button>
            <button
              className="App-button-option App-card-option"
              disabled={p.position.sizeInUsd.eq(0)}
              onClick={p.onEditCollateralClick}
            >
              <Trans>Edit Collateral</Trans>
            </button>
            {/* <button
              className="Exchange-list-action App-button-option App-card-option"
              onClick={p.onShareClick}
              disabled={p.position.sizeInUsd.eq(0)}
            >
              <Trans>Share</Trans>
            </button> */}
          </div>
        </>
      )}
    </div>
  );
}
