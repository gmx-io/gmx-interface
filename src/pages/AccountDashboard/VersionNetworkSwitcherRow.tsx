import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Link } from "react-router-dom";
import { type Address } from "viem";

import { CHAIN_NAMES_MAP, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getIsV1Supported } from "config/features";
import { getIcon } from "config/icons";

import { buildAccountDashboardUrl } from "./buildAccountDashboardUrl";

export function VersionNetworkSwitcherRow({
  account,
  chainId,
  version,
}: {
  account?: Address;
  chainId: number;
  version: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-12">
      <Trans>Switch to:</Trans>
      <Options account={account} version={version} chainId={chainId} />
    </div>
  );
}

function Options({ account, chainId, version }: { account?: Address; chainId: number; version: number }) {
  return (
    <div className="flex flex-wrap items-center gap-12 *:cursor-pointer">
      {SUPPORTED_CHAIN_IDS.map((supportedChainId) => (
        <Link
          to={buildAccountDashboardUrl(account, supportedChainId, 2)}
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
          to={buildAccountDashboardUrl(account, supportedChainId, 1)}
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
