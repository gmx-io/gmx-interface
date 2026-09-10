import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import solanaIcon from "img/tokens/ic_sol.svg";

export function SolanaNetworkItem({ onSelect }: { onSelect: () => void }) {
  return (
    <Menu.Item>
      {({ close }) => (
        <div
          className="network-dropdown-menu-item menu-item"
          data-qa="networks-dropdown-solana"
          onClick={() => {
            close();
            onSelect();
          }}
        >
          <div className="menu-item-group cursor-pointer">
            <div className="menu-item-icon">
              <img className="network-dropdown-icon" src={solanaIcon} alt={t`Solana`} />
            </div>
            <span className="network-dropdown-item-label">
              <Trans>Solana</Trans>
            </span>
          </div>
        </div>
      )}
    </Menu.Item>
  );
}

export function GmTradeModal({
  isVisible,
  setIsVisible,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`GMX on Solana`}
      contentClassName="!max-w-[420px]"
    >
      <div className="flex flex-col gap-16">
        <p className="mb-8 text-15 text-typography-secondary">
          <Trans>GMX on Solana (known as GMTrade) is currently served from a separate domain.</Trans>
        </p>

        <Button
          variant="primary-action"
          className="w-full"
          to="https://gmtrade.xyz"
          newTab
          onClick={() => setIsVisible(false)}
        >
          <Trans>Open GMTrade in a new tab</Trans>
        </Button>
      </div>
    </ModalWithPortal>
  );
}
