import { ethers } from "ethers";
import { useParams } from "react-router-dom";

import "./Actions.scss";

import { Trans } from "@lingui/macro";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { usePositionsInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";

export default function SyntheticsActions({
  savedIsPnlInLeverage,
  savedShowPnlAfterFees,
}: {
  savedIsPnlInLeverage: boolean;
  savedShowPnlAfterFees: boolean;
}) {
  const { account: paramsAccount } = useParams<{ account?: string }>();

  const { chainId } = useChainId();

  let checkSummedAccount: string | undefined;

  if (paramsAccount && ethers.utils.isAddress(paramsAccount)) {
    checkSummedAccount = ethers.utils.getAddress(paramsAccount);
  }

  const { marketsInfoData, tokensData, pricesUpdatedAt } = useMarketsInfo(chainId);
  const { positionsInfoData, isLoading: isPositionsLoading } = usePositionsInfo(chainId, {
    marketsInfoData,
    tokensData,
    pricesUpdatedAt,
    showPnlInLeverage: savedIsPnlInLeverage,
    account: checkSummedAccount,
  });
  const { ordersInfoData, isLoading: isOrdersLoading } = useOrdersInfo(chainId, {
    account: checkSummedAccount,
    marketsInfoData,
    tokensData,
  });

  return (
    <div className="Actions">
      {checkSummedAccount && (
        <div className="Actions-section">
          <Trans>Account</Trans>: {checkSummedAccount}
        </div>
      )}

      {checkSummedAccount && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Positions</Trans>
          </div>
          <PositionList
            positionsData={positionsInfoData}
            ordersData={ordersInfoData}
            isLoading={isPositionsLoading}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            onOrdersClick={() => null}
            onSelectPositionClick={() => null}
            onClosePositionClick={() => null}
            onEditCollateralClick={() => null}
            showPnlAfterFees={savedShowPnlAfterFees}
            savedShowPnlAfterFees={savedShowPnlAfterFees}
            openSettings={() => null}
            hideActions
          />
        </div>
      )}
      {checkSummedAccount && (
        <div className="Actions-section">
          <div className="Actions-title">
            <Trans>Orders</Trans>
          </div>
          <OrderList
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            positionsData={positionsInfoData}
            ordersData={ordersInfoData}
            setSelectedOrdersKeys={() => null}
            isLoading={isOrdersLoading}
            setPendingTxns={() => null}
            hideActions
          />
        </div>
      )}
      <div className="Actions-section">
        <div className="Actions-title">
          <Trans>Actions</Trans>
        </div>
        <TradeHistory
          account={checkSummedAccount}
          forAllAccounts={!checkSummedAccount}
          marketsInfoData={marketsInfoData}
          tokensData={tokensData}
          shouldShowPaginationButtons
        />
      </div>
    </div>
  );
}
