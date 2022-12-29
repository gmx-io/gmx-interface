import { Trans, t } from "@lingui/macro";
import PositionDropdown from "components/Exchange/PositionDropdown";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { PositionInfo } from "domain/synthetics/positions";
import {
  formatTokenAmountWithUsd,
  formatUsdAmount,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { getLiquidationPrice } from "lib/legacy";

import { expandDecimals } from "lib/numbers";

type Props = {
  position: PositionInfo;
  onClosePositionClick: () => void;
  onEditCollateralClick: () => void;
};

export function SyntheticsPosition(p: Props) {
  const { chainId } = useChainId();
  const { position } = p;

  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const market = getMarket(marketsData, position.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const collateralToken = getTokenData(tokensData, position.collateralTokenAddress);

  const collateralUsd = getUsdFromTokenAmount(tokensData, position.collateralTokenAddress, position.collateralAmount);

  const currentSize = getUsdFromTokenAmount(tokensData, indexToken?.address, position.sizeInTokens);

  const pnl = position.isLong
    ? currentSize?.sub(position.sizeInUsd)
    : position.sizeInUsd.sub(currentSize || BigNumber.from(0));

  const borrowFee = position.pendingBorrowingFees;

  const netValue = collateralUsd?.add(pnl || BigNumber.from(0)).sub(borrowFee || BigNumber.from(0));

  const entryPrice = indexToken
    ? position.sizeInUsd.div(position.sizeInTokens).mul(expandDecimals(1, indexToken?.decimals))
    : BigNumber.from(0);

  const liqPrice = getLiquidationPrice({
    size: position.sizeInUsd,
    collateral: collateralUsd,
    averagePrice: indexToken?.prices?.maxPrice.add(indexToken?.prices?.minPrice).div(2),
  });

  const longText = position.isLong ? t`Long` : t`Short`;

  return (
    <tr className="Exhange-list-item">
      <td>
        {longText} {indexToken?.symbol}
      </td>
      <td>
        <Tooltip
          handle={formatUsdAmount(netValue)}
          renderContent={() => (
            <div>
              {t`Net Value: Initial Collateral + PnL - Borrow Fee`}
              <br />
              <br />

              <StatsTooltipRow
                label={t`Initial Collateral`}
                value={formatUsdAmount(collateralUsd)}
                showDollar={false}
              />

              <StatsTooltipRow label={t`PnL`} value={formatUsdAmount(pnl)} showDollar={false} />

              <StatsTooltipRow
                label={t`Borrow fee:`}
                value={formatUsdAmount(BigNumber.from(0).sub(borrowFee))}
                showDollar={false}
              />
            </div>
          )}
        />
      </td>
      <td>
        {formatTokenAmountWithUsd(position.sizeInTokens, position.sizeInUsd, indexToken?.symbol, indexToken?.decimals)}
      </td>
      <td>
        {formatTokenAmountWithUsd(
          position.collateralAmount,
          collateralUsd,
          collateralToken?.symbol,
          collateralToken?.decimals
        )}
      </td>
      <td>{formatUsdAmount(indexToken?.prices?.minPrice)}</td>
      <td>{formatUsdAmount(entryPrice)}</td>
      <td>{formatUsdAmount(liqPrice)}</td>
      <td>
        <button className="Exchange-list-action" onClick={p.onClosePositionClick}>
          <Trans>Close</Trans>
        </button>
      </td>
      <td>
        <PositionDropdown
          handleEditCollateral={p.onEditCollateralClick}
          handleShare={() => null}
          handleMarketSelect={() => null}
        />
      </td>
    </tr>
  );
}
