import { Trans, t } from "@lingui/macro";
import { forwardRef, useState } from "react";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
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
        label={t`GMTrade`}
        contentClassName="!max-w-[420px]"
      >
        <div className="flex flex-col gap-16">
          <p className="mb-8 text-15 text-typography-secondary">
            <Trans>
              GMTrade (previously GMX Solana) is hosted on a separate website and run by a different team, so the
              experience may vary. Opens in a new tab.
            </Trans>
          </p>

          <ExternalLink href="https://gmtrade.xyz" className="!no-underline inline-flex w-full">
            <Button variant="primary-action" className="w-full">
              <Trans>Open GMTrade</Trans>
            </Button>
          </ExternalLink>
        </div>
      </ModalWithPortal>
    </>
  );
});

export default SolanaNetworkItem;
