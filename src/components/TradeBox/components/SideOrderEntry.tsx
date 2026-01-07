import { useCallback, useMemo } from "react";

import {
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxMockPosition } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SidecarSlTpOrderEntry, SidecarOrderEntryGroupBase } from "domain/synthetics/sidecarOrders/types";
import { buildTpSlInputPositionData } from "domain/tpsl/sidecar";
import { expandDecimals } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { TPSLInputRow } from "components/TPSLModal/TPSLInputRow";

export type TPSLDisplayMode = "percentage" | "usd";

type Props = {
  type: "takeProfit" | "stopLoss";
  entry: SidecarSlTpOrderEntry;
  entriesInfo: SidecarOrderEntryGroupBase<SidecarSlTpOrderEntry>;
};

export function SideOrderEntry({ type, entry, entriesInfo }: Props) {
  const mockPosition = useSelector(selectTradeboxMockPosition);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isLong } = useSelector(selectTradeboxTradeFlags);

  const priceError = entry.price?.error ?? undefined;

  const collateralUsd = useMemo(() => {
    const collateralAmount = mockPosition?.collateralAmount;
    const collateralToken = mockPosition?.collateralToken;
    if (collateralAmount === undefined) return 0n;
    if (collateralToken?.decimals === undefined || collateralToken?.prices?.minPrice === undefined) return 0n;

    return bigMath.mulDiv(
      collateralAmount,
      collateralToken.prices.minPrice,
      expandDecimals(1, collateralToken.decimals)
    );
  }, [mockPosition?.collateralAmount, mockPosition?.collateralToken]);

  const positionData = useMemo(
    () =>
      buildTpSlInputPositionData({
        position: mockPosition ?? {
          sizeInUsd: 0n,
          sizeInTokens: 0n,
          collateralUsd: 0n,
          entryPrice: 0n,
          liquidationPrice: undefined,
          isLong,
        },
        collateralUsd,
        indexTokenDecimals: marketInfo?.indexToken?.decimals ?? 18,
        visualMultiplier: marketInfo?.indexToken?.visualMultiplier ?? 1,
      })!,
    [mockPosition, collateralUsd, isLong, marketInfo]
  );

  const handlePriceChange = useCallback(
    (value: string) => {
      entriesInfo.updateEntry(entry.id, "price", value);
    },
    [entriesInfo, entry.id]
  );

  const estimatedPnl = useMemo(() => {
    if (!entry.decreaseAmounts) return undefined;
    return {
      pnlUsd: entry.decreaseAmounts.realizedPnl,
      pnlPercentage: entry.decreaseAmounts.realizedPnlPercentage,
    };
  }, [entry.decreaseAmounts]);

  return (
    <TPSLInputRow
      type={type}
      priceValue={entry.price?.input ?? ""}
      onPriceChange={handlePriceChange}
      positionData={positionData}
      priceError={priceError}
      variant="compact"
      estimatedPnl={estimatedPnl}
    />
  );
}
