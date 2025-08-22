import { Trans, t } from "@lingui/macro";
import { useState } from "react";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";

import solanaIcon from "img/ic_sol_24.svg";

export default function SolanaNetworkItem() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className="network-dropdown-menu-item menu-item cursor-pointer"
        data-qa="networks-dropdown-solana"
        onClick={handleClick}
      >
        <div className="menu-item-group">
          <div className="menu-item-icon">
            <img className="network-dropdown-icon" src={solanaIcon} alt={t`Solana`} />
          </div>
          <span className="network-dropdown-item-label">
            <Trans>Solana</Trans>
          </span>
        </div>
      </div>

      <Modal isVisible={isModalOpen} setIsVisible={setIsModalOpen} label={t`GMX Solana`}>
        <div className="flex flex-col gap-16">
          <p className="mb-8 text-15 text-typography-secondary">
            <Trans>
              GMX Solana is hosted on a different website by a different DAO team.
              <br />
              <br />
              The experience may vary slightly.
            </Trans>
          </p>

          <ExternalLink href="https://gmxsol.io/trade" className="!no-underline">
            <Button variant="primary" className="w-full">
              <Trans>Open GMX Solana</Trans>
            </Button>
          </ExternalLink>
        </div>
      </Modal>
    </>
  );
}
