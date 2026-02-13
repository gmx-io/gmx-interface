import { t } from "@lingui/macro";

import { USD_DECIMALS } from "config/factors";
import {
  selectChainId,
  selectPositionsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getTokenData } from "domain/synthetics/tokens";
import { formatAmount } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { convertTokenAddress, getPriceDecimals } from "sdk/configs/tokens";
import { getMarketIndexName } from "sdk/utils/markets";

import { StaticChartLine } from "components/TVChartContainer/types";

import { selectChartToken } from ".";

export const selectChartLines = createSelector<StaticChartLine[]>((q) => {
  const chainId = q(selectChainId);
  const { chartToken } = q(selectChartToken);
  const positionsInfo = q(selectPositionsInfoData);

  const chartTokenAddress = chartToken?.address;

  if (!chartTokenAddress) {
    return EMPTY_ARRAY;
  }

  const filteredPositions = Object.values(positionsInfo || {}).filter(
    (position) =>
      position.marketInfo &&
      convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") ===
        convertTokenAddress(chainId, chartTokenAddress, "wrapped")
  );

  const poolsCount = new Set(filteredPositions.map((p) => p.poolName).filter(Boolean)).size;
  const collateralsCount = new Set(filteredPositions.map((p) => p.collateralToken?.symbol).filter(Boolean)).size;

  const positionLines = filteredPositions.flatMap((position) => {
    const priceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);
    const longOrShortText = position.isLong ? t`Long` : t`Short`;
    const token = q((state) => getTokenData(selectTokensData(state), position.marketInfo?.indexTokenAddress, "native"));
    const marketIndexName = getMarketIndexName(position.marketInfo!) ?? "";
    const tokenVisualMultiplier = token?.visualMultiplier;
    const extraLabelParts = [
      collateralsCount > 1 ? position.collateralToken?.symbol : undefined,
      poolsCount > 1 ? position.poolName : undefined,
    ].filter(Boolean);
    const extraLabel = extraLabelParts.length ? ` (${extraLabelParts.join(", ")})` : "";

    const liquidationPrice = formatAmount(
      position?.liquidationPrice,
      USD_DECIMALS,
      priceDecimal,
      undefined,
      undefined,
      tokenVisualMultiplier
    );

    const lines: StaticChartLine[] = [
      {
        id: `${position.key}-entry`,
        title: t`Open ${longOrShortText} ${marketIndexName}${extraLabel}`,
        price: parseFloat(
          formatAmount(position.entryPrice, USD_DECIMALS, priceDecimal, undefined, undefined, tokenVisualMultiplier)
        ),
        positionData: {
          pnl: position.pnlAfterFees,
          sizeInUsd: position.sizeInUsd,
          sizeInTokens: position.sizeInTokens,
          isLong: position.isLong,
          marketIndexName,
          tokenSymbol: position.indexToken.symbol,
          tokenDecimals: position.indexToken.decimals,
        },
      },
    ];

    if (liquidationPrice && liquidationPrice !== "NA") {
      lines.push({
        id: `${position.key}-liquidation`,
        title: t`Liq. ${longOrShortText} ${marketIndexName}${extraLabel}`,
        price: parseFloat(liquidationPrice),
        lineType: "liquidation",
      });
    }

    return lines;
  });

  return positionLines;
});
