import React, { useRef, useState } from "react";
import { Menu } from "@headlessui/react";
import ModalWithPortal from "../Modal/ModalWithPortal";
import { t } from "@lingui/macro";
import cx from "classnames";
import "./NetworkDropdown.css";
import language24Icon from "../../img/ic_language24.svg";
import arbitrumIcon from "../../img/ic_arbitrum_24.svg";
import avaxIcon from "../../img/ic_avalanche_24.svg";
import checkedIcon from "../../img/ic_checked.svg";
import arrowright16Icon from "../../img/ic_arrowright16.svg";
import { importImage, isHomeSite, LANGUAGE_LOCALSTORAGE_KEY } from "../../Helpers";
import { defaultLocale, dynamicActivate, locales } from "../../utils/i18n";

export default function NetworkDropdown(props) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(null);

  return (
    <>
      {props.small ? (
        <>
          <MobileScreen
            currentLanguage={currentLanguage}
            isLanguageModalOpen={isLanguageModalOpen}
            setIsLanguageModalOpen={setIsLanguageModalOpen}
            {...props}
          />
        </>
      ) : (
        <DesktopScreen
          currentLanguage={currentLanguage}
          isLanguageModalOpen={isLanguageModalOpen}
          setIsLanguageModalOpen={setIsLanguageModalOpen}
          {...props}
        />
      )}
    </>
  );
}

function MobileScreen({
  isLanguageModalOpen,
  setIsLanguageModalOpen,
  currentLanguage,
  selectorLabel,
  networkOptions,
  onNetworkSelect,
}) {
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return (
    <>
      <div className="App-header-settings" onClick={() => setIsMobileModalOpen(true)}>
        <div className="network-dropdown">
          <button className={cx("btn-primary small transparent network-dropdown-icon")}>
            <img src={selectorLabel === "Arbitrum" ? arbitrumIcon : avaxIcon} alt={selectorLabel} />
          </button>
          <div className="network-dropdown-seperator" />
          <button className={cx("btn-primary small transparent network-dropdown-icon")}>
            <img src={language24Icon} alt={locales[currentLanguage]} />
          </button>
        </div>
      </div>
      <ModalWithPortal isVisible={isMobileModalOpen} setIsVisible={setIsMobileModalOpen} label={t`Select Network`}>
        <div className="network-dropdown-items">
          {!isHomeSite() && (
            <>
              <div className="network-dropdown-list">
                {networkOptions.map((network) => {
                  const networkIcon = importImage(network.icon);
                  return (
                    <div
                      className="network-dropdown-menu-item network-selector menu-item"
                      onClick={() => handleNetworkSelect({ value: network.value })}
                      key={network.value}
                    >
                      <div className="menu-item-group">
                        <div className="menu-item-icon">
                          <img src={networkIcon} alt={network.label} />
                        </div>
                        <span className="network-dropdown-item-label">{network.label}</span>
                      </div>
                      <div className="network-dropdown-menu-item-img">
                        <div className={cx("active-dot", { [selectorLabel]: selectorLabel === network.label })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div>
            <div
              className="network-dropdown-menu-item network-selector menu-item"
              onClick={() => setIsLanguageModalOpen(true)}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img src={language24Icon} alt="" />
                </div>
                <span className="network-dropdown-item-label">Language</span>
              </div>
              <div className="menu-item-icon">
                <img src={arrowright16Icon} alt="arrow-right-icon" />
              </div>
            </div>
          </div>
        </div>

        <LanguageDropdown
          currentLanguage={currentLanguage}
          isLanguageModalOpen={isLanguageModalOpen}
          setIsLanguageModalOpen={setIsLanguageModalOpen}
        />
      </ModalWithPortal>
    </>
  );
}

function DesktopScreen({
  isLanguageModalOpen,
  setIsLanguageModalOpen,
  currentLanguage,
  selectorLabel,
  networkOptions,
  onNetworkSelect,
}) {
  return (
    <>
      <div className="App-header-settings">
        <Menu>
          <Menu.Button as="div" className="network-dropdown">
            {!isHomeSite() && (
              <>
                <button className={cx("btn-primary small transparent network-dropdown-icon")}>
                  <img src={selectorLabel === "Arbitrum" ? arbitrumIcon : avaxIcon} alt={selectorLabel} />
                </button>
                <div className="network-dropdown-seperator" />
              </>
            )}

            <button className={cx("btn-primary small transparent network-dropdown-icon")}>
              <img src={language24Icon} alt={locales[currentLanguage]} />
            </button>
          </Menu.Button>

          <Menu.Items as="div" className="menu-items network-dropdown-items">
            {!isHomeSite() && (
              <>
                <div className="network-dropdown-list">
                  <NetworkMenuItems
                    networkOptions={networkOptions}
                    selectorLabel={selectorLabel}
                    onNetworkSelect={onNetworkSelect}
                  />
                </div>
              </>
            )}
            <Menu.Item>
              <div className="network-dropdown-menu-item menu-item" onClick={() => setIsLanguageModalOpen(true)}>
                <div className="menu-item-group">
                  <div className="menu-item-icon">
                    <img src={language24Icon} alt="" />
                  </div>
                  <span className="network-dropdown-item-label">Language</span>
                </div>
                <div className="menu-item-icon">
                  <img src={arrowright16Icon} alt="arrow-right-icon" />
                </div>
              </div>
            </Menu.Item>
          </Menu.Items>
        </Menu>
      </div>
      <LanguageDropdown
        currentLanguage={currentLanguage}
        isLanguageModalOpen={isLanguageModalOpen}
        setIsLanguageModalOpen={setIsLanguageModalOpen}
      />
    </>
  );
}

function NetworkMenuItems({ networkOptions, selectorLabel, onNetworkSelect }) {
  async function handleNetworkSelect(option) {
    await onNetworkSelect(option);
  }
  return networkOptions.map((network) => {
    const networkIcon = importImage(network.icon);
    return (
      <Menu.Item key={network.value}>
        <div
          className="network-dropdown-menu-item menu-item"
          onClick={() => handleNetworkSelect({ value: network.value })}
        >
          <div className="menu-item-group">
            <div className="menu-item-icon">
              <img src={networkIcon} alt={network.label} />
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

function LanguageDropdown({ currentLanguage, isLanguageModalOpen, setIsLanguageModalOpen }) {
  return (
    <ModalWithPortal
      className="language-modal"
      isVisible={isLanguageModalOpen}
      setIsVisible={setIsLanguageModalOpen}
      label={t`Select Language`}
    >
      {Object.keys(locales).map((item) => {
        const image = importImage(`flag_${item}.svg`);
        return (
          <div
            key={item}
            className={cx("network-dropdown-menu-item  menu-item language-modal-item", {
              active: currentLanguage.current === item,
            })}
            onClick={() => {
              localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
              dynamicActivate(item);
            }}
          >
            <div className="menu-item-group">
              <div className="menu-item-icon">
                <img src={image} alt="language-menu-open-icon" />
              </div>
              <span className="network-dropdown-item-label menu-item-label">{locales[item]}</span>
            </div>
            <div className="network-dropdown-menu-item-img">
              {currentLanguage.current === item && <img src={checkedIcon} alt={locales[item]} />}
            </div>
          </div>
        );
      })}
    </ModalWithPortal>
  );
}
