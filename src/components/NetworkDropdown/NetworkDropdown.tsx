import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import partition from "lodash/partition";
import { useMemo, type ReactNode } from "react";
import { useAccount } from "wagmi";

import { getChainIcon } from "config/icons";
import { isValidVisualSettlementChain, isValidVisualSourceChain } from "config/multichain";
import type { NetworkOption } from "config/networkOptions";
import { extendError } from "lib/errors";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";
import { useWalletCanSignTypedData, useWalletUnavailableChains } from "lib/wallets/useWalletSessionChains";
import { getChainName, isContractsChain } from "sdk/configs/chains";

import Button from "components/Button/Button";
import { getSmartWalletChainUnavailableToastContent } from "components/Errors/errorToasts";
import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import SolanaNetworkItem from "./SolanaNetworkItem";

import "./NetworkDropdown.scss";

function NavIcons({ chainId, open }: { chainId: number; open: boolean }) {
  const icon = getChainIcon(chainId);
  const chainName = getChainName(chainId);

  return (
    <>
      <img className="size-20" src={icon} alt={chainName} />

      <ChevronDownIcon className={cx("size-16", { "rotate-180": open })} />
    </>
  );
}

export default function NetworkDropdown({
  chainId,
  networkOptions,
}: {
  chainId: number;
  networkOptions: NetworkOption[];
}) {
  return (
    <div className="relative flex items-center gap-8">
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button as="div" data-qa="networks-dropdown-handle">
              <Button
                variant="secondary"
                size="controlled"
                className="flex h-40 items-center gap-8 px-15 pr-12 max-md:h-32 max-md:p-6"
              >
                <NavIcons chainId={chainId} open={open} />
              </Button>
            </Menu.Button>
            <Menu.Items as="div" className="network-dropdown-items" data-qa="networks-dropdown">
              <div className="network-dropdown-list">
                <NetworkMenuItems networkOptions={networkOptions} chainId={chainId} />
              </div>
            </Menu.Items>
          </>
        )}
      </Menu>
    </div>
  );
}

type DisplayNetworkOption = NetworkOption & { disabledReason?: ReactNode };

function getNetworkDisabledReason({
  network,
  unavailableChains,
  canSignTypedData,
}: {
  network: NetworkOption;
  unavailableChains: number[] | undefined;
  canSignTypedData: boolean;
}): ReactNode {
  if (unavailableChains?.includes(network.value)) {
    return <Trans>Your wallet is not connected to this network</Trans>;
  }

  // Source-only chains trade through the GMX Account, which is express-only and always needs a signature.
  if (!canSignTypedData && !isContractsChain(network.value, true)) {
    return <Trans>Your wallet cannot sign messages, which trading from this network requires</Trans>;
  }

  return undefined;
}

