import Button from '@/components/Common/Button/Button';
import './TermsModal.scss';
import { useAnchor } from '@/contexts/anchor';
import {
  selectIsTermsAccepted,
  selectSetIsTermsAccepted,
} from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Checkbox from '@/components/Common/CheckBox/CheckBox';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import closeIcons from '@/img/header/close.svg';
interface TermsModalProps {
  onClose?: () => void;
}

const TERMS_DISMISS_KEY = 'terms_modal_dismiss_until';

export function TermsModal({ onClose }: TermsModalProps) {
  const { owner } = useAnchor();
  const isTermsAccepted = useAppStore(selectIsTermsAccepted);
  const setIsTermsAccepted = useAppStore(selectSetIsTermsAccepted);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiveMessage, setIsReceiveMessage] = useState(false);

  useEffect(() => {
    if (owner === undefined) {
      setIsLoading(true);
    }

    if (owner && !isTermsAccepted) {
      setIsTermsAccepted(true);
    }
    setIsLoading(false);
  }, [owner, isTermsAccepted, setIsTermsAccepted]);

  const setDismissFor30Days = useCallback(() => {
    try {
      const dismissUntil = new Date();
      dismissUntil.setDate(dismissUntil.getDate() + 30);
      localStorage.setItem(TERMS_DISMISS_KEY, dismissUntil.toISOString());
    } catch (error) {
      console.warn(error);
    }
  }, []);

  const isVisible = !isLoading && !isTermsAccepted;

  // lock body scroll while modal visible
  useBodyScrollLock(isVisible);

  const handleAccept = useCallback(() => {
    setIsTermsAccepted(true);
    if (isReceiveMessage) {
      setDismissFor30Days();
    }
  }, [setIsTermsAccepted, isReceiveMessage, setDismissFor30Days]);

  const handleDisagree = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleTogglePair = useCallback(() => {
    setIsReceiveMessage((prev) => !prev);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div className="terms-modal__overlay" onClick={handleDisagree} />
      <div className="terms-modal__center">
        <div className="terms-modal">
          <div className="terms-modal__header">
            <div className="terms-modal__title">{`Launch App`}</div>
            <button
              className="terms-modal__close"
              onClick={handleDisagree}
              aria-label={`Close`}
            >
              <img src={closeIcons} alt="close" />
            </button>
          </div>
          <div className="terms-modal__body">
            <p className="terms-modal__text">

              To use GMTrade Dapp services, you must first agree to the following terms. By clicking "Agree" you accept the{' '}
              <a href="https://docs.gmtrade.xyz/legal/user_terms" target="_blank" rel="noopener noreferrer" className="terms-modal__link" style={{ textDecoration: 'underline' }}>
                User Terms
              </a>
              {' '}and{' '}
              <a href="https://docs.gmtrade.xyz/legal/referral_terms" target="_blank" rel="noopener noreferrer" className="terms-modal__link" style={{ textDecoration: 'underline' }}>
                Referral Terms
              </a>
              .

            </p>
            <div className="terms-modal__checkbox-row">
              <Checkbox isChecked={isReceiveMessage} setIsChecked={handleTogglePair}>
                <span className="terms-modal__checkbox-label">
                  Don't show this message again for 30 days.
                </span>
              </Checkbox>
            </div>
          </div>
          <div className="terms-modal__footer">
            <Button className="terms-modal__button" variant="primary-action" onClick={handleAccept}>
              Agree and Launch App
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
