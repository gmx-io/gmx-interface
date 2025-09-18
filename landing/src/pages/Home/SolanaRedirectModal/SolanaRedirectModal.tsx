import { Trans } from "@lingui/macro";

import { Modal, ModalHeader } from "../Modal/Modal";
import { ModalBody } from "../Modal/Modal";

type SolanaRedirectModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export function SolanaRedirectModal({ onClose, onConfirm }: SolanaRedirectModalProps) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <Trans>GMX Solana</Trans>
      </ModalHeader>

      <ModalBody>
        <p>
          <Trans>
            You're about to navigate to GMX Solana, which is operated by a separate team, so the experience may vary
            slightly.
          </Trans>
        </p>

        <button
          className="btn-landing w-full rounded-8 py-18 text-center text-16 tracking-[-0.192px]"
          onClick={onConfirm}
        >
          <Trans>Open GMX Solana</Trans>
        </button>
      </ModalBody>
    </Modal>
  );
}
