import cx from "classnames";
import type { Address } from "viem";

import { CONTRACTS_CHAIN_IDS, ContractsChainId, getChainName } from "config/chains";
import { getIcon } from "config/icons";

import Button from "components/Button/Button";

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
  return <Options account={account} version={version} chainId={chainId} />;
}

function Options({ account, chainId, version }: { account?: Address; chainId: number; version: number }) {
  return (
    <div className="flex flex-wrap items-center gap-8">
      {CONTRACTS_CHAIN_IDS.map((supportedChainId) => {
        const isActive = supportedChainId === chainId && version === 2;
        return (
          <Button
            variant="ghost"
            to={buildAccountDashboardUrl(account, supportedChainId, 2)}
            key={supportedChainId}
            className={cx("flex !min-h-32 items-center gap-4", {
              "!bg-button-secondary !text-typography-primary": isActive,
            })}
          >
            <img
              className="inline-block h-16"
              src={getIcon(supportedChainId, "network")}
              alt={getChainName(supportedChainId as ContractsChainId)}
            />
            {getChainName(supportedChainId as ContractsChainId)}
          </Button>
        );
      })}
    </div>
  );
}
