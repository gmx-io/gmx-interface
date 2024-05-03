import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useState } from "react";
import { HiDotsVertical } from "react-icons/hi";

import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import type { ModalProps } from "components/Modal/Modal";
import ModalWithPortal from "../Modal/ModalWithPortal";
import LanguageModalContent from "./LanguageModalContent";

import language24Icon from "img/ic_language24.svg";
import settingsIcon from "img/ic_settings_16.svg";

import "./NetworkDropdown.css";

const LANGUAGE_MODAL_KEY = "LANGUAGE";
const NETWORK_MODAL_KEY = "NETWORK";

export default function NetworkDropdown(props) {
  const currentLanguage = useLingui().i18n.locale;
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const handleLanguageModalClose = useCallback(() => {
    setActiveModal(null);
  }, []);

  function getModalContent(modalName) {
    switch (modalName) {
      case LANGUAGE_MODAL_KEY:
        return <LanguageModalContent currentLanguage={currentLanguage} onClose={handleLanguageModalClose} />;
      case NETWORK_MODAL_KEY:
        return (
          <NetworkModalContent
            setActiveModal={setActiveModal}
            networkOptions={props.networkOptions}
            selectorLabel={props.selectorLabel}
            openSettings={props.openSettings}
          />
        );
      default:
        return;
    }
  }

  function getModalProps(modalName: string | null): ModalProps {
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
            <NavIcons selectorLabel={props.selectorLabel} />
          </div>
        </div>
      ) : (
        <DesktopDropdown
          currentLanguage={currentLanguage}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          {...props}
        />
      )}
      <ModalWithPortal {...getModalProps(activeModal)}>{getModalContent(activeModal)}</ModalWithPortal>
    </>
  );
}
function NavIcons({ selectorLabel }) {
  const { chainId } = useChainId();
  const icon = getIcon(chainId, "network");

  return (
    <>
      <button className="transparent">
        <img className="network-dropdown-icon" src={icon} alt={selectorLabel} />
      </button>
      <div className="network-dropdown-seperator" />
      <button className="transparent">
        <HiDotsVertical color="white" size={20} />
      </button>
    </>
  );
}

function DesktopDropdown({ setActiveModal, selectorLabel, networkOptions, openSettings }) {
  return (
    <div className="App-header-network">
      <Menu>
        <Menu.Button as="div" className="network-dropdown">
          <NavIcons selectorLabel={selectorLabel} />
        </Menu.Button>
        <Menu.Items as="div" className="menu-items network-dropdown-items">
          <div className="dropdown-label">
            <Trans>Networks</Trans>
          </div>
          <div className="network-dropdown-list">
            <NetworkMenuItems networkOptions={networkOptions} selectorLabel={selectorLabel} />
          </div>
          <div className="network-dropdown-divider" />
          <Menu.Item>
            <div className="network-dropdown-menu-item menu-item" onClick={openSettings}>
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="network-dropdown-icon" src={settingsIcon} alt="" />
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

function NetworkMenuItems({ networkOptions, selectorLabel }) {
  const { active } = useWallet();
  return networkOptions.map((network) => {
    return (
      <Menu.Item key={network.value}>
        <div className="network-dropdown-menu-item menu-item" onClick={() => switchNetwork(network.value, active)}>
          <div className="menu-item-group">
            <div className="menu-item-icon">
              <img className="network-dropdown-icon" src={network.icon} alt={network.label} />
            </div>
            <span className="network-dropdown-item-label">{network.label}</span>
          </div>
          <div className="network-dropdown-menu-item-img">
            <div className={cx("active-dot", { [selectorLabel]: selectorLabel === network.label })} />
          </div>
        </div>
      </Menu.Item>
    );
  });
}

function NetworkModalContent({ networkOptions, selectorLabel, setActiveModal, openSettings }) {
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
              <div className={cx("active-dot", { [selectorLabel]: selectorLabel === network.label })} />
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
            <img className="network-option-img" src={settingsIcon} alt="" />
            <span className="network-option-img-label">
              <Trans>Settings</Trans>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
