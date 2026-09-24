// import logo_new from '@/img/logo_new.png';
import logo_new from '@/img/landing-logo.svg';
import githubIcon from '@/img/Github.svg';
import telegramIcon from '@/img/Telegram.svg';
import discordIcon from '@/img/Discord.svg';
import xIcon from '@/img/X.svg';
import closeIcon from '@/img/close.png';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import { Trans } from '@lingui/macro';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useState, useEffect } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { selectIsTermsAccepted } from '@/selectors/setting/baseSelectors';
import { TermsModal } from '@/components/TermsModal/TermsModal';
import './Landing.scss';
import { useMedia } from 'react-use';
import { DEFAULT_DOCS_ENV } from '@/config/env';
type NavigationLinkProps = {
  onClose?: () => void;
};

const TERMS_DISMISS_KEY = 'terms_modal_dismiss_until';

export default function NavigationLink({ onClose }: NavigationLinkProps) {
  const navigate = useNavigate();
  const isTermsAccepted = useAppStore(selectIsTermsAccepted);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const isMobile = useMedia('(max-width: 768px)');
  const isDismissedFor30Days = useCallback(() => {
    try {
      const dismissUntil = localStorage.getItem(TERMS_DISMISS_KEY);
      if (!dismissUntil) return false;

      const dismissDate = new Date(dismissUntil);
      const now = new Date();

      return now < dismissDate;
    } catch (error) {
      localStorage.removeItem(TERMS_DISMISS_KEY);
      return false;
    }
  }, []);

  const handleOpenApp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isTermsAccepted || isDismissedFor30Days()) {
        if (onClose) onClose();
        navigate('/trade');
      } else {
        setShowTermsModal(true);
      }
    },
    [isTermsAccepted, navigate, isDismissedFor30Days, onClose]
  );

  const handleCloseTermsModal = useCallback(() => {
    setShowTermsModal(false);
  }, []);

  useEffect(() => {
    if (isTermsAccepted && showTermsModal) {
      setShowTermsModal(false);
      if (onClose) onClose();
      navigate('/trade');
    }
  }, [isTermsAccepted, showTermsModal, navigate, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f111a',
        color: '#e6e6f0',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.2rem 1.6rem 1.2rem 0.5rem',
          //   borderBottom: '1px solid #535353',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <img
            src={logo_new}
            alt="GMTrade"
            style={{ width: isMobile ? '13rem' : '13rem', height: 'auto' }}
          />
        </div>
        <button
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#1b2033',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // border: '1px solid #535353',
          }}
        >
          <img src={closeIcon} alt="close" style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Links */}
      <div style={{ padding: '0.8rem 1.6rem' }}>
        <NavRow withTopBorder>
          <ExternalLink
            href="https://github.com/gmsol-labs/"
            className="nl-link"
          >
            Protocol
          </ExternalLink>
        </NavRow>
        <Divider />

        <NavRow>
          <ExternalLink href={`${DEFAULT_DOCS_ENV}`} className="nl-link">
            Docs
          </ExternalLink>
        </NavRow>
        <Divider />

        <button
          onClick={handleOpenApp}
          style={{
            marginTop: '3.2rem',
            width: '100%',
            height: 44,
            borderRadius: 10,
            background: '#FA7B4E',
            color: '#fff',
            border: 'none',
            fontWeight: 500,
          }}
        >
          Open App
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          padding: '1.6rem',
          textAlign: 'center',
          color: '#9aa4bf',
        }}
      >
        <div style={{ marginBottom: '0.8rem' }}>Driven by our community</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <ExternalLink href="https://discord.gg/">
            <img src={discordIcon} alt="discord" style={{ height: 22 }} />
          </ExternalLink>
          <ExternalLink href="https://x.com/">
            <img src={xIcon} alt="x" style={{ height: 22 }} />
          </ExternalLink>
          <ExternalLink href="https://t.me/">
            <img src={telegramIcon} alt="telegram" style={{ height: 22 }} />
          </ExternalLink>

          <ExternalLink href="https://github.com/gmsol-labs/">
            <img src={githubIcon} alt="github" style={{ height: 22 }} />
          </ExternalLink>
        </div>
      </div>

      {showTermsModal && (
        <div className="fixed left-0 top-0 z-[1000] flex h-full w-full items-center justify-center bg-black/50">
          <TermsModal onClose={handleCloseTermsModal} />
        </div>
      )}
    </div>
  );
}

function NavRow({
  children,
  withTopBorder = false,
}: {
  children: React.ReactNode;
  withTopBorder?: boolean;
}) {
  return (
    <div
      style={{
        padding: '1.2rem 0',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        borderTop: withTopBorder ? '1px solid #535353' : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#535353', opacity: 0.9 }} />;
}
