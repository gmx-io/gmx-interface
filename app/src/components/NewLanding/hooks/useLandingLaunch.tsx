import { TermsModal } from '@/components/TermsModal/TermsModal';
import { selectIsTermsAccepted } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const TERMS_DISMISS_KEY = 'terms_modal_dismiss_until';

function isDismissedFor30Days() {
  try {
    const dismissUntil = localStorage.getItem(TERMS_DISMISS_KEY);
    if (!dismissUntil) return false;

    const dismissDate = new Date(dismissUntil);
    const now = new Date();

    return now < dismissDate;
  } catch {
    localStorage.removeItem(TERMS_DISMISS_KEY);
    return false;
  }
}

export function useLandingLaunch() {
  const navigate = useNavigate();
  const isTermsAccepted = useAppStore(selectIsTermsAccepted);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleLaunchApp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isTermsAccepted || isDismissedFor30Days()) {
        navigate('/trade');
      } else {
        setShowTermsModal(true);
      }
    },
    [isTermsAccepted, navigate]
  );

  useEffect(() => {
    if (isTermsAccepted && showTermsModal) {
      setShowTermsModal(false);
      navigate('/trade');
    }
  }, [isTermsAccepted, showTermsModal, navigate]);

  const handleCloseTermsModal = useCallback(() => {
    setShowTermsModal(false);
  }, []);

  const termsModal: ReactNode = showTermsModal ? (
    <div className="fixed left-0 top-0 z-[1000] flex h-full w-full items-center justify-center bg-black/50">
      <TermsModal onClose={handleCloseTermsModal} />
    </div>
  ) : null;

  return { handleLaunchApp, termsModal };
}
