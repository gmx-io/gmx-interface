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
        <Trans>GMTrade</Trans>
      </ModalHeader>

      <ModalBody>
        <p>
          <Trans>
            GMTrade (previously GMX Solana) is hosted on another website and run by a different team, so the experience
            may vary slightly
          </Trans>
        </p>
        <p>
          <Trans>Opens GMTrade in a new tab</Trans>
        </p>

        <button
          className="btn-landing w-full rounded-8 py-18 text-center text-16 tracking-[-0.192px]"
          onClick={onConfirm}
        >
          <Trans>Open GMTrade</Trans>
        </button>
      </ModalBody>
    </Modal>
  );
}
