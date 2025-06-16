import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";
import { createBreakpoint, useCopyToClipboard } from "react-use";
import type { Address } from "viem";

import { helperToast } from "lib/helperToast";
import { useENS } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { Avatar } from "components/Avatar/Avatar";
import ExternalLink from "components/ExternalLink/ExternalLink";

import copy from "img/ic_copy_20.svg";
import externalLink from "img/ic_new_link_20.svg";
import PnlAnalysisIcon from "img/ic_pnl_analysis_20.svg?react";
import disconnect from "img/ic_sign_out_20.svg";

import "./AddressDropdown.scss";

type Props = {
  account: string;
  accountUrl: string;
  disconnectAccountAndCloseSettings: () => void;
};

const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings }: Props) {
  const breakpoint = useBreakpoint();
  const [, copyToClipboard] = useCopyToClipboard();
  const { ensName } = useENS(account);
  const displayAddressLength = breakpoint === "S" ? 9 : 13;

  return (
    <div className="relative">
      <Menu>
        <Menu.Button as="div">
          <button className="flex items-center gap-8 rounded-8 bg-new-gray-200 px-16 py-10">
            <Avatar size={20} ensName={ensName} address={account} />

            <span className="text-body-medium font-medium">
              {shortenAddressOrEns(ensName || account, displayAddressLength)}
            </span>
          </button>
        </Menu.Button>
        <div>
          <Menu.Items as="div" className="menu-items">
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
            <Menu.Item>
              <div
                className="menu-item"
                onClick={() => {
                  userAnalytics.pushEvent<DisconnectWalletEvent>({
                    event: "ConnectWalletAction",
                    data: {
                      action: "Disconnect",
                    },
                  });

                  disconnectAccountAndCloseSettings();
                }}
              >
                <img width={20} className="size-20" src={disconnect} alt="Disconnect the wallet" />
                <p>
                  <Trans>Disconnect</Trans>
                </p>
              </div>
            </Menu.Item>
          </Menu.Items>
        </div>
      </Menu>
    </div>
  );
}

export default AddressDropdown;
