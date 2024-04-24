import React, { useContext, useRef, useState } from "react";
import { Menu, Switch } from "@headlessui/react";
import ModalWithPortal from "../Modal/ModalWithPortal";
import { t, Trans } from "@lingui/macro";
import { HiDotsVertical } from "react-icons/hi";
import "./SettingDropdown.css";
import docsIcon from "img/ic_docs.svg";
import discordIcon from "img/ic_discord.svg";
import chartIcon from "img/ic_chart.svg";
import emailIcon from "img/ic_email.svg";
import emailSuccess from "img/email_success.svg";
import settingsIcon from "img/ic_setting.svg";
import languageIcon from "img/ic_language.svg";
import informationIcon from "img/ic_information.svg";
import darkModeIcon from "img/ic_dark_mode.svg";
import { defaultLocale } from "lib/i18n";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import LanguageModalContent from "components/NetworkDropdown/LanguageModalContent";
import { ThemeContext } from "store/theme-provider";


const LANGUAGE_MODAL_KEY: string = "LANGUAGE";
const SETTINGS_MODAL_KEY: string = "SETTINGS";
const EMAIL_NOTIFICATION_MODAL_KEY: string = "EMAIL_NOTIFICATION";

export default function SettingDropdown(props) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  function getModalContent(modalName) {
    switch (modalName) {
      case LANGUAGE_MODAL_KEY:
        return <LanguageModalContent currentLanguage={currentLanguage} />;
      case SETTINGS_MODAL_KEY:
        return <SettingModalContent setActiveModal={props.setActiveModal} openSettings={props.openSettings} />;
      case EMAIL_NOTIFICATION_MODAL_KEY:
        return (
          <EmailNotificationModalContent setActiveModal={props.setActiveModal} openSettings={props.openSettings} />
        );
      default:
        return;
    }
  }

  function getModalProps(modalName) {
    switch (modalName) {
      case LANGUAGE_MODAL_KEY:
        return {
          className: "language-popup",
          isVisible: props.activeModal === LANGUAGE_MODAL_KEY,
          setIsVisible: () => props.setActiveModal(null),
          label: t`Select Language`,
        };
      case SETTINGS_MODAL_KEY:
        return {
          className: "network-popup",
          isVisible: props.activeModal === SETTINGS_MODAL_KEY,
          setIsVisible: () => props.setActiveModal(null),
          label: t`Settings`,
        };
      case EMAIL_NOTIFICATION_MODAL_KEY:
        return {
          className: "notification-popup",
          isVisible: props.activeModal === EMAIL_NOTIFICATION_MODAL_KEY,
          setIsVisible: () => props.setActiveModal(null),
          label: t`Enable email notification`,
        };
      default:
        return {};
    }
  }

  return (
    <>
      {props.small ? (
        <div className="App-header-network" onClick={() => props.setActiveModal(SETTINGS_MODAL_KEY)}>
          <div className="network-dropdown">
            <NavIcons />
          </div>
        </div>
      ) : (
        <DesktopDropdown
          currentLanguage={currentLanguage}
          activeModal={props.activeModal}
          setActiveModal={props.setActiveModal}
          {...props}
        />
      )}
      <ModalWithPortal {...getModalProps(props.activeModal)}>{getModalContent(props.activeModal)}</ModalWithPortal>
    </>
  );
}
function NavIcons() {
  const theme = useContext(ThemeContext);
  return (
    <button className="transparent third-step">
      <HiDotsVertical className={theme.isDark ? "text-white" : "text-black"} size={20} />
    </button>
  );
}

