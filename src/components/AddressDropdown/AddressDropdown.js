import "./AddressDropdown.css";
import { Menu } from "@headlessui/react";
import { helperToast, shortenAddress, useENS } from "../../Helpers";
import { useCopyToClipboard, createBreakpoint } from "react-use";
import externalLink from "../../img/ic_new_link_16.svg";
import copy from "../../img/ic_copy_16.svg";
import settings from "../../img/ic_settings_16.svg";
import disconnect from "../../img/ic_sign_out_16.svg";
import { FaChevronDown } from "react-icons/fa";
import Davatar from "@davatar/react";
import { useTranslation } from 'react-i18next';

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings, openSettings }) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { ensName } = useENS(account);
  const { t } = useTranslation();

  return (
    <Menu>
      <Menu.Button as="div">
        <button className="App-cta small transparent address-btn">
          <Davatar size={20} address={account} />
          <span className="user-address">{ensName || shortenAddress(account, breakpoint === "S" ? 9 : 13)}</span>
          <FaChevronDown />
        </button>
      </Menu.Button>
      <div>
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div
              className="menu-item"
              onClick={() => {
                copyToClipboard(account);
                helperToast.success(t('addressdropdown.Address_copied_to_your_clipboard'));
              }}
            >
              <img src={copy} alt={t('addressdropdown.Copy_user_address')} />
              <p>{t('addressdropdown.Copy_Address')}</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <a href={accountUrl} target="_blank" rel="noopener noreferrer" className="menu-item">
              <img src={externalLink} alt={t('addressdropdown.Open_address_in_explorer')} />
              <p>{t('addressdropdown.View_in_Explorer')}</p>
            </a>
          </Menu.Item>

          <Menu.Item>
            <div className="menu-item" onClick={openSettings}>
              <img src={settings} alt={t('addressdropdown.Open_settings')} />
              <p>{t('addressdropdown.Settings')}</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={disconnectAccountAndCloseSettings}>
              <img src={disconnect} alt={t('addressdropdown.Disconnect_the_wallet')} />
              <p>{t('addressdropdown.Disconnect')}</p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default AddressDropdown;
