import "./Actions.scss";

import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import {
  useAccount,
  useIsOrdersLoading,
  useIsPositionsLoading,
  useSavedShowPnlAfterFees,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxAvailableTokensOptions } from "context/SyntheticsStateContext/hooks/tradeboxHooks";

export default function SyntheticsActions() {
  const savedShowPnlAfterFees = useSavedShowPnlAfterFees();
  const checkSummedAccount = useAccount();
  const isPositionsLoading = useIsPositionsLoading();
  const isOrdersLoading = useIsOrdersLoading();
  const availableTokensOptions = useTradeboxAvailableTokensOptions();

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
            isLoading={isPositionsLoading}
            onOrdersClick={() => null}
            onSelectPositionClick={() => null}
            onClosePositionClick={() => null}
            onEditCollateralClick={() => null}
            onSettlePositionFeesClick={() => null}
            showPnlAfterFees={savedShowPnlAfterFees}
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
            setSelectedOrdersKeys={() => null}
            isLoading={isOrdersLoading}
            setPendingTxns={() => null}
            hideActions
            availableTokensOptions={availableTokensOptions}
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
        <TradeHistory account={checkSummedAccount} forAllAccounts={!checkSummedAccount} shouldShowPaginationButtons />
      </div>
      <Footer />
    </div>
  );
}
