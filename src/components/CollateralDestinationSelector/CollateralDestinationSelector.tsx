import { Trans } from "@lingui/macro";
import cx from "classnames";

import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";

import GmxRoundedIcon from "img/ic_gmx_rounded.svg?react";
import ArbitrumIcon from "img/tokens/ic_arbitrum.svg?react";

interface CollateralDestinationSelectorProps {
  isReceiveToGmxAccount: boolean;
  onChangeDestination: (isGmxAccount: boolean) => void;
  desktopPanelClassName?: string;
}

export function CollateralDestinationSelector({
  isReceiveToGmxAccount,
  onChangeDestination,
  desktopPanelClassName = "w-[200px]",
}: CollateralDestinationSelectorProps) {
  return (
    <SelectorBase
      modalLabel="Send remaining collateral to"
      desktopPanelClassName={desktopPanelClassName}
      wrapperClassName="text-typography-primary"
      label={
        <div className="flex items-center gap-4">
          {isReceiveToGmxAccount ? <GmxRoundedIcon className="size-20" /> : <ArbitrumIcon className="size-20" />}
          <span className="text-13 font-medium">
            {isReceiveToGmxAccount ? <Trans>GMX Account</Trans> : <Trans>Arbitrum wallet</Trans>}
          </span>
        </div>
      }
    >
      <div className="flex flex-col py-6">
        <CollateralDestinationOption
          isGmxBalance={false}
          isSelected={!isReceiveToGmxAccount}
          onClick={() => onChangeDestination(false)}
        />
        <CollateralDestinationOption
          isGmxBalance
          isSelected={isReceiveToGmxAccount}
          onClick={() => onChangeDestination(true)}
        />
      </div>
    </SelectorBase>
  );
}

function CollateralDestinationOption({
  isGmxBalance,
  isSelected,
  onClick,
}: {
  isGmxBalance: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx("flex cursor-pointer items-center gap-6 px-12 py-6 text-14 hover:bg-fill-surfaceHover", {
        "bg-slate-700": isSelected,
      })}
      onClick={() => {
        onClick();
        close();
      }}
    >
      {isGmxBalance ? <GmxRoundedIcon className="size-20" /> : <ArbitrumIcon className="size-20" />}
      <span>{isGmxBalance ? <Trans>GMX Account</Trans> : <Trans>Arbitrum wallet</Trans>}</span>
    </div>
  );
}
