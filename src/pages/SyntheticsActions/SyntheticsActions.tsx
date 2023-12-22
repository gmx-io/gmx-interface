import { ethers } from "ethers";
import { useParams } from "react-router-dom";

import "./Actions.scss";

import { Trans, t } from "@lingui/macro";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { usePositionsInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import PageTitle from "components/PageTitle/PageTitle";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";

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
    skipLocalReferralCode: true,
  });
  const { ordersInfoData, isLoading: isOrdersLoading } = useOrdersInfo(chainId, {
    account: checkSummedAccount,
    marketsInfoData,
    positionsInfoData,
    tokensData,
  });

  return (
    <div className="default-container page-layout">
      {checkSummedAccount && (
        <div className="Actions-section">
          <PageTitle
            title={t`V2 Account`}
            subtitle={
              <>
                <Trans>GMX V2 information for account: {checkSummedAccount}</Trans>
                <div>
                  <ExternalLink newTab={false} href={`/#/actions/v1/${checkSummedAccount}`}>
                    Check on GMX V1
                  </ExternalLink>
                  .
                </div>
              </>
            }
          />
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
            onSettlePositionFeesClick={() => null}
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
          {checkSummedAccount ? (
            <Trans>Actions</Trans>
          ) : (
            <PageTitle
              isTop
              title={t`V2 Actions`}
              subtitle={
                <>
                  {<Trans>GMX V2 actions for all accounts.</Trans>}
                  <div>
                    <ExternalLink newTab={false} href={`/#/actions/v1`}>
                      Check on GMX V1
                    </ExternalLink>
                    .
                  </div>
                </>
              }
            />
          )}
        </div>
        <TradeHistory
          account={checkSummedAccount}
          forAllAccounts={!checkSummedAccount}
          marketsInfoData={marketsInfoData}
          tokensData={tokensData}
          shouldShowPaginationButtons
        />
      </div>
      <Footer />
    </div>
  );
}
