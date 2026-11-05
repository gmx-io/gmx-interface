import { composeApiPositionInfo } from "domain/synthetics/positions/usePositionsInfo";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import type { ApiPositionInfo, PositionsInfoData } from "sdk/utils/positions/types";

// gmx-api computes Solana positions like EVM ones (USD ×10^30); positions in a market the app does not
// list are left out, as on EVM.
export function composeGmsolPositionsInfo(
  positions: ApiPositionInfo[],
  marketsInfoData: MarketsInfoData,
  { showPnlInLeverage }: { showPnlInLeverage: boolean }
): PositionsInfoData {
  const positionsInfoData: PositionsInfoData = {};

  for (const position of positions) {
    const positionInfo = composeApiPositionInfo(position, marketsInfoData);

    if (positionInfo) {
      positionInfo.leverage = showPnlInLeverage ? positionInfo.leverageWithPnl : positionInfo.leverageWithoutPnl;
      positionsInfoData[positionInfo.key] = positionInfo;
    }
  }

  return positionsInfoData;
}
