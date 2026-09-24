import { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import cx from 'classnames';
import { useMedia } from 'react-use';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/zustand/useAppStore';
import Burger from '@/img/Burger.svg';
import logoMark from '@/img/new-landing/logo-mark.svg';
import '@/components/Header/Header.scss';
import './StatusPage.scss';

export type StatusPageAction = {
  label: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  to?: string;
};

type StatusPageProps = {
  illustrationSrc: string;
  illustrationAlt: string;
  illustrationVariant: '404' | 'oops';
  title: ReactNode;
  subtitle?: ReactNode;
  errorReference?: string;
  actions: StatusPageAction[];
  showMobileHeader?: boolean;
  onLogoClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function StatusPage({
  illustrationSrc,
  illustrationAlt,
  illustrationVariant,
  title,
  subtitle,
  errorReference,
  actions,
  showMobileHeader = true,
  onLogoClick,
}: StatusPageProps) {
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const { setIsRightNavigationOpen } = useAppStore(
    useShallow((state) => ({
      setIsRightNavigationOpen: state.settings.setIsRightNavigationOpen,
    }))
  );

  return (
    <div
      className={cx('status-page', `status-page--${illustrationVariant}`, {
        'status-page--with-mobile-header': isScreen1024 && showMobileHeader,
        'status-page--embedded': isScreen1024 && !showMobileHeader,
      })}
    >
      {isScreen1024 && showMobileHeader ? (
        <div className="status-page__header">
          <Link
            to="/trade"
            className="status-page__logo-link"
            onClick={onLogoClick}
          >
            <img src={logoMark} alt="GMTrade" className="status-page__logo" />
          </Link>
          <div
            className="setting"
            onClick={() => setIsRightNavigationOpen(true)}
          >
            <img src={Burger} alt="" />
          </div>
        </div>
      ) : null}
      <div className="status-page__content">
        <img
          className={cx('status-page__illustration', {
            'status-page__illustration--404': illustrationVariant === '404',
            'status-page__illustration--oops': illustrationVariant === 'oops',
          })}
          src={illustrationSrc}
          alt={illustrationAlt}
        />
        <div className="status-page__text-block">
          <div>
            <p className="status-page__title">{title}</p>
            {subtitle ? (
              <p className="status-page__subtitle">{subtitle}</p>
            ) : null}
          </div>
          {errorReference ? (
            <p className="status-page__error-reference">{errorReference}</p>
          ) : null}
          <div className="status-page__actions">
            {actions.map((action) =>
              action.to ? (
                <Link
                  key={action.label}
                  className="status-page__button"
                  to={action.to}
                  onClick={action.onClick}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className="status-page__button"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
