import './ExternalLink.scss';

import cx from 'classnames';
import React from 'react';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  newTab?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  ariaLabel?: string;
}

const ExternalLink = React.forwardRef<HTMLAnchorElement, Props>(
  ({ href, children, className, newTab = true, onClick, ariaLabel }, ref) => {
    const classNames = cx('link-underline', className);
    const props = {
      href,
      className: classNames,
      onClick,
      ref,
      'aria-label': ariaLabel,
      ...(newTab
        ? {
            target: '_blank',
            rel: 'noopener noreferrer',
          }
        : {}),
    };
    return <a {...props}>{children}</a>;
  }
);

ExternalLink.displayName = 'ExternalLink';

export default ExternalLink;
