import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

import { getIsFlagEnabled } from "config/ab";
import { getOneClickTradingPromoHiddenKey } from "config/localStorage";
import { useChainId } from "lib/chains";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickPromoBanner({ openSettings, isShort }: { openSettings: () => void; isShort?: boolean }) {
  const { chainId } = useChainId();
  const [isOneClickPromoHidden, setIsOneClickPromoHidden] = useLocalStorage(
    getOneClickTradingPromoHiddenKey(chainId),
    false
  );

  const shouldShow = getIsFlagEnabled("testOneClickPromo") && !isOneClickPromoHidden;

  const onClickEnable = useCallback(() => {
    openSettings();
  }, [openSettings]);

  if (!shouldShow) {
    return null;
  }

  return (
    <ColorfulBanner
      color="blue"
      icon={<OneClickIcon className="-mt-6 ml-2" />}
      onClose={() => setIsOneClickPromoHidden(true)}
      onClick={onClickEnable}
      className="min-w-[180px]"
    >
      <div className="clickable ml-6 mr-8">
        {isShort ? <Trans>Try Express 1CT</Trans> : <Trans>Try Express One-Click Trading</Trans>}
      </div>
    </ColorfulBanner>
  );
}
