import cx from 'classnames';
import { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

interface Props<T> {
  options: T[];
  option: T;
  setOption?: (option: T) => void;
  onChange?: (option: T) => void;
  type?: 'block' | 'inline' | 'card';
  className?: string;
  optionLabels: {
    [opt: string]: ReactNode;
  };
  optionClassnames?: Record<
    string | number,
    {
      active?: string;
      regular?: string;
    }
  >;
  icons?: {
    [opt: string]: string;
  };
  qa?: string;
}

export default function Tab<T extends string>({
  options,
  option,
  setOption,
  onChange,
  type = 'block',
  className,
  optionLabels,
  optionClassnames,
  icons,
  qa,
}: Props<T>) {

  const onClick = useCallback(
    (opt: T) => {
      if (setOption) {
        setOption(opt);
      }
      if (onChange) {
        onChange(opt);
      }
    },
    [onChange, setOption]
  );

  const displayLabels = useMemo(() => {
    return optionLabels;
  }, [optionLabels]);

  const baseClasses =
    type === 'block'
      ? 'grid grid-flow-col overflow-hidden rounded-3 bg-[#181818] from-cold-blue-900 to-slate-500/40 text-[#A3A3A3] shadow-inner-light'
      : type === 'card'
      ? 'flex flex-row overflow-x-scroll whitespace-nowrap scrollbar-hide rounded-3 shadow-inner-light'
      : 'flex flex-row overflow-x-scroll whitespace-nowrap scrollbar-hide';

  const optionBaseClasses =
    type === 'block'
      ? 'px-8 py-8 text-center cursor-pointer hover:bg-[#1F1F1F] hover:text-white'
      : type === 'card'
      ? 'px-10 py-7 text-center rounded-8 cursor-pointer hover:bg-[#1F1F1F] hover:text-white mr-6'
      : 'inline-block mr-20 text-body-medium cursor-pointer hover:opacity-80 px-[2rem] py-[1.1rem] border-b-2 border-[transparent]';

  const optionActiveClasses =
    type === 'block'
      ? 'bg-primary-500 text-white pointer-events-none'
      : type === 'card'
      ? 'bg-[#1F1F1F] text-white pointer-events-none'
      : 'text-white pointer-events-none !border-[#FA7B4E]';

  return (
    <div
      data-qa={qa}
      className={cx('text-body-medium text-white/70', baseClasses, className)}
    >
      {options.map((opt) => {
        const className = optionClassnames && optionClassnames[opt];
        const label = displayLabels[opt] || opt;
        const isActive = opt === option;

        const optionClassName = isActive
          ? className?.active
          : className?.regular;

        return (
          <div
            className={cx(
              type === 'block' ? 'flex items-center justify-center' : '',
              optionBaseClasses,
              optionClassName,
              {
                [optionActiveClasses]: isActive,
              }
            )}
            onClick={() => onClick(opt)}
            key={opt}
            data-qa={`${qa}-tab-${opt}`}
          >
            {icons && icons[opt] && (
              <img
                className={cx('mr-5 min-h-14 min-w-14 scale-75 opacity-70', {
                  'opacity-100': isActive,
                })}
                src={icons[opt]}
                alt=""
              />
            )}
            {label}
          </div>
        );
      })}
    </div>
  );
}
