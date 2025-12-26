import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import partition from "lodash/partition";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { ARBITRUM } from "config/chains";
import { getChainIcon } from "config/icons";
import { isSourceChain } from "config/multichain";
import type { NetworkOption } from "config/networkOptions";
import { switchNetwork } from "lib/wallets";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import { getChainName } from "sdk/configs/chains";

import Button from "components/Button/Button";
import type { ModalProps } from "components/Modal/Modal";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { NoopWrapper } from "components/NoopWrapper/NoopWrapper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import InfoIcon from "img/ic_info.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import SolanaNetworkItem from "./SolanaNetworkItem";

import "./NetworkDropdown.scss";

const NETWORK_MODAL_KEY = "NETWORK";

export default function NetworkDropdown(props: { chainId: number; networkOptions: NetworkOption[] }) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  function getModalContent(modalName) {
    switch (modalName) {
      case NETWORK_MODAL_KEY:
        return <NetworkModalContent networkOptions={props.networkOptions} chainId={props.chainId} />;
      default:
        return;
    }
  }

  function getModalProps(modalName: string | null): ModalProps {
    switch (modalName) {
      case NETWORK_MODAL_KEY:
        return {
          className: "network-popup",
          isVisible: activeModal === NETWORK_MODAL_KEY,
          setIsVisible: () => setActiveModal(null),
          label: t`Networks and Settings`,
        };
      default:
        return {
          setIsVisible: noop,
        };
    }
  }

  return (
    <>
      <DesktopDropdown {...props} />
      <ModalWithPortal {...getModalProps(activeModal)}>{getModalContent(activeModal)}</ModalWithPortal>
    </>
  );
}
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

function DesktopDropdown({ chainId, networkOptions }: { chainId: number; networkOptions: NetworkOption[] }) {
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
            <Menu.Items
              as="div"
              className="menu-items network-dropdown-items rounded-8 border-1/2 border-slate-600 bg-slate-900/90 shadow-[0px_12px_40px_-4px] shadow-slate-950 backdrop-blur-[50px]"
              data-qa="networks-dropdown"
            >
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
    (network) => isSourceChain(network.value) || network.value === ARBITRUM
  );
  const walletOnlyNetworks = enabledNetworks.filter(
    (network) => !isSourceChain(network.value) && network.value !== ARBITRUM
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
              handle={<InfoIcon className="size-12 text-typography-secondary" />}
              position="top"
              variant="none"
              className="flex"
              renderContent={() => (
                <Trans>
                  These networks share liquidity with Arbitrum and allow trading through a GMX Account. On Arbitrum,
                  trading is also available directly from the wallet.
                </Trans>
              )}
            />
          </div>
          {walletAndGmxAccountNetworks.map((network) => (
            <NetworkMenuItem key={network.value} network={network} chainId={chainId} disabled={false} />
          ))}
        </>
      )}
      {walletOnlyNetworks.length > 0 && (
        <>
          <div className="flex items-center gap-4 px-12 pb-4 pt-8">
            <span className="text-13 font-medium text-typography-secondary">
              <Trans>Wallet-only</Trans>
            </span>
            <TooltipWithPortal
              handle={<InfoIcon className="size-12 text-typography-secondary" />}
              position="top"
              variant="none"
              className="flex"
              renderContent={() => <Trans>These networks support only trading directly from wallet.</Trans>}
            />
          </div>
          {walletOnlyNetworks.map((network) => (
            <NetworkMenuItem key={network.value} network={network} chainId={chainId} disabled={false} />
          ))}
        </>
      )}
      <Menu.Item key="solana">
        <SolanaNetworkItem />
      </Menu.Item>
      {disabledNetworks.map((network) => (
        <NetworkMenuItem key={network.value} network={network} chainId={chainId} disabled={true} />
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
  const isArbitrum = network.value === ARBITRUM;

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
                  renderContent={() => <Trans>Trade directly from wallet or use GMX Account.</Trans>}
                />
              )}
            </div>
            {chainId === network.value && (
              <div className="size-[5px] rounded-full bg-[#56dba8] shadow-[0_0_0_2.5px_rgba(86,219,168,0.2)]" />
            )}
          </div>
        </Wrapper>
      )}
    </Menu.Item>
  );
}

function NetworkModalContent({ networkOptions, chainId }: { networkOptions: NetworkOption[]; chainId: number }) {
  return (
    <div className="network-dropdown-items">
      <div className="network-dropdown-list">
        <span className="network-dropdown-label">
          <Trans>Networks</Trans>
        </span>

        {networkOptions.map((network) => {
          return <NetworkModalOption key={network.value} network={network} chainId={chainId} />;
        })}
        <span className="network-dropdown-label more-options">
          <Trans>More Options</Trans>
        </span>
        <SolanaNetworkItem />
      </div>
    </div>
  );
}

function NetworkModalOption({ network, chainId }: { network: NetworkOption; chainId: number }) {
  const { isConnected } = useAccount();

  const dotStyle = useMemo(() => {
    return { backgroundColor: network.value === chainId ? network.color : undefined };
  }, [chainId, network.color, network.value]);

  return (
    <div className="network-option" onClick={() => switchNetwork(network.value, isConnected)} key={network.value}>
      <div className="menu-item-group">
        <img src={network.icon} alt={network.label} />
        <span>{network.label}</span>
      </div>
      <div className={cx("active-dot")} style={dotStyle} />
    </div>
  );
}
