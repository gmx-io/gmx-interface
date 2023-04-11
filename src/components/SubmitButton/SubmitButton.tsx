import React, { ReactNode } from "react";
import cx from "classnames";
import { useWeb3React } from "@web3-react/core";
import { t } from "@lingui/macro";
import Button from "components/Button/Button";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  authRequired?: boolean;
  onClick?: () => void;
  onConnectWallet?: () => void;
};

type ButtonState = {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export const SubmitButton = React.forwardRef<HTMLButtonElement, Props>(function SubmitButton(p, ref) {
  const { authRequired, onConnectWallet, children, disabled, onClick, className, ...htmlButtonProps } = p;
  const { active } = useWeb3React();

  const buttonState = getButtonState();

  function getButtonState(): ButtonState {
    if (p.authRequired && !active) {
      return {
        children: t`Connect wallet`,
        onClick: p.onConnectWallet,
        disabled: false,
      };
    }

    return {
      children: p.children,
      disabled: p.disabled,
      onClick: p.onClick,
    };
  }

  return (
    <Button
      ref={ref}
      variant="primary-action"
      className={cx("w-100", className)}
      onClick={buttonState.onClick}
      disabled={buttonState.disabled}
      {...htmlButtonProps}
    >
      {buttonState.children}
    </Button>
  );
});