function NetworkMenuItems({ networkOptions, chainId }: { networkOptions: NetworkOption[]; chainId: number }) {
  const { unavailableChains } = useWalletUnavailableChains(networkOptions.map((network) => network.value));
  const canSignTypedData = useWalletCanSignTypedData();

  const { walletAndGmxAccountNetworks, walletOnlyNetworks } = useMemo(() => {
    const displayNetworks: DisplayNetworkOption[] = networkOptions.map((network) => ({
      ...network,
      disabledReason: getNetworkDisabledReason({ network, unavailableChains, canSignTypedData }),
    }));

    // Disabled networks keep their group so a fully unavailable group still shows its heading.
    const orderDisabledLast = (networks: DisplayNetworkOption[]) =>
      partition(networks, (network) => !network.disabledReason).flat();

    const isWalletAndGmxAccountNetwork = (network: DisplayNetworkOption) =>
      isValidVisualSourceChain(network.value) || isValidVisualSettlementChain(network.value);

    return {
      walletAndGmxAccountNetworks: orderDisabledLast(displayNetworks.filter(isWalletAndGmxAccountNetwork)),
      walletOnlyNetworks: orderDisabledLast(
        displayNetworks.filter((network) => !isWalletAndGmxAccountNetwork(network))
      ),
    };
  }, [networkOptions, unavailableChains, canSignTypedData]);

  return (
    <>
      {walletAndGmxAccountNetworks.length > 0 && (
        <>
          <div className="flex items-center gap-4 px-12 pb-4 pt-8">
            <span className="text-13 font-medium text-typography-secondary">
              <Trans>Wallet & GMX Account</Trans>
            </span>
            <TooltipWithPortal
              handle={<InfoIconStroke className="size-15 text-typography-secondary" />}
              position="top"
              variant="none"
              className="flex"
              content={
                <Trans>
                  Trade via GMX Account using Arbitrum liquidity. Wallet trading also available on Arbitrum.
                </Trans>
              }
            />
          </div>
          {walletAndGmxAccountNetworks.map((network) => (
            <NetworkMenuItem key={network.value} network={network} chainId={chainId} />
          ))}
        </>
      )}
      {walletOnlyNetworks.length > 0 && (
        <>
          {walletAndGmxAccountNetworks.length > 0 && <div className="network-dropdown-divider" />}
          <div className="flex items-center gap-4 px-12 pb-4 pt-8">
            <span className="text-13 font-medium text-typography-secondary">
              <Trans>Wallet-only</Trans>
            </span>
            <TooltipWithPortal
              handle={<InfoIconStroke className="size-15 text-typography-secondary" />}
              position="top"
              variant="none"
              className="flex"
              content={<Trans>Wallet trading only on these networks</Trans>}
            />
          </div>
          {walletOnlyNetworks.map((network) => (
            <NetworkMenuItem key={network.value} network={network} chainId={chainId} />
          ))}
        </>
      )}
      <Menu.Item key="solana">
        <SolanaNetworkItem />
      </Menu.Item>
    </>
  );
}

function NetworkMenuItem({ network, chainId }: { network: DisplayNetworkOption; chainId: number }) {
  const { isConnected } = useAccount();
  const disabled = Boolean(network.disabledReason);
  const Wrapper = disabled ? TooltipWithPortal : NoopWrapper;

  return (
    <Menu.Item key={network.value} disabled={disabled}>
      {({ close }) => (
        <Wrapper variant="none" as="div" content={network.disabledReason}>
          <div
            className={cx("network-dropdown-menu-item menu-item", {
              "disabled !cursor-not-allowed opacity-50": disabled,
            })}
            data-qa={`networks-dropdown-${network.label}`}
            onClick={() => {
              if (disabled) {
                return;
              }
              close();
              switchNetwork(network.value, isConnected, { fallbackToAppSelectionOnError: true }).catch((error) => {
                if (error?.message === SMART_WALLET_CHAIN_UNAVAILABLE_ERROR) {
                  helperToast.error(getSmartWalletChainUnavailableToastContent(network.value));
                }

                metrics.pushError(
                  extendError(error, { data: { chainId: network.value } }),
                  "networkDropdown.switchNetwork"
                );
              });
            }}
          >
            <div className="menu-item-group">
              <div className="menu-item-icon">
                <img className="network-dropdown-icon" src={network.icon} alt={network.label} />
              </div>
              <span
                className={cx(
                  "network-dropdown-item-label",
                  chainId === network.value ? "text-typography-primary" : "text-typography-secondary"
                )}
              >
                {network.label}
              </span>
              {isValidVisualSettlementChain(network.value) && chainId === network.value && (
                <TooltipWithPortal
                  handle={<WalletIcon className="size-16 text-typography-secondary" />}
                  position="top"
                  variant="none"
                  className="flex"
                  content={<Trans>Trade from wallet or GMX Account</Trans>}
                />
              )}
            </div>
            {chainId === network.value && (
              <div className="mr-[2.5px] size-[5px] rounded-full bg-green-300 shadow-[0_0_0_2.5px_rgb(var(--color-green-300-raw)/0.2)]" />
            )}
          </div>
        </Wrapper>
      )}
    </Menu.Item>
  );
}
