import React, { ReactNode } from "react";
import cx from "classnames";
import { useWeb3React } from "@web3-react/core";
import { t } from "@lingui/macro";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  authRequired?: boolean;
  onConnectWallet?: () => void;
};

type ButtonState = {
  children: ReactNode;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
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
      };
    }

    return {
      children: p.children,
      disabled: p.disabled,
      onClick: p.onClick,
    };
  }

  return (
    <button
      ref={ref}
      className={cx("App-cta", "Exchange-swap-button", { muted: disabled }, className)}
      onClick={buttonState.onClick}
      disabled={buttonState.disabled}
      {...htmlButtonProps}
    >
      {buttonState.children}
    </button>
  );
});
