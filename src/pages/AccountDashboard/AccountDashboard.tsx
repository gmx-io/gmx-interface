import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { invert } from "lodash";
import { useEffect } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import type { Address } from "viem";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, CHAIN_NAMES_MAP, SUPPORTED_CHAIN_IDS, getChainName } from "config/chains";
import { getIsV1Supported } from "config/features";
import { getIcon } from "config/icons";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useChainId } from "lib/chains";
import useSearchParams from "lib/useSearchParams";

import AddressView from "components/AddressView/AddressView";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { DailyAndCumulativePnL } from "./DailyAndCumulativePnL";
import { GeneralPerformanceDetails } from "./GeneralPerformanceDetails";
import { HistoricalLists, HistoricalListsV1 } from "./HistoricalLists";

export function AccountDashboard() {
  const { chainId: initialChainId } = useChainId();

  const { chainId, version, account } = usePageParams(initialChainId);

  const networkName = getChainName(chainId);
  const versionName = version === 2 ? "V2" : "V1";

  if (!ethers.isAddress(account)) {
    return (
      <div className="default-container page-layout">
        <PageTitle title={t`GMX V2 Account`} />
        <div className="text-center text-red-500">
          <Trans>Invalid address. Please make sure you have entered a valid Ethereum address</Trans>
        </div>
      </div>
    );
  }

  return (
    <div className="default-container page-layout">
      <PageTitle
        chainId={chainId}
        title={t`GMX ${versionName} Account`}
        subtitle={
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Trans>
                GMX {versionName} {networkName} information for account:
              </Trans>
              <AddressView address={account} size={20} breakpoint="XL" />
            </div>
            <div className="flex flex-wrap items-center gap-12">
              <Trans>Switch to:</Trans>
              <VersionNetworkSwitcher account={account} version={version} chainId={chainId} />
            </div>
          </>
        }
      />

      {version === 2 && (
        <SyntheticsStateContextProvider overrideChainId={chainId} pageType="actions" skipLocalReferralCode={false}>
          <div className="flex flex-col gap-20">
            <div className="flex flex-row flex-wrap gap-20">
              <div className="max-w-full grow-[2] *:size-full">
                <GeneralPerformanceDetails chainId={chainId} account={account} />
              </div>
              <div className="grow *:size-full">
                <DailyAndCumulativePnL chainId={chainId} account={account} />
              </div>
            </div>
            <HistoricalLists chainId={chainId} account={account} />
          </div>
        </SyntheticsStateContextProvider>
      )}

      {version === 1 && <HistoricalListsV1 account={account} chainId={chainId} />}

      <Footer />
    </div>
  );
}

const NETWORK_QUERY_PARAM = "network";
const VERSION_QUERY_PARAM = "v";

function buildUrl(account: Address, chainId: number, version: number) {
  return `/actions/${account}?${VERSION_QUERY_PARAM}=${version}&${NETWORK_QUERY_PARAM}=${NETWORK_ID_SLUGS_MAP[chainId]}`;
}

const NETWORK_SLUGS_ID_MAP = {
  arbitrum: ARBITRUM,
  avalanche: AVALANCHE,
  avalanche_fuji: AVALANCHE_FUJI,
};

const NETWORK_ID_SLUGS_MAP = invert(NETWORK_SLUGS_ID_MAP);

function usePageParams(initialChainId: number) {
  const history = useHistory();

  const params = useParams<{ account: Address }>();
  const queryParams = useSearchParams<{ network?: string; v?: string }>();
  const account = params.account;
  const chainIdFromParams = NETWORK_SLUGS_ID_MAP[queryParams.network || ""] as number | undefined;
  const chainId = chainIdFromParams ?? initialChainId;
  const version = parseInt(queryParams.v ?? "2");

  useEffect(() => {
    let patch = undefined as any;
    if (!chainIdFromParams || !SUPPORTED_CHAIN_IDS.includes(chainIdFromParams)) {
      patch = { chainId: initialChainId };
    }

    if (version !== 1 && version !== 2) {
      patch = { ...patch, version: 2 };
    }

    if (patch) {
      history.replace(buildUrl(account, patch.chainId ?? chainId, patch.version ?? version));
    }
  }, [account, chainId, chainIdFromParams, history, initialChainId, version]);

  return { chainId, version, account };
}

function VersionNetworkSwitcher({ account, chainId, version }: { account: Address; chainId: number; version: number }) {
  return (
    <div className="flex flex-wrap items-center gap-12 *:cursor-pointer">
      {SUPPORTED_CHAIN_IDS.map((supportedChainId) => (
        <Link
          to={buildUrl(account, supportedChainId, 2)}
          key={supportedChainId}
          className={cx("flex items-center gap-4", {
            "text-white": supportedChainId === chainId && version === 2,
            "text-gray-300": supportedChainId !== chainId || version !== 2,
          })}
        >
          V2
          <img
            className="inline-block h-16"
            src={getIcon(supportedChainId, "network")}
            alt={CHAIN_NAMES_MAP[supportedChainId]}
          />
        </Link>
      ))}
      {SUPPORTED_CHAIN_IDS.filter(getIsV1Supported).map((supportedChainId) => (
        <Link
          to={buildUrl(account, supportedChainId, 1)}
          key={supportedChainId}
          className={cx("flex items-center gap-4", {
            "text-white": supportedChainId === chainId && version === 1,
            "text-gray-300": supportedChainId !== chainId || version !== 1,
          })}
        >
          V1
          <img
            className="inline-block h-16"
            src={getIcon(supportedChainId, "network")}
            alt={CHAIN_NAMES_MAP[supportedChainId]}
          />
        </Link>
      ))}
    </div>
  );
}
