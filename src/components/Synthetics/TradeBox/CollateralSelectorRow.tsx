import { Trans, t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { AvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useMemo } from "react";

export type Props = {
  selectedCollateralAddress?: string;
  selectedMarketAddress?: string;
  marketsOptions?: AvailableMarketsOptions;
  availableCollaterals?: Token[];
  hasExistingPosition?: boolean;
  hasExistingOrder?: boolean;
  onSelectCollateralAddress: (address?: string) => void;
};

export function CollateralSelectorRow(p: Props) {
  const {
    selectedCollateralAddress,
    selectedMarketAddress,
    marketsOptions,
    hasExistingOrder,
    hasExistingPosition,
    availableCollaterals,
    onSelectCollateralAddress,
  } = p;

  const { collateralWithOrder, marketWithOrder, marketWithPosition, collateralWithPosition } = marketsOptions || {};

  const { chainId } = useChainId();

  const message = useMemo(() => {
    if (
      !hasExistingPosition &&
      collateralWithPosition &&
      selectedMarketAddress === marketWithPosition?.marketTokenAddress &&
      collateralWithPosition?.address !== selectedCollateralAddress
    ) {
      return (
        <div className="MarketSelector-tooltip-row">
          <Trans>
            You have an existing position with {collateralWithPosition.symbol} as collateral.{" "}
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
      );
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
      return (
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
      );
    }

    return null;
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
  ]);

  return (
    <ExchangeInfoRow
      label={
        message ? (
          <Tooltip
            handle={t`Collateral In`}
            position="left-bottom"
            className="MarketSelector-tooltip"
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
