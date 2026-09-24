import './AlertInfo.scss';

import InfoIcon from '@/img/ic_info.svg';
import WarnIcon from '@/img/ic_warn.svg';
import cx from 'classnames';
import { ReactNode } from 'react';

interface Props {
  type: 'warning' | 'info';
  children: ReactNode;
  className?: string;
  compact?: boolean;
  /**
   * @default "text-gray-300"
   */
  textColor?: 'text-gray-300' | 'text-yellow-500';
}

export function AlertInfo({
  compact = false,
  children,
  type,
  textColor = 'text-gray-300',
  className,
}: Props) {
  const Icon = type === 'warning' ? WarnIcon : InfoIcon;
  return (
    <div className={cx('AlertInfo', { compact }, textColor, className)}>
      <div className="AlertInfo-icon">
        <img src={Icon} alt="Alert Icon" aria-label="Alert Icon" />
      </div>
      <div className={cx('AlertInfo-text')}>{children}</div>
    </div>
  );
}
