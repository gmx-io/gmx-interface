import { Trans, t } from "@lingui/macro";

import { getChainName } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { VersionNetworkSwitcherRow } from "pages/AccountDashboard/VersionNetworkSwitcherRow";

import PageTitle from "components/PageTitle/PageTitle";
import { TradeHistory } from "components/TradeHistory/TradeHistory";

import "./SyntheticsActions.scss";

const VERSION_NAME = "V2";

export default function SyntheticsActions() {
  const chainId = useSelector(selectChainId);
  const networkName = getChainName(chainId);

  return (
    <div className="default-container page-layout">
      <div className="Actions-section">
        <div className="Actions-title">
          <PageTitle
            isTop
            title={t`GMX V2 Actions`}
            subtitle={
              <>
                <Trans>
                  GMX {VERSION_NAME} {networkName} actions for all accounts.
                </Trans>
                <VersionNetworkSwitcherRow chainId={chainId} version={2} />
              </>
            }
          />
        </div>
        <TradeHistory account={undefined} forAllAccounts />
      </div>
    </div>
  );
}
