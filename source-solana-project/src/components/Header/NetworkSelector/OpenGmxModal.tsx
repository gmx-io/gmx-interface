import './OpenGmxModal.scss';

import Button from '@/components/Common/Button/Button';
import Modal from '@/components/Common/Modal/Modal';
import { t, Trans } from '@lingui/macro';

import { GMX_IO_URL } from './networks';

interface OpenGmxModalProps {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  networkName: string;
}

export default function OpenGmxModal({
  isVisible,
  setIsVisible,
  networkName,
}: OpenGmxModalProps) {
  const handleOpenGmx = () => {
    window.open(GMX_IO_URL, '_blank', 'noopener,noreferrer');
    setIsVisible(false);
  };

  return (
    <Modal
      className="OpenGmxModal"
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={t`GMX`}
      contentPadding={false}
      noDivider
      qa="open-gmx-modal"
    >
      <div className="OpenGmxModal-content">
        <span className="OpenGmxModal-message">
          <Trans>
            To use {networkName}, you’ll continue on the main GMX site. The
            experience may vary. Opens in a new tab.
          </Trans>
        </span>
      </div>
      <div className="OpenGmxModal-footer">
        <Button
          variant="primary"
          className="OpenGmxModal-cta"
          type="button"
          onClick={handleOpenGmx}
        >
          <Trans>Open GMX</Trans>
        </Button>
      </div>
    </Modal>
  );
}
