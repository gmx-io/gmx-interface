import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import partition from "lodash/partition";
import { useAccount } from "wagmi";

import { getChainIcon } from "config/icons";
import { isSettlementChain, isSourceChain } from "config/multichain";
import type { NetworkOption } from "config/networkOptions";
import { switchNetwork } from "lib/wallets";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { getChainName } from "sdk/configs/chains";

import Button from "components/Button/Button";
import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import SolanaNetworkItem from "./SolanaNetworkItem";

import "./NetworkDropdown.scss";

function NavIcons({ chainId, open }) {
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

function NetworkMenuItems({ networkOptions, chainId }: { networkOptions: NetworkOption[]; chainId: number }) {
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();

  const [disabledNetworks, enabledNetworks] = partition(
    networkOptions,
    (network) => isSourceChain(network.value) && isNonEoaAccountOnAnyChain
  );

  const walletAndGmxAccountNetworks = enabledNetworks.filter(
    (network) => isSourceChain(network.value) || isSettlementChain(network.value)
  );
  const walletOnlyNetworks = enabledNetworks.filter(
    (network) => !isSourceChain(network.value) && !isSettlementChain(network.value)
  );

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
                  These networks share liquidity with Arbitrum and allow trading through a GMX Account. On Arbitrum,
                  trading is also available directly from the wallet.
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
              content={<Trans>These networks support only trading directly from wallet.</Trans>}
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
      {disabledNetworks.map((network) => (
        <NetworkMenuItem key={network.value} network={network} chainId={chainId} disabled />
      ))}
    </>
  );
}

function NetworkMenuItem({
  network,
  chainId,
  disabled,
}: {
  network: NetworkOption;
  chainId: number;
  disabled?: boolean;
}) {
  const { isConnected } = useAccount();
  const Wrapper = disabled ? TooltipWithPortal : NoopWrapper;
  const isArbitrum = isSettlementChain(network.value);

  return (
    <Menu.Item key={network.value} disabled={disabled}>
      {({ close }) => (
        <Wrapper variant="none" as="div" content={<Trans>Smart wallets are not supported on this network.</Trans>}>
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
              switchNetwork(network.value, isConnected);
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
              {isArbitrum && (
                <TooltipWithPortal
                  handle={<WalletIcon className="size-16 text-typography-secondary" />}
                  position="top"
                  variant="none"
                  className="flex"
                  content={<Trans>Trade directly from wallet or use GMX Account.</Trans>}
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