function DesktopDropdown({ setActiveModal, openSettings }) {
  const themeToggle = useContext(ThemeContext);
  // const [enabledDarkMode, setEnabledDarkMode] = useState(false);
  const [enabledEmailNotification, setEnabledEmailNotification] = useState(false);
  const [enabledOneTrading, setEnabledOneTrading] = useState(false);

  const enableNotificationhandler = (status) => {
    setEnabledEmailNotification(status);
    if (status) setActiveModal(EMAIL_NOTIFICATION_MODAL_KEY);
  };

  return (
    <div className="App-header-setting">
      <Menu>
        <Menu.Button as="div" className="setting-dropdown">
          <NavIcons />
        </Menu.Button>
        <Menu.Items as="div" className="menu-items setting-dropdown-items fourth-step">
          <Menu.Item>
            <div className="setting-dropdown-menu-item menu-item">
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={docsIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Docs</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="setting-dropdown-menu-item menu-item">
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={discordIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Discord</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="setting-dropdown-menu-item menu-item">
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={chartIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Enable 1-click trading</Trans>
                </span>
              </div>
              <Switch
                checked={enabledOneTrading}
                onChange={setEnabledOneTrading}
                className={`${enabledOneTrading ? "toggle-on" : "toggle-off"} switch-button`}
              >
                <span className="sr-only">Enable 1-click trading</span>
                <span className={`${enabledOneTrading ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
              </Switch>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div
              className="setting-dropdown-menu-item menu-item"
              onClick={() => setActiveModal(EMAIL_NOTIFICATION_MODAL_KEY)}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={emailIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Enable email notification</Trans>
                </span>
                <img className="setting-dropdown-info-icon" src={informationIcon} alt="" />
              </div>
              <Switch
                checked={enabledEmailNotification}
                onChange={enableNotificationhandler}
                className={`${enabledEmailNotification ? "toggle-on" : "toggle-off"} switch-button`}
              >
                <span className="sr-only">Enable Email Notification</span>
                <span className={`${enabledEmailNotification ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
              </Switch>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="setting-dropdown-menu-item menu-item" onClick={openSettings}>
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={settingsIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Slippage</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div
              className="setting-dropdown-menu-item menu-item last-dropdown-menu"
              onClick={() => setActiveModal(LANGUAGE_MODAL_KEY)}
            >
              <div className="menu-item-group">
                <div className="menu-item-icon">
                  <img className="setting-dropdown-icon" src={languageIcon} alt="" />
                </div>
                <span className="setting-dropdown-item-label">
                  <Trans>Language</Trans>
                </span>
              </div>
            </div>
          </Menu.Item>
          <div className="setting-dropdown-divider" />
          <Menu.Item>
            <div className="setting-dropdown-menu-item menu-item last-dropdown-menu">
              <div className="menu-item-group">
                <span className="setting-dropdown-item-label">
                  <Trans>Dark mode</Trans>
                </span>
              </div>
              <Switch
                checked={themeToggle.isDark}
                onChange={themeToggle.changeTheme}
                className={`${themeToggle.isDark ? "toggle-on" : "toggle-off"} switch-button`}
              >
                {!themeToggle.isDark && <img src={darkModeIcon} className="dark-mode" alt="dark_mode" />}
                <span className="sr-only">Enable Dark Mode</span>
                <span className={`${themeToggle.isDark ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
              </Switch>
            </div>
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}

function SettingModalContent({ setActiveModal, openSettings }) {
  const themeToggle = useContext(ThemeContext);
  const [enabledEmailNotification, setEnabledEmailNotification] = useState(false);
  const [enabledOneTrading, setEnabledOneTrading] = useState(false);

  return (
    <div className="setting-dropdown-items fourth-step">
      <div className="setting-dropdown-list">
        <div className="setting-option">
          <div className="menu-item-group">
            <img className="setting-option-img" src={docsIcon} alt="Select Language" />
            <span className="setting-option-img-label">Docs</span>
          </div>
        </div>
        <div className="setting-option">
          <div className="menu-item-group">
            <img className="setting-option-img" src={discordIcon} alt="Select Language" />
            <span className="setting-option-img-label">Discord</span>
          </div>
        </div>
        <div className="setting-option">
          <div className="menu-item-group">
            <img className="setting-option-img" src={chartIcon} alt="Select Language" />
            <span className="setting-option-img-label">Enable 1-click trading</span>
          </div>
          <Switch
            checked={enabledOneTrading}
            onChange={setEnabledOneTrading}
            className={`${enabledOneTrading ? "toggle-on" : "toggle-off"} switch-button`}
          >
            <span className="sr-only">Enable 1-click trading</span>
            <span className={`${enabledOneTrading ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
          </Switch>
        </div>
        <div
          className="setting-option"
          onClick={() => {
            setActiveModal(EMAIL_NOTIFICATION_MODAL_KEY);
          }}
        >
          <div className="menu-item-group">
            <img className="setting-option-img" src={emailIcon} alt="Select Language" />
            <span className="setting-option-img-label">Enable email notification</span>
            <img className="setting-dropdown-info-icon" src={informationIcon} alt="" />
          </div>
          <Switch
            checked={enabledEmailNotification}
            onChange={setEnabledEmailNotification}
            className={`${enabledEmailNotification ? "toggle-on" : "toggle-off"} switch-button`}
          >
            <span className="sr-only">Enable Email Notification</span>
            <span className={`${enabledEmailNotification ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
          </Switch>
        </div>
        <div
          className="setting-option"
          onClick={() => {
            openSettings();
            setActiveModal(null);
          }}
        >
          <div className="menu-item-group">
            <img className="setting-option-img" src={settingsIcon} alt="" />
            <span className="setting-option-img-label">
              <Trans>Settings</Trans>
            </span>
          </div>
        </div>
        <div
          className="setting-option"
          onClick={() => {
            setActiveModal(LANGUAGE_MODAL_KEY);
          }}
        >
          <div className="menu-item-group">
            <img className="setting-option-img" src={languageIcon} alt="Select Language" />
            <span className="setting-option-img-label">Language</span>
          </div>
        </div>
        <div className="setting-dropdown-divider" />
        <div className="setting-option">
          <div className="menu-item-group">
            <span className="setting-option-img-label">
              <Trans>Dark mode</Trans>
            </span>
          </div>
          <Switch
            checked={themeToggle.isDark}
            onChange={themeToggle.changeTheme}
            className={`${themeToggle.isDark ? "toggle-on" : "toggle-off"} switch-button`}
          >
            {!themeToggle.isDark && <img src={darkModeIcon} className="dark-mode" alt="dark_mode" />}
            <span className="sr-only">Enable Dark Mode</span>
            <span className={`${themeToggle.isDark ? "translate-x-6" : "translate-x-1"} toggle-transform`} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function EmailNotificationModalContent({ setActiveModal, openSettings }) {
  // @todo replicate styles for dark mode
  // const [enabledDarkMode, setEnabledDarkMode] = useState(false);
  // const [enabledEmailNotification, setEnabledEmailNotification] = useState(false);
  // const [enabledOneTrading, setEnabledOneTrading] = useState(false);

  return (
    <div className="setting-dropdown-items email-notification">
      <div className="email-notification-container block">
        <div className="email-notification-title">
          <Trans>Connect email to receive notifications to important messages!</Trans>
        </div>
        <div className="email-notification-label">
          <Trans>Your email</Trans>
        </div>
        <div className="email-input-container">
          <img src={emailIcon} className="email-icon" alt="email" />
          <input type="email" className="App-slippage-tolerance-input email-input" placeholder="name@example.com" />
        </div>
        <button className="w-100 mt-md email-verify-button">
          <Trans>Verify</Trans>
        </button>
        <div className="enter-code hidden">
          <div className="enter-code-title">
            <Trans>Enter Code</Trans>
          </div>
          <div className="enter-code-sub">
            <Trans>OTP Verification Failed</Trans>
          </div>
          <div className="otp-code-container">
            <input type="number" maxLength={1} className="otp-code-input" />
            <input type="number" maxLength={1} className="otp-code-input" />
            <input type="number" maxLength={1} className="otp-code-input" />
            <input type="number" maxLength={1} className="otp-code-input" />
          </div>
          <div>
            <span className="resend-code">Resend Passcode</span>
          </div>
        </div>
      </div>
      <div className="success-container hidden">
        <img src={emailSuccess} alt="emailSuccess" />
        <div className="success-info">
          <Trans>Your email notification is successfully enabled!</Trans>
        </div>
        <button className="w-100 mt-md back-button">
          <Trans>Back to app</Trans>
        </button>
      </div>
    </div>
  );
}
