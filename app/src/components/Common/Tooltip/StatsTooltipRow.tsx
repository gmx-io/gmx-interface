import cx from 'classnames';
import { ReactNode } from 'react';

export type StatsTooltipRowProps = {
  textClassName?: string;
  labelClassName?: string;
  label?: string | ReactNode;
  value?: number | string | string[] | number[] | ReactNode;
  orderFeePctStr?: string;
  showDollar?: boolean;
  unit?: string;
  showColon?: boolean;
};

export default function StatsTooltipRow({
  label,
  value,
  orderFeePctStr,
  textClassName = 'text-white',
  labelClassName = 'text-[#A3A3A3]',
  showDollar = true,
  unit,
  showColon = true,
}: StatsTooltipRowProps) {
  function renderValue() {
    if (Array.isArray(value)) {
      return (
        <ul className="m-0 list-none p-0 text-white">
          {value.map((v, i) => (
            <li className={cx('pt-1 text-right', textClassName)} key={i}>
              {v}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <span className={cx('break-all text-right', textClassName)}>
        {showDollar && '$'}
        {value}
        {unit || ''}
      </span>
    );
  }

  function renderLabel() {
    if (typeof label === 'string') {
      return showColon ? `${label}:` : label;
    }

    return label;
  }

  return (
    <div>
      {orderFeePctStr ? (
        <div>
          <div className={cx('grid-cols-tooltip mb-3 grid', textClassName)}>
            <span className={cx('mr-2', labelClassName)}>{renderLabel()}</span>
            {renderValue()}
          </div>
          <div className={cx('grid-cols-tooltip mb-3 grid', textClassName)}>
            <span className={cx('mr-2 text-[#A3A3A3]')}>
              ({orderFeePctStr})
            </span>
          </div>
        </div>
      ) : (
        <div className={cx('grid-cols-tooltip leading-[2.3rem] grid', textClassName)}>
          <span className={cx('mr-2', labelClassName)}>{renderLabel()}</span>
          {renderValue()}
        </div>
      )}
    </div>
  );
}
