import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { FiChevronDown } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import type { Address } from "viem";

import { BOTANIX } from "config/chains";
import { useBreakpoints } from "lib/breakpoints";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useENS } from "lib/legacy";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";

import BellIcon from "img/bell.svg?react";
import CopyIcon from "img/ic_copy_20.svg?react";
import ExternalLinkIcon from "img/ic_new_link_20.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis_20.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";

import "./AddressDropdown.scss";

type Props = {
  account: string;
  accountUrl: string;
  disconnectAccountAndCloseSettings: () => void;
};

function AddressDropdown({ account, accountUrl, disconnectAccountAndCloseSettings }: Props) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { openNotifyModal } = useNotifyModalState();
  const { ensName } = useENS(account);
  const { isMobile } = useBreakpoints();

  const displayAddressLength = isMobile ? 9 : 13;

  const { chainId } = useChainId();
  const isBotanix = chainId === BOTANIX;

  return (
    <div className="relative">
      <Menu>
        {({ open }) => (
          <>
            <Menu.Button as="div">
              <Button variant="secondary" className="flex items-center gap-8 px-15 pr-12">
                <Avatar size={isMobile ? 16 : 24} ensName={ensName} address={account} />

                <span className="text-body-medium font-medium text-white">
                  {shortenAddressOrEns(ensName || account, displayAddressLength)}
                </span>

                <FiChevronDown size={20} className={cx("block", { "rotate-180": open })} />
              </Button>
            </Menu.Button>
            <div>
              <Menu.Items as="div" className="menu-items">
                <Menu.Item>
                  <div
                    className="menu-item"
                    onClick={() => {
                      copyToClipboard(account);
                      helperToast.success(t`Address copied to your clipboard.`);
                    }}
                  >
                    <CopyIcon width={20} className="size-20" />
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
                    <ExternalLinkIcon width={20} className="size-20" />
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
                    <DisconnectIcon width={20} className="size-20" />
                    <p>
                      <Trans>Disconnect</Trans>
                    </p>
                  </div>
                </Menu.Item>
              </Menu.Items>
            </div>
          </>
        )}
      </Menu>
    </div>
  );
}

export default AddressDropdown;
