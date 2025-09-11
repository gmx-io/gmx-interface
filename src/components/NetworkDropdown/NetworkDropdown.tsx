import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useAccount } from "wagmi";

import { getChainIcon } from "config/icons";
import { switchNetwork } from "lib/wallets";
import { getChainName } from "sdk/configs/chains";

import Button from "components/Button/Button";
import type { NetworkOption } from "components/Header/AppHeaderChainAndSettings";
import type { ModalProps } from "components/Modal/Modal";

import SettingsIcon from "img/ic_settings.svg?react";

import SolanaNetworkItem from "./SolanaNetworkItem";
import ModalWithPortal from "../Modal/ModalWithPortal";

import "./NetworkDropdown.scss";

const NETWORK_MODAL_KEY = "NETWORK";

export default function NetworkDropdown(props: {
  chainId: number;
  networkOptions: NetworkOption[];
  openSettings: () => void;
}) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  function getModalContent(modalName) {
    switch (modalName) {
      case NETWORK_MODAL_KEY:
        return (
          <NetworkModalContent
            setActiveModal={setActiveModal}
            networkOptions={props.networkOptions}
            chainId={props.chainId}
            openSettings={props.openSettings}
          />
        );
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

      <FiChevronDown size={20} className={cx({ "rotate-180": open })} />
    </>
  );
}

function DesktopDropdown({
  chainId,
  networkOptions,
  openSettings,
}: {
  chainId: number;
  networkOptions: NetworkOption[];
  openSettings: () => void;
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
            <Menu.Items
              as="div"
              className="menu-items network-dropdown-items rounded-8 border-1/2 border-slate-600"
              data-qa="networks-dropdown"
            >
              <div className="p-12 pb-8 text-13 font-medium text-typography-secondary">
                <Trans>Network</Trans>
              </div>
              <div className="network-dropdown-list">
                <NetworkMenuItems networkOptions={networkOptions} chainId={chainId} />
              </div>
              <div className="network-dropdown-divider mb-6 pt-6" />
              <Menu.Item>
                <div
                  className="network-dropdown-menu-item menu-item last-dropdown-menu"
                  onClick={openSettings}
                  data-qa="networks-dropdown-settings"
                >
                  <div className="menu-item-group">
                    <div className="menu-item-icon">
                      <SettingsIcon className="network-dropdown-icon" />
                    </div>
                    <span className="network-dropdown-item-label">
                      <Trans>Settings</Trans>
                    </span>
                  </div>
                </div>
              </Menu.Item>
            </Menu.Items>
          </>
        )}
      </Menu>
    </div>
  );
}

function NetworkMenuItems({ networkOptions, chainId }: { networkOptions: NetworkOption[]; chainId: number }) {
  return networkOptions
    .map((network) => {
      return <NetworkMenuItem key={network.value} chainId={chainId} network={network} />;
    })
    .concat(
      <Menu.Item key="solana">
        <SolanaNetworkItem />
      </Menu.Item>
    );
}

function NetworkMenuItem({ network, chainId }: { network: NetworkOption; chainId: number }) {
  const { isConnected } = useAccount();

  return (
    <Menu.Item key={network.value}>
      <div
        className="network-dropdown-menu-item menu-item"
        data-qa={`networks-dropdown-${network.label}`}
        onClick={() => switchNetwork(network.value, isConnected)}
      >
        <div className="menu-item-group">
          <div className="menu-item-icon">
            <img className="network-dropdown-icon" src={network.icon} alt={network.label} />
          </div>
          <span
            className={cx("network-dropdown-item-label", {
              "text-typography-primary": chainId === network.value,
            })}
          >
            {network.label}
          </span>
        </div>
        <div className="network-dropdown-menu-item-img">
          {chainId === network.value && (
            <div className={"h-8 w-8 rounded-full border-[2.5px] border-green-600 bg-green-500"} />
          )}
        </div>
      </div>
    </Menu.Item>
  );
}

function NetworkModalContent({
  networkOptions,
  chainId,
  setActiveModal,
  openSettings,
}: {
  networkOptions: NetworkOption[];
  chainId: number;
  setActiveModal: (modal: string | null) => void;
  openSettings: () => void;
}) {
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
        <div
          className="network-option"
          onClick={() => {
            openSettings();
            setActiveModal(null);
          }}
        >
          <div className="menu-item-group">
            <SettingsIcon className="mr-16 text-typography-secondary" />
            <span className="network-option-img-label">
              <Trans>Settings</Trans>
            </span>
          </div>
        </div>
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
