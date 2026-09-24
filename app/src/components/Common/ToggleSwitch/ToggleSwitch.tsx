import cx from 'classnames';
import { useCallback, type ReactNode } from 'react';

type Props = {
  isChecked: boolean;
  setIsChecked: (value: boolean) => void;
  className?: string;
  textClassName?: string;
  children?: ReactNode;
  disabled?: boolean;
};

export default function ToggleSwitch({
  isChecked,
  setIsChecked,
  className,
  disabled,
  children,
  textClassName,
}: Props) {
  const handleToggle = useCallback(() => {
    if (disabled) {
      return;
    }
    setIsChecked(!isChecked);
  }, [disabled, isChecked, setIsChecked]);

  return (
    <div className={cx('toggle-switch-wrapper', className)}>
      <span className={textClassName}>{children}</span>
      <div
        className={cx('toggle-switch', {
          checked: isChecked,
          disabled: disabled,
        })}
        onClick={handleToggle}
      >
        <div
          className={cx('toggle-switch-handle', {
            checked: isChecked,
          })}
        />
      </div>
    </div>
  );
}
