import { Trans, t } from "@lingui/macro";
import { forwardRef, useState } from "react";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import solanaIcon from "img/tokens/ic_sol.svg";

const SolanaNetworkItem = forwardRef<HTMLDivElement>(function SolanaNetworkItem(_props, ref) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        ref={ref}
        className="network-dropdown-menu-item menu-item"
        data-qa="networks-dropdown-solana"
        onClick={handleClick}
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

      <ModalWithPortal
        isVisible={isModalOpen}
        setIsVisible={setIsModalOpen}
        label={t`GMX on Solana`}
        contentClassName="!max-w-[420px]"
      >
        <div className="flex flex-col gap-16">
          <p className="mb-8 text-15 text-typography-secondary">
            <Trans>GMX on Solana (known as GMTrade) is currently served from a separate domain.</Trans>
          </p>

          <Button variant="primary-action" className="w-full" to="https://gmtrade.xyz" newTab>
            <Trans>Open GMTrade in a new tab</Trans>
          </Button>
        </div>
      </ModalWithPortal>
    </>
  );
});

export default SolanaNetworkItem;
