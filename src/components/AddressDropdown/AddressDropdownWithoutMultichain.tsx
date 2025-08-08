import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import { FaChevronDown } from "react-icons/fa";
import { Link } from "react-router-dom";
import { createBreakpoint, useCopyToClipboard } from "react-use";
import { Address } from "viem";

import { BOTANIX } from "config/chains";
import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getAccountUrl, useENS } from "lib/legacy";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { Avatar } from "components/Avatar/Avatar";
import ExternalLink from "components/ExternalLink/ExternalLink";

import BellIcon from "img/bell.svg?react";
import copy from "img/ic_copy_20.svg";
import externalLink from "img/ic_new_link_20.svg";
import PnlAnalysisIcon from "img/ic_pnl_analysis_20.svg?react";
import disconnect from "img/ic_sign_out_20.svg";

import "./AddressDropdownWithoutMultichain.scss";

const useBreakpoint = createBreakpoint({ L: 450, S: 0 }) as () => "L" | "S";

export function AddressDropdownWithoutMultichain({ account }: { account: string }) {
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { openNotifyModal } = useNotifyModalState();
  const { ensName } = useENS(account);
  const displayAddressLength = breakpoint === "S" ? 9 : 13;

  const { chainId } = useChainId();
  const isBotanix = chainId === BOTANIX;

  const accountUrl = getAccountUrl(chainId, account);
  const handleDisconnect = useDisconnectAndClose();

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex h-36 items-center gap-8 rounded-4 border border-stroke-primary px-12 text-slate-100">
        <div className="user-avatar">
          <Avatar size={20} ensName={ensName} address={account} />
        </div>
        <span>{shortenAddressOrEns(ensName || account, displayAddressLength)}</span>
        <FaChevronDown />
      </Menu.Button>
      <Menu.Items className="menu-items">
        <Menu.Item>
          <div
            className="menu-item"
            onClick={() => {
              copyToClipboard(account);
              helperToast.success(t`Address copied to your clipboard`);
            }}
          >
            <img width={20} className="size-20" src={copy} alt="Copy user address" />
            <p>
              <Trans>Copy Address</Trans>
            </p>
          </div>
        </Menu.Item>
        <Menu.Item>
          <Link className="menu-item" to={buildAccountDashboardUrl(account as Address, undefined, 2)}>
            <PnlAnalysisIcon width={20} className="size-20" />
            <p>
              <Trans>PnL Analysis</Trans>
            </p>
          </Link>
        </Menu.Item>
        <Menu.Item>
          <ExternalLink href={accountUrl} className="menu-item">
            <img width={20} className="size-20" src={externalLink} alt="Open address in explorer" />
            <p>
              <Trans>View in Explorer</Trans>
            </p>
          </ExternalLink>
        </Menu.Item>
        {!isBotanix ? (
          <Menu.Item>
            <div className="menu-item" onClick={openNotifyModal}>
              <BellIcon className="ml-2 size-20 pt-2" />
              <p>
                <Trans>Alerts</Trans>
              </p>
            </div>
          </Menu.Item>
        ) : null}
        <Menu.Item>
          <div className="menu-item" onClick={handleDisconnect}>
            <img width={20} className="size-20" src={disconnect} alt="Disconnect the wallet" />
            <p>
              <Trans>Disconnect</Trans>
            </p>
          </div>
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
