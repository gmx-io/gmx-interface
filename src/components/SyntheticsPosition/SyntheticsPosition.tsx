import { t } from "@lingui/macro";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { Position } from "domain/synthetics/positions";
import {
  formatTokenAmountWithUsd,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";

type Props = {
  position: Position;
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

  const longText = position.isLong ? t`Long` : t`Short`;

  return (
    <tr className="Exhange-list-item">
      <td>
        {longText} {indexToken?.symbol}
      </td>
      <td></td>
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
      <td></td>
      <td></td>
      <td></td>
    </tr>
  );
}
