import { Menu } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { Address } from "viem";

import { BOTANIX } from "config/chains";
import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getAccountUrl, useENS } from "lib/legacy";
import { useBreakpoints } from "lib/useBreakpoints";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";

import BellIcon from "img/ic_bell.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExplorerIcon from "img/ic_explorer.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";

import "./AddressDropdownWithoutMultichain.scss";

export function AddressDropdownWithoutMultichain({ account }: { account: string }) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { openNotifyModal } = useNotifyModalState();
  const { ensName } = useENS(account);
  const { isMobile } = useBreakpoints();
  const displayAddressLength = isMobile ? 9 : 13;

  const { chainId } = useChainId();
  const isBotanix = chainId === BOTANIX;

  const accountUrl = getAccountUrl(chainId, account);
  const handleDisconnect = useDisconnectAndClose();

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Menu.Button as="div">
            <Button variant="secondary" className="flex items-center gap-8 px-15 pr-12">
              <Avatar size={isMobile ? 16 : 24} ensName={ensName} address={account} />

              <span className="text-body-medium font-medium text-typography-primary">
                {shortenAddressOrEns(ensName || account, displayAddressLength)}
              </span>

              <ChevronDownIcon className={cx("block size-20", { "rotate-180": open })} />
            </Button>
          </Menu.Button>

          <Menu.Items as="div" className="menu-items">
            <Menu.Item>
              <div
                className="menu-item"
                onClick={() => {
                  copyToClipboard(account);
                  helperToast.success(t`Address copied`);
                }}
              >
                <CopyIcon className="size-20" />
                <p>
                  <Trans>Copy address</Trans>
                </p>
              </div>
            </Menu.Item>
            <Menu.Item>
              <Link className="menu-item" to={buildAccountDashboardUrl(account as Address, undefined, 2)}>
                <PnlAnalysisIcon width={20} className="size-20" />
                <p>
                  <Trans>PnL analysis</Trans>
                </p>
              </Link>
            </Menu.Item>
            <Menu.Item>
              <ExternalLink href={accountUrl} className="menu-item !no-underline">
                <ExplorerIcon width={20} className="size-20" />
                <p>
                  <Trans>View in explorer</Trans>
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
                <DisconnectIcon width={20} className="size-20" />
                <p>
                  <Trans>Disconnect</Trans>
                </p>
              </div>
            </Menu.Item>
          </Menu.Items>
        </>
      )}
    </Menu>
  );
}
