import './OfficialSiteModal.scss';
import { Trans, t } from '@lingui/macro';
import Button from '@/components/Common/Button/Button';
import Modal from '@/components/Common/Modal/Modal';

interface OfficialSiteModalProps {
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
}

export default function OfficialSiteModal({
    isVisible,
    setIsVisible,
}: OfficialSiteModalProps) {
    const handleVisitOfficial = () => {
        window.open('https://gmtrade.xyz', '_self');
        // setIsVisible(false);
    };

    return (
        <Modal
            className="OfficialSiteModal"
            isVisible={isVisible}
            setIsVisible={setIsVisible}
            label={t`GMTrade Official Site Is Live`}
            closeOnClickModal={false}
            qa="official-site-modal"
            footerContent={
                <div className="footer-content">
                    <Button
                        variant="primary"
                        className="btn"
                        onClick={handleVisitOfficial}
                    >
                        <Trans>Visit Official Site</Trans>
                    </Button>
                </div>
            }
        >
            <div className="modal-content">
                <p className="message">
                    <Trans>You're currently on our beta site.</Trans>
                </p>
                <p className="message">
                    <Trans>
                        Visit{' '}
                        <a
                            href="https://gmtrade.xyz"
                            target="_self"
                            rel="noopener noreferrer"
                            className="link"
                        >
                            gmtrade.xyz
                        </a>{' '}
                        for the official and fully supported experience.
                    </Trans>
                </p>
            </div>
        </Modal>
    );
}
