import { Trans } from "@lingui/macro";
import { useEffect } from "react";

import { Modal } from "../../components/Modal/Modal";

type SolanaRedirectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function SolanaRedirectModal({ isOpen, onClose, onConfirm }: SolanaRedirectModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.keyCode === 27 && onClose)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>
        <Trans>GMX Solana</Trans>
      </Modal.Header>

      <Modal.Body>
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
      </Modal.Body>
    </Modal>
  );
}
