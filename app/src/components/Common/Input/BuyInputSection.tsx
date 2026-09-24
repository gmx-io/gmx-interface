import './BuyInputSection.scss';

import { NumberInput } from '@/components/Common/Input/NumberInput';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { INPUT_LABEL_SEPARATOR, PERCENTAGE_SUGGESTIONS } from '@/config/ui';
import { Trans } from '@lingui/macro';
import cx from 'classnames';
import React, { ChangeEvent, ReactNode, useRef, useState } from 'react';

type Props = {
  topLeftLabel: string;
  topLeftValue?: string;
  topRightLabel?: string;
  topRightValue?: string;
  onClickTopLeftLabel?: () => void;
  inputValue?: number | string;
  onInputValueChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onClickMax?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  showMaxButton?: boolean;
  staticInput?: boolean;
  children?: ReactNode;
  showPercentSelector?: boolean;
  onPercentChange?: (percentage: number) => void;
  preventFocusOnLabelClick?: 'left' | 'right' | 'both';
  qa?: string;
  decimalPlaces?: number;
};

export default function BuyInputSection(props: Props) {
  const {
    topLeftLabel,
    topLeftValue,
    topRightLabel,
    topRightValue,
    inputValue,
    onInputValueChange,
    onClickMax,
    onFocus,
    onBlur,
    showMaxButton,
    staticInput,
    children,
    showPercentSelector,
    onPercentChange,
    preventFocusOnLabelClick,
    qa,
    decimalPlaces,
  } = props;
  const [isPercentSelectorVisible, setIsPercentSelectorVisible] =
    useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gmw402Enabled = getGmw402Enabled();

  function handleOnFocus() {
    setIsInputFocused(true);
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(true);
    }
    if (onFocus) onFocus();
  }

  function handleOnBlur() {
    setIsInputFocused(false);
    if (showPercentSelector && onPercentChange) {
      setIsPercentSelectorVisible(false);
    }
    if (onBlur) onBlur();
  }

  function handleBoxClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const labelElement = target.closest('[data-label]');
    const labelClicked = labelElement
      ? labelElement.getAttribute('data-label')
      : null;

    const shouldPreventFocus =
      preventFocusOnLabelClick === labelClicked ||
      preventFocusOnLabelClick === 'both';
    const isMaxButtonClicked = target.classList.contains('Exchange-swap-max');

    if (!shouldPreventFocus && !isMaxButtonClicked && inputRef.current) {
      inputRef.current.focus();
    }
  }

  function onUserInput(e: ChangeEvent<HTMLInputElement>) {
    if (onInputValueChange) {
      onInputValueChange(e);
    }
  }

  return (
    <div data-qa={qa}>
      <div
        className={cx('Exchange-swap-section buy-input', {
          focused: isInputFocused,
        })}
        onClick={handleBoxClick}
      >
        <div className="buy-input-top-row">
          <div data-label="left" className="text-[1.2rem] text-slate-100">
            {topLeftLabel}
            {/* {topLeftValue && `${INPUT_LABEL_SEPARATOR} ${topLeftValue}`} */}
          </div>
          {/* <div
            data-label="right"
            className={cx('align-right', { clickable: onClickTopRightLabel })}
            onClick={onClickTopRightLabel}
          >
            <span className="text-slate-100">{topRightLabel}</span>
            {topRightValue && (
              <span className="Exchange-swap-label">
                {topRightLabel ? INPUT_LABEL_SEPARATOR : ''}&nbsp;
                {topRightValue}
              </span>
            )}
          </div> */}
        </div>

        <div className="Exchange-swap-section-bottom">
          <div className="Exchange-swap-input-container">
            {!staticInput && (
              <NumberInput
                value={inputValue}
                className="Exchange-swap-input"
                inputRef={inputRef}
                onValueChange={onUserInput}
                onFocus={handleOnFocus}
                onBlur={handleOnBlur}
                placeholder="0.0"
                qa={qa ? qa + '-input' : undefined}
                decimalPlaces={gmw402Enabled ? decimalPlaces : undefined}
              />
            )}
            {staticInput && (
              <div className="InputSection-static-input">{inputValue}</div>
            )}
          </div>
          <div className="PositionEditor-token-symbol">{children}</div>
        </div>

        <div className="mt-[0.2rem] flex items-center justify-between">
          <div className="text-[1.2rem] text-[#A3A3A3]">
            {topLeftValue || '$0.00'}
          </div>
          <div data-label="right" className={cx('align-right')}>
            <span className="text-[1.2rem] text-slate-100">
              {topRightLabel}
            </span>
            {topRightValue && (
              <span className="Exchange-swap-label text-[1.2rem]">
                &nbsp;{topRightValue}
              </span>
            )}
            {showMaxButton && (
              <button
                type="button"
                className="Exchange-swap-max"
                onClick={onClickMax}
                data-qa="input-max"
              >
                <Trans>Max</Trans>
              </button>
            )}
          </div>
        </div>
      </div>
      {showPercentSelector && isPercentSelectorVisible && onPercentChange && (
        <ul className="PercentSelector">
          {PERCENTAGE_SUGGESTIONS.map((percentage) => (
            <li
              className="PercentSelector-item"
              key={percentage}
              onMouseDown={() => {
                onPercentChange?.(percentage);
                handleOnBlur();
              }}
              data-qa={`${qa}-percent-selector-${percentage}`}
            >
              {percentage}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
