import { t } from "@lingui/macro";

import type { ContractsChainId } from "sdk/configs/chains";
import { getMarketsByChainId } from "sdk/configs/markets";
import { getTokensMap } from "sdk/configs/tokens";
import { getMarketIndexName } from "sdk/utils/markets/utils";
import { parsePositionKey } from "sdk/utils/positions/utils";

// only the position key survives the trip to the Swap page and the toasts, so the label comes from static config
export function getAddMarginPositionLabel(chainId: ContractsChainId, positionKey: string): string {
  const { marketAddress, isLong } = parsePositionKey(positionKey);
  const market = getMarketsByChainId(chainId)[marketAddress];
  const indexToken = market ? getTokensMap(chainId)[market.indexTokenAddress] : undefined;
  const directionLabel = isLong ? t`Long` : t`Short`;

  return indexToken ? `${directionLabel} ${getMarketIndexName({ indexToken, isSpotOnly: false })}` : directionLabel;
}
