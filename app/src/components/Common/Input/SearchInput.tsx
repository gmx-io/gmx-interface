import { t } from '@lingui/macro';
import cx from 'classnames';
import React, { useCallback, useState } from 'react';
import { useMedia } from 'react-use';

import { useOutsideClick } from '@/utils/lib/useOutsideClick';

import SearchIconComponent from '@/img/search.svg?react';
import CrossIconComponent from '@/img/cross.svg?react';

type Props = {
  value: string;
  setValue: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  placeholder?: string;
  size?: 's' | 'm';
  /**
   * If not provided, will be set to false on small screens
   */
  autoFocus?: boolean;
  qa?: string;
};

export default function SearchInput({
  value,
  setValue,
  onKeyDown,
  className,
  placeholder,
  autoFocus,
  size = 'm',
  qa = 'token-search-input',
}: Props) {
  const isSmallerScreen = useMedia('(max-width: 700px)');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, [setIsFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, [setIsFocused]);

  useOutsideClick(containerRef, handleBlur);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    [setValue]
  );

  const handleClear = useCallback(() => {
    setValue('');
    inputRef.current?.focus();
  }, [setValue]);

  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div
      className={cx(
        'relative flex items-center bg-transparent',
        'rounded-4 cursor-pointer border',
        {
          'border-cold-blue-500': isFocused,
          'border-gray-800': !isFocused,
        },
        className
      )}
      ref={containerRef}
    >
      <div className="absolute left-10 top-1/2 flex -translate-y-1/2 items-center">
        <SearchIconComponent
          height={16}
          width={16}
          onClick={handleClick}
          className={cx('transition-colors duration-200', {
            'text-slate-100': !isFocused,
            'text-white': isFocused,
          })}
        />
      </div>
      <input
        ref={inputRef}
        data-qa={qa}
        id="search-input-container"
        type="text"
        placeholder={placeholder ?? t`Search Token`}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={handleFocus}
        autoFocus={autoFocus ?? !isSmallerScreen}
        className={cx(
          'rounded-4 w-full bg-transparent',
          'placeholder-slate-100 focus:outline-none',
          {
            'text-body-medium py-5 pl-36': size === 'm',
            'text-body-small pl-34 pr-30 py-[8.5px]': size === 's',
          }
        )}
      />
      {value && (
        <button
          className={cx(
            'group absolute right-0 top-1/2 -translate-y-1/2',
            'flex items-center',
            {
              'pr-8': size === 'm',
              'pr-4': size === 's',
            }
          )}
          onClick={handleClear}
        >
          <div
            className={cx(
              'rounded-4 p-4',
              'text-slate-100 transition-colors duration-200',
              'group-hover:bg-slate-500/60 group-hover:text-slate-100',
              'group-active:bg-slate-500/80 group-active:text-slate-100'
            )}
          >
            <CrossIconComponent
              className={cx('w-16 transition-colors duration-200', {
                'text-slate-100': !isFocused,
                'text-white': isFocused,
              })}
            />
          </div>
        </button>
      )}
    </div>
  );
}
