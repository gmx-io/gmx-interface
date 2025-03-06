import { t } from "@lingui/macro";

import { USD_DECIMALS } from "config/factors";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import {
  selectChainId,
  selectPositionsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { getTokenData } from "domain/synthetics/tokens";
import { formatAmount } from "lib/numbers";
import { convertTokenAddress, getPriceDecimals, getTokenVisualMultiplier } from "sdk/configs/tokens";
import { StaticChartLine } from "components/TVChartContainer/types";
import { EMPTY_ARRAY } from "lib/objects";

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

  const positionLines = filteredPositions.flatMap((position) => {
    const priceDecimal = getPriceDecimals(chainId, position.indexToken.symbol);
    const longOrShortText = position.isLong ? t`Long` : t`Short`;
    const token = q((state) => getTokenData(selectTokensData(state), position.marketInfo?.indexTokenAddress, "native"));
    const tokenSymbol = token?.symbol;
    const prefix = token ? getTokenVisualMultiplier(token) : "";
    const tokenVisualMultiplier = token?.visualMultiplier;

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
        title: t`Open ${longOrShortText} ${prefix}${tokenSymbol}`,
        price: parseFloat(
          formatAmount(position.entryPrice, USD_DECIMALS, priceDecimal, undefined, undefined, tokenVisualMultiplier)
        ),
      },
    ];

    if (liquidationPrice && liquidationPrice !== "NA") {
      lines.push({
        title: t`Liq. ${longOrShortText} ${prefix}${tokenSymbol}`,
        price: parseFloat(liquidationPrice),
      });
    }

    return lines;
  });

  return positionLines;
});
