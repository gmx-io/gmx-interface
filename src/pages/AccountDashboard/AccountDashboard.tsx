import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useRouteMatch } from "react-router-dom";

import { CHAIN_NAMES_MAP, SUPPORTED_CHAIN_IDS, getChainName } from "config/chains";
import { getIsV1Supported } from "config/features";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import AddressView from "components/AddressView/AddressView";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { DailyAndCumulativePnL } from "./DailyAndCumulativePnL";
import { GeneralPerformanceDetails } from "./GeneralPerformanceDetails";
import { HistoricalLists } from "./HistoricalLists";

export function AccountDashboard() {
  const { chainId } = useChainId();
  const { active } = useWallet();
  const account = useRouteMatch<{ account: string }>()?.params.account;

  const networkName = getChainName(chainId);

  return (
    <div className="default-container page-layout">
      {account && (
        <PageTitle
          title={t`GMX V2 Account`}
          subtitle={
            <>
              <div className="flex flex-wrap items-center gap-4">
                <Trans>GMX V2 {networkName} information for account:</Trans>
                <AddressView address={account} size={20} breakpoint="XL" />
              </div>
              <div className="flex cursor-pointer flex-wrap items-center gap-12">
                <Trans>Switch to:</Trans>
                {SUPPORTED_CHAIN_IDS.map((supportedChainId) => (
                  <div
                    key={supportedChainId}
                    className={cx("flex items-center gap-4", {
                      "text-white": supportedChainId === chainId,
                    })}
                    onClick={() => switchNetwork(supportedChainId, active)}
                  >
                    V2
                    <img
                      className="inline-block h-16"
                      src={getIcon(supportedChainId, "network")}
                      alt={CHAIN_NAMES_MAP[supportedChainId]}
                    />
                  </div>
                ))}
                {SUPPORTED_CHAIN_IDS.filter(getIsV1Supported).map((supportedChainId) => (
                  <div
                    key={supportedChainId}
                    className={cx("flex items-center gap-4", {
                      "text-white": supportedChainId === chainId,
                    })}
                    onClick={() => switchNetwork(supportedChainId, active)}
                  >
                    V1
                    <img
                      className="inline-block h-16"
                      src={getIcon(supportedChainId, "network")}
                      alt={CHAIN_NAMES_MAP[supportedChainId]}
                    />
                  </div>
                ))}
              </div>
            </>
          }
        />
      )}

      <div className="flex flex-col gap-20">
        <div className="flex flex-row flex-wrap gap-20 ">
          <div className="max-w-full grow-[2]">
            <GeneralPerformanceDetails />
          </div>
          <div className="grow *:size-full">
            <DailyAndCumulativePnL />
          </div>
        </div>
        <HistoricalLists account={account} />
      </div>

      <Footer />
    </div>
  );
}
