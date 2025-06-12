import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { useTradePageVersion } from "lib/useTradePageVersion";
import { switchNetwork } from "lib/wallets";

import type { NetworkOption } from "components/Header/AppHeaderChainAndSettings";
import type { ModalProps } from "components/Modal/Modal";
import { VersionSwitch } from "components/VersionSwitch/VersionSwitch";

import language24Icon from "img/ic_language24.svg";
import SettingsIcon16 from "img/ic_settings_16.svg?react";
import SettingsIcon24 from "img/ic_settings_24.svg?react";

import LanguageModalContent from "./LanguageModalContent";
import ModalWithPortal from "../Modal/ModalWithPortal";

import "./NetworkDropdown.scss";

const LANGUAGE_MODAL_KEY = "LANGUAGE";
const NETWORK_MODAL_KEY = "NETWORK";

type ModalKey = typeof LANGUAGE_MODAL_KEY | typeof NETWORK_MODAL_KEY;

export default function NetworkDropdown(props: {
  chainId: number;
  networkOptions: NetworkOption[];
  openSettings: () => void;
  small?: boolean;
}) {
  const currentLanguage = useLingui().i18n.locale;
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

  const handleLanguageModalClose = useCallback(() => {
    setActiveModal(null);
  }, []);

  function getModalContent(modalName: ModalKey | null) {
    switch (modalName) {
      case LANGUAGE_MODAL_KEY:
        return <LanguageModalContent currentLanguage={currentLanguage} onClose={handleLanguageModalClose} />;
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

  function getModalProps(modalName: ModalKey | null): ModalProps {
    switch (modalName) {
      case LANGUAGE_MODAL_KEY:
        return {
          className: "language-popup",
          isVisible: activeModal === LANGUAGE_MODAL_KEY,
          setIsVisible: () => setActiveModal(null),
          label: t`Select Language`,
        };
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
      <DesktopDropdown
        chainId={props.chainId}
        networkOptions={props.networkOptions}
        openSettings={props.openSettings}
        setActiveModal={setActiveModal}
      />
      <ModalWithPortal {...getModalProps(activeModal)}>{getModalContent(activeModal)}</ModalWithPortal>
    </>
  );
}

function ChainIcon({ chainId }: { chainId: number }) {
  const [currentVersion] = useTradePageVersion();
  const icon = getChainIcon(chainId);
  const chainName = getChainName(chainId);

  return (
    <>
      <span className="text-body-small mr-7 inline-block h-fit rounded-4 bg-cold-blue-500 p-4">V{currentVersion}</span>
      <button className="mr-4 shrink-0">
        <img className="network-dropdown-icon" src={icon} alt={chainName} />
      </button>
      <button>
        <BiChevronDown color="white" size={20} />
      </button>
    </>
  );
}

function DesktopDropdown({
  setActiveModal,
  chainId,
  networkOptions,
  openSettings,
}: {
  setActiveModal: (modal: ModalKey | null) => void;
  chainId: number;
  networkOptions: NetworkOption[];
  openSettings: () => void;
}) {
  return (
    <div className="App-header-network">
      <Menu>
        <Menu.Button as="div" className="network-dropdown px-6 py-5" data-qa="networks-dropdown-handle">
          <ChainIcon chainId={chainId} />
        </Menu.Button>
        <Menu.Items as="div" className="menu-items network-dropdown-items" data-qa="networks-dropdown">
          <div className="dropdown-label">
            <Trans>Version and Network</Trans>
          </div>
          <div className="px-8 pb-8">
            <VersionSwitch />
          </div>
          <div className="network-dropdown-list">
            <NetworkMenuItems networkOptions={networkOptions} chainId={chainId} />
          </div>
          <div className="network-dropdown-divider" />
          <Menu.Item>
            <div
              className="network-dropdown-menu-item menu-item"
              onClick={openSettings}
              data-qa="networks-dropdown-settings"
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <SettingsIcon16 className="network-dropdown-icon text-slate-100" />
                </div>
                <span className="network-dropdown-item-label">
                  <Trans>Settings</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div
              className="network-dropdown-menu-item menu-item last-dropdown-menu"
              onClick={() => setActiveModal(LANGUAGE_MODAL_KEY)}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="network-dropdown-icon" src={language24Icon} alt="" />
                </div>
                <span className="network-dropdown-item-label">
                  <Trans>Language</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}

function NetworkMenuItems({ networkOptions, chainId }: { networkOptions: NetworkOption[]; chainId: number }) {
  return networkOptions.map((network) => {
    return <NetworkMenuItem key={network.value} chainId={chainId} network={network} />;
  });
}

function NetworkMenuItem({ network, chainId }: { network: NetworkOption; chainId: number }) {
  const { isConnected } = useAccount();

  const dotStyle = useMemo(() => {
    return { backgroundColor: network.value === chainId ? network.color : undefined };
  }, [chainId, network.color, network.value]);

  return (
    <Menu.Item>
      <div
        className="network-dropdown-menu-item menu-item"
        data-qa={`networks-dropdown-${network.label}`}
        onClick={() => switchNetwork(network.value, isConnected)}
      >
        <div className="menu-item-group">
          <div className="menu-item-icon">
            <img className="network-dropdown-icon" src={network.icon} alt={network.label} />
          </div>
          <span className="network-dropdown-item-label">{network.label}</span>
        </div>
        <div className="network-dropdown-menu-item-img">
          <div className="active-dot" style={dotStyle} />
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
  setActiveModal: (modal: ModalKey | null) => void;
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
        <div
          className="network-option"
          onClick={() => {
            setActiveModal(LANGUAGE_MODAL_KEY);
          }}
        >
          <div className="menu-item-group">
            <img className="network-option-img" src={language24Icon} alt="Select Language" />
            <span className="network-option-img-label">Language</span>
          </div>
        </div>
        <div
          className="network-option"
          onClick={() => {
            openSettings();
            setActiveModal(null);
          }}
        >
          <div className="menu-item-group">
            <SettingsIcon24 className="mr-16 text-slate-100" />
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
