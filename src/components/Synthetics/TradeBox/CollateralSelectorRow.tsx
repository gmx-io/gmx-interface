import { Trans, t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { Token } from "domain/tokens";
import cx from "classnames";
import { useChainId } from "lib/chains";
import { useMemo } from "react";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxHasExistingOrder,
  selectTradeboxHasExistingPosition,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

export type Props = {
  selectedCollateralAddress?: string;
  selectedMarketAddress?: string;
  availableCollaterals?: Token[];
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

export function CollateralSelectorRow(p: Props) {
  const {
    selectedCollateralAddress,
    selectedMarketAddress,
    availableCollaterals,
    onSelectCollateralAddress,
    isMarket,
  } = p;

  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const hasExistingOrder = useSelector(selectTradeboxHasExistingOrder);
  const hasExistingPosition = useSelector(selectTradeboxHasExistingPosition);
  const { collateralWithOrder, marketWithOrder, marketWithPosition, collateralWithPosition } = marketsOptions || {};

  const { chainId } = useChainId();

  const { message, level } = useMemo(() => {
    if (
      !hasExistingPosition &&
      collateralWithPosition &&
      selectedMarketAddress === marketWithPosition?.marketTokenAddress &&
      collateralWithPosition?.address !== selectedCollateralAddress
    ) {
      if (isMarket) {
        return {
          message: (
            <div className="MarketSelector-tooltip-row">
              <Trans>
                <span className="negative">
                  You have an existing position with {collateralWithPosition.symbol} as collateral. This action will not
                  apply for that position.
                </span>
                <div
                  className="MarketSelector-tooltip-row-action clickable underline muted"
                  onClick={() => {
                    onSelectCollateralAddress(collateralWithPosition.address);
                  }}
                >
                  Switch to {collateralWithPosition.symbol} collateral.
                </div>{" "}
              </Trans>
            </div>
          ),
          level: "error",
        };
      }

      return {
        message: (
          <div className="MarketSelector-tooltip-row">
            <Trans>
              <span className="negative">
                You have an existing position with {collateralWithPosition.symbol} as collateral. This Order will not be
                valid for that Position.
              </span>
              <div
                className="MarketSelector-tooltip-row-action clickable underline muted"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithPosition.address);
                }}
              >
                Switch to {collateralWithPosition.symbol} collateral.
              </div>{" "}
            </Trans>
          </div>
        ),
        level: "error",
      };
    }

    if (
      !hasExistingPosition &&
      !hasExistingOrder &&
      !collateralWithPosition &&
      marketWithOrder &&
      selectedMarketAddress === marketWithOrder?.marketTokenAddress &&
      collateralWithOrder &&
      collateralWithOrder.address !== selectedCollateralAddress
    ) {
      return {
        message: (
          <div className="MarketSelector-tooltip-row">
            <Trans>
              You have an existing order with {collateralWithOrder.symbol} as collateral.{" "}
              <div
                className="MarketSelector-tooltip-row-action clickable underline muted"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithOrder.address);
                }}
              >
                Switch to {collateralWithOrder.symbol} collateral.
              </div>{" "}
            </Trans>
          </div>
        ),
        level: "warning",
      };
    }

    return { message: null };
  }, [
    hasExistingPosition,
    collateralWithPosition,
    selectedMarketAddress,
    marketWithPosition?.marketTokenAddress,
    selectedCollateralAddress,
    hasExistingOrder,
    marketWithOrder,
    collateralWithOrder,
    onSelectCollateralAddress,
    isMarket,
  ]);

  return (
    <ExchangeInfoRow
      label={
        message ? (
          <Tooltip
            handle={t`Collateral In`}
            position="bottom-start"
            className={cx("MarketSelector-tooltip", { error: level === "error" })}
            renderContent={() => <div className="MarketSelector-tooltip-content">{message}</div>}
          />
        ) : (
          t`Collateral In`
        )
      }
      className="SwapBox-info-row"
      value={
        selectedCollateralAddress &&
        availableCollaterals && (
          <TokenSelector
            label={t`Collateral In`}
            className="GlpSwap-from-token SwapBox-info-dropdown"
            chainId={chainId}
            tokenAddress={selectedCollateralAddress}
            onSelectToken={(token) => {
              onSelectCollateralAddress(token.address);
            }}
            tokens={availableCollaterals}
            showTokenImgInDropdown={true}
          />
        )
      }
    />
  );
}
