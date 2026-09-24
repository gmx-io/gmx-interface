import './PageTitle.scss';

import batch_0_novice from '@/img/batch_0_novice.svg';
import batch_1_herald from '@/img/batch_1_herald.svg';
import batch_2_guardian from '@/img/batch_2_guardian.svg';
import batch_3_crusader from '@/img/batch_3_crusader.svg';
import batch_4_archon from '@/img/batch_4_archon.svg';
import batch_5_legend from '@/img/batch_5_legend.svg';
import batch_6_ancient from '@/img/batch_6_ancient.svg';
import batch_7_divine from '@/img/batch_7_divine.svg';
import batch_8_immortal from '@/img/batch_8_immortal.svg';
import batch_9_celestial from '@/img/batch_9_celestial.svg';
import icon_gmx_solana from '@/img/logo_gmx_solana_40.svg';
import cx from 'classnames';
import { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  titleClassName?: string;
  subtitle?: ReactNode;
  className?: string;
  isTop?: boolean;
  showNetworkIcon?: boolean;
  afterTitle?: ReactNode;
  qa?: string;
  batchRank?: number;
};

export default function PageTitle({
  title,
  titleClassName,
  subtitle,
  className,
  isTop = false,
  showNetworkIcon = false,
  afterTitle,
  qa,
  batchRank,
}: Props) {
  const classNames = cx('Page-title-wrapper', className, { gapTop: !isTop });
  const titleClassNames = cx('Page-title__text text-h1', titleClassName)

  const batchIcons = {
    0: batch_0_novice,
    1: batch_1_herald,
    2: batch_2_guardian,
    3: batch_3_crusader,
    4: batch_4_archon,
    5: batch_5_legend,
    6: batch_6_ancient,
    7: batch_7_divine,
    8: batch_8_immortal,
    9: batch_9_celestial,
  };

  return (
    <div className={classNames} data-qa={qa}>
      <div className="Page-title-group">
        <h2 className={titleClassNames}>{title}</h2>
        {showNetworkIcon && (
          <>
            {batchRank !== undefined ? (
              <img
                className="Page-title__icon max-h-34"
                src={batchIcons[batchRank as keyof typeof batchIcons]}
                alt={`Batch Rank ${batchRank}`}
              />
            ) : (
              <img
                className="Page-title__icon max-h-34"
                src={icon_gmx_solana}
                alt="Platform Icon"
              />
            )}
          </>
        )}
        {afterTitle}
      </div>
      <div className="text-body-medium text-slate-100">{subtitle}</div>
    </div>
  );
}
