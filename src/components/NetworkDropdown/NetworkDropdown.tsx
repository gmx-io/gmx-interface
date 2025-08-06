import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import type { ModalProps } from "components/Modal/Modal";

import SettingsIcon24 from "img/ic_settings.svg?react";
import SettingsIcon16 from "img/ic_settings_16.svg?react";

import ModalWithPortal from "../Modal/ModalWithPortal";

import "./NetworkDropdown.css";

const NETWORK_MODAL_KEY = "NETWORK";

export default function NetworkDropdown(props) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  function getModalContent(modalName) {
    switch (modalName) {
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
function NavIcons({ selectorLabel }) {
  const { chainId } = useChainId();
  const icon = getIcon(chainId, "network");

  return (
    <>
      <button>
        <img className="size-20" src={icon} alt={selectorLabel} />
      </button>
      <button className="max-md:hidden">
        <FiChevronDown size={20} />
      </button>
    </>
  );
}

function DesktopDropdown({ selectorLabel, networkOptions, openSettings }) {
  return (
    <div className="relative flex items-center gap-8">
      <Menu>
        <Menu.Button as="div" data-qa="networks-dropdown-handle">
          <Button variant="secondary" className="flex h-40 items-center gap-8 max-md:h-32 max-md:p-6">
            <NavIcons selectorLabel={selectorLabel} />
          </Button>
        </Menu.Button>
        <Menu.Items as="div" className="menu-items network-dropdown-items" data-qa="networks-dropdown">
          <div className="dropdown-label">
            <Trans>Network</Trans>
          </div>
          <div className="network-dropdown-list">
            <NetworkMenuItems networkOptions={networkOptions} selectorLabel={selectorLabel} />
          </div>
          <div className="network-dropdown-divider" />
          <Menu.Item>
            <div
              className="network-dropdown-menu-item menu-item last-dropdown-menu"
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
