import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useAccount } from "wagmi";

import { SOLANA } from "config/chains";
import { switchNetwork } from "lib/wallets";

import solanaIcon from "img/tokens/ic_sol.svg";

export function SolanaNetworkItem({ isSelected }: { isSelected: boolean }) {
  const { isConnected } = useAccount();

  return (
    <Menu.Item>
      {({ close }) => (
        <div
          className="network-dropdown-menu-item menu-item"
          data-qa="networks-dropdown-solana"
          onClick={() => {
            close();
            void switchNetwork(SOLANA, isConnected);
          }}
        >
          <div className="menu-item-group cursor-pointer">
            <div className="menu-item-icon">
              <img className="network-dropdown-icon" src={solanaIcon} alt={t`Solana`} />
            </div>
            <span
              className={cx(
                "network-dropdown-item-label",
                isSelected ? "text-typography-primary" : "text-typography-secondary"
              )}
            >
              <Trans>Solana</Trans>
            </span>
          </div>
          {isSelected && (
            <div className="mr-[2.5px] size-[5px] rounded-full bg-green-300 shadow-[0_0_0_2.5px_rgb(var(--color-green-300-raw)/0.2)]" />
          )}
        </div>
      )}
    </Menu.Item>
  );
}
