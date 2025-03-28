import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useState } from "react";
import { HiDotsVertical } from "react-icons/hi";

import { getChainIcon } from "config/icons";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import type { ModalProps } from "components/Modal/Modal";
import ModalWithPortal from "../Modal/ModalWithPortal";
import LanguageModalContent from "./LanguageModalContent";

import language24Icon from "img/ic_language24.svg";
import SettingsIcon16 from "img/ic_settings_16.svg?react";
import SettingsIcon24 from "img/ic_settings_24.svg?react";

import type { NetworkOption } from "components/Header/AppHeaderChainAndSettings";
import { getChainName } from "config/chains";

import "./NetworkDropdown.css";

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
      {props.small ? (
        <div className="App-header-network" onClick={() => setActiveModal(NETWORK_MODAL_KEY)}>
          <div className="network-dropdown">
            <ChainIcon chainId={props.chainId} />
          </div>
        </div>
      ) : (
        <DesktopDropdown
          // currentLanguage={currentLanguage}
          // activeModal={activeModal}
          // setActiveModal={setActiveModal}
          // {...props}

          chainId={props.chainId}
          networkOptions={props.networkOptions}
          openSettings={props.openSettings}
          setActiveModal={setActiveModal}
        />
      )}
      <ModalWithPortal {...getModalProps(activeModal)}>{getModalContent(activeModal)}</ModalWithPortal>
    </>
  );
}

function ChainIcon({ chainId }: { chainId: number }) {
  // const { chainId } = useChainId();
  // const icon = getIcon(chainId, "network");
  const icon = getChainIcon(chainId);
  const chainName = getChainName(chainId);

  return (
    <>
      <button className="transparent">
        <img className="network-dropdown-icon" src={icon} alt={chainName} />
      </button>
      <div className="network-dropdown-seperator" />
      <button className="transparent">
        <HiDotsVertical color="white" size={20} />
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
        <Menu.Button as="div" className="network-dropdown" data-qa="networks-dropdown-handle">
          <ChainIcon chainId={chainId} />
        </Menu.Button>
        <Menu.Items as="div" className="menu-items network-dropdown-items" data-qa="networks-dropdown">
          <div className="dropdown-label">
            <Trans>Networks</Trans>
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
  const { active } = useWallet();
  return networkOptions.map((network) => {
    return (
      <Menu.Item key={network.value}>
        <div
          className="network-dropdown-menu-item menu-item"
          data-qa={`networks-dropdown-${network.label}`}
          onClick={() => switchNetwork(network.value, active)}
        >
          <div className="menu-item-group">
            <div className="menu-item-icon">
              <img className="network-dropdown-icon" src={network.icon} alt={network.label} />
            </div>
            <span className="network-dropdown-item-label">{network.label}</span>
          </div>
          <div className="network-dropdown-menu-item-img">
            <div
              className={cx("active-dot")}
              style={{ backgroundColor: network.value === chainId ? network.color : undefined }}
            />
          </div>
        </div>
      </Menu.Item>
    );
  });
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
  const { active } = useWallet();
  return (
    <div className="network-dropdown-items">
      <div className="network-dropdown-list">
        <span className="network-dropdown-label">
          <Trans>Networks</Trans>
        </span>

        {networkOptions.map((network) => {
          return (
            <div className="network-option" onClick={() => switchNetwork(network.value, active)} key={network.value}>
              <div className="menu-item-group">
                <img src={network.icon} alt={network.label} />
                <span>{network.label}</span>
              </div>
              {/* <div className={cx("active-dot", { [selectedLabel]: selectedLabel === network.label })} /> */}
              <div
                className={cx("active-dot")}
                style={{ backgroundColor: network.value === chainId ? network.color : undefined }}
              />
            </div>
          );
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
