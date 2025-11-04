import { convertToUsd } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getBasisPoints } from "lib/numbers";
import { SharePositionActionSource } from "lib/userAnalytics/types";
import { PositionTradeAction } from "sdk/types/tradeHistory";
import { getEntryPrice, getLeverage } from "sdk/utils/positions";

import PositionShare from "components/PositionShare/PositionShare";

import { getTokenPriceByTradeAction } from "./utils/position";

type ShareClosedPositionProps = {
  tradeAction: PositionTradeAction;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (isOpen: boolean) => void;
  doNotShowAgain?: boolean;
  onDoNotShowAgainChange?: (value: boolean) => void;
  onShareAction?: () => void;
  shareSource: SharePositionActionSource;
};

export default function ShareClosedPosition({
  tradeAction,
  isShareModalOpen,
  setIsShareModalOpen,
  doNotShowAgain,
  onDoNotShowAgainChange,
  onShareAction,
  shareSource,
}: ShareClosedPositionProps) {
  const { chainId } = useChainId();

  const collateralUsd =
    convertToUsd(
      tradeAction.initialCollateralDeltaAmount,
      tradeAction.initialCollateralToken.decimals,
      tradeAction.initialCollateralToken.prices.minPrice
    ) ?? 0n;

  const pnlUsd = tradeAction.pnlUsd ?? 0n;
  const pnlAfterFeesPercentage = collateralUsd != 0n && pnlUsd != 0n ? getBasisPoints(pnlUsd, collateralUsd) : 0n;

  const getLeverageProps = {
    sizeInUsd: tradeAction.sizeDeltaUsd ?? 0n,
    collateralUsd: collateralUsd,
    pendingBorrowingFeesUsd: 0n,
    pendingFundingFeesUsd: 0n,
  };

  const leverage = getLeverage({
    ...getLeverageProps,
    pnl: 0n,
  });

  const leverageWithPnl = getLeverage({
    ...getLeverageProps,
    pnl: pnlUsd,
  });

  const markPrice = getTokenPriceByTradeAction(tradeAction);

  const entryPrice = tradeAction.sizeDeltaInTokens
    ? getEntryPrice({
        sizeInTokens: tradeAction.sizeDeltaInTokens,
        sizeInUsd: tradeAction.sizeDeltaUsd,
        indexToken: tradeAction.marketInfo.indexToken,
      })
    : 0n;

  return (
    <PositionShare
      entryPrice={entryPrice}
      indexToken={tradeAction.marketInfo.indexToken}
      isLong={tradeAction.isLong}
      leverage={leverage}
      leverageWithPnl={leverageWithPnl}
      markPrice={markPrice ?? 0n}
      pnlAfterFeesPercentage={pnlAfterFeesPercentage}
      chainId={chainId}
      account={tradeAction.account}
      pnlAfterFeesUsd={tradeAction.pnlUsd ?? 0n}
      isPositionShareModalOpen={isShareModalOpen}
      setIsPositionShareModalOpen={setIsShareModalOpen}
      doNotShowAgain={doNotShowAgain}
      onDoNotShowAgainChange={onDoNotShowAgainChange}
      onShareAction={onShareAction}
      shareSource={shareSource}
    />
  );
}
