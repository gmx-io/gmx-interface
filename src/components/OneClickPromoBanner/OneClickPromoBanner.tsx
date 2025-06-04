import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

import { getIsFlagEnabled } from "config/ab";
import { getOneClickTradingPromoHiddenKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useIsOutOfGasPaymentBalance } from "domain/synthetics/express/useIsOutOfGasPaymentBalance";
import { useChainId } from "lib/chains";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import OneClickIcon from "img/ic_one_click.svg?react";

export function OneClickPromoBanner({ openSettings, isShort }: { openSettings: () => void; isShort?: boolean }) {
  const { chainId } = useChainId();
  const { expressOrdersEnabled, setExpressOrdersEnabled } = useSettings();
  const [isOneClickPromoHidden, setIsOneClickPromoHidden] = useLocalStorage(
    getOneClickTradingPromoHiddenKey(chainId),
    false
  );

  const isOutOfGasPaymentBalance = useIsOutOfGasPaymentBalance();

  const shouldShow = getIsFlagEnabled("testOneClickPromo") && !isOneClickPromoHidden && !expressOrdersEnabled;

  const onClickEnable = useCallback(() => {
    openSettings();
    if (!isOutOfGasPaymentBalance) {
      setTimeout(() => {
        setExpressOrdersEnabled(true);
        setIsOneClickPromoHidden(true);
      }, 500);
    }
  }, [isOutOfGasPaymentBalance, openSettings, setExpressOrdersEnabled, setIsOneClickPromoHidden]);

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
        {isShort ? <Trans>Try Express</Trans> : <Trans>Try Express Trading</Trans>}
      </div>
    </ColorfulBanner>
  );
}
