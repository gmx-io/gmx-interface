import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { useChainId } from "lib/chains";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import GmxRoundedWhiteIcon from "img/ic_gmx_rounded_white.svg?react";

import { BUY_GMX_MODAL_LINKS } from "./buyGmxModalConfig";

export function BuyGmxModal({
  isVisible,
  setIsVisible,
}: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
}) {
  const { chainId } = useChainId();

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>Buy GMX</Trans>}
      contentClassName="w-[420px]"
      withMobileBottomPosition={true}
    >
      <div className="flex flex-col gap-16">
        <BuyGmxModalButton
          variant="primary"
          to="/trade/swap?from=usdc&to=gmx"
          icon={<GmxRoundedWhiteIcon className="size-20" />}
          newTab={false}
        >
          <Trans>Buy GMX directly</Trans>
        </BuyGmxModalButton>
        <div className="flex flex-col gap-8">
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Buy on other platforms</Trans>
          </span>
          <div className="grid grid-cols-2 gap-12">
            {BUY_GMX_MODAL_LINKS.map((button) => {
              const link = button.getLink(chainId);

              return (
                <BuyGmxModalButton key={button.id} variant="secondary" icon={button.icon} to={link} newTab>
                  {button.label}
                </BuyGmxModalButton>
              );
            })}
          </div>
        </div>
      </div>
    </ModalWithPortal>
  );
}

export function BuyGmxModalButton({
  to,
  icon,
  children,
  variant,
  newTab,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  variant: "primary" | "secondary";
  newTab: boolean;
}) {
  return (
    <Button
      variant={variant}
      className="w-full !justify-between !py-10 px-16 text-14 normal-nums"
      to={to}
      newTab={newTab}
      showExternalLinkArrow={false}
    >
      <span className="flex items-center gap-8">
        {icon}
        {children}
      </span>
      <ArrowRightIcon className="size-20" />
    </Button>
  );
}
