import './Header.scss';

import cx from 'classnames';
import { MouseEventHandler, ReactNode } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import ExternalLink from '@/components/Common/Link/ExternalLink';

interface Props {
  isHomeLink?: boolean;
  className?: string;
  exact?: boolean;
  to?: string;
  onClick?: MouseEventHandler<
    HTMLDivElement | HTMLAnchorElement | HTMLButtonElement
  >;
  children?: ReactNode;
  as?: 'button';
  isExternal?: boolean;
  'aria-expanded'?: boolean;
}

export function HeaderLink({
  isHomeLink,
  className,
  to,
  children,
  onClick,
  as,
  isExternal,
  'aria-expanded': expanded,
}: Props) {
  const baseClassName = cx('App-header-link', className);
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
  };

  const shouldUseLink = to === '/pools' && location.pathname.startsWith('/pools') && location.pathname !== '/pools';

  if (as === 'button') {
    return (
      <button
        className={baseClassName}
        onClick={onClick}
        aria-expanded={expanded}
      >
        {children}
      </button>
    );
  }

  if (isHomeLink) {
    return (
      <a href="/" className={baseClassName} onClick={onClick}>
        {children}
      </a>
    );
  }

  if (isExternal && to) {
    return (
      <ExternalLink href={to} className={baseClassName}>
        {children}
      </ExternalLink>
    );
  }

  if (to?.startsWith('http')) {
    return (
      <ExternalLink href={to} className={baseClassName}>
        {children}
      </ExternalLink>
    );
  }

  if (shouldUseLink && to) {
    return (
      <Link
        className={baseClassName}
        to={to}
        onClick={handleClick}
        style={{ color: '#fff' }}
      >
        {children}
      </Link>
    );
  }

  return to ? (
    <NavLink
      className={({ isActive }) =>
        `${baseClassName} ${isActive ? 'active' : ''}`
      }
      to={to}
      onClick={handleClick}
    >
      {children}
    </NavLink>
  ) : null;
}
