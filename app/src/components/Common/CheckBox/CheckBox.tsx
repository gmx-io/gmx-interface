import './CheckBox.scss';

import icon_partial_check from '@/img/ic_partial_checked.svg';
import cx from 'classnames';
import { ReactNode } from 'react';
import { ImCheckboxChecked, ImCheckboxUnchecked } from 'react-icons/im';

type Props = {
  isChecked?: boolean;
  setIsChecked?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  asRow?: boolean;
  isPartialChecked?: boolean;
  qa?: string;
};

export default function Checkbox(props: Props) {
  const {
    isChecked,
    setIsChecked,
    disabled,
    className,
    asRow,
    isPartialChecked,
  } = props;

  return (
    <div
      className={cx(
        'Checkbox',
        {
          disabled,
          selected: isChecked,
          fullRow: asRow,
          noLabel: !props.children,
        },
        className
      )}
      onClick={(event) => {
        setIsChecked?.(!isChecked);
        event.stopPropagation();
      }}
      data-qa={props.qa}
    >
      <span className="Checkbox-icon-wrapper">
        {isPartialChecked && (
          <img src={icon_partial_check} className="App-icon Checkbox-icon" />
        )}
        {isChecked && !isPartialChecked && (
          <ImCheckboxChecked className="App-icon Checkbox-icon active" />
        )}
        {!isChecked && !isPartialChecked && (
          <ImCheckboxUnchecked className="App-icon Checkbox-icon inactive" />
        )}
      </span>
      {props.children && (
        <span className="Checkbox-label">{props.children}</span>
      )}
    </div>
  );
}
