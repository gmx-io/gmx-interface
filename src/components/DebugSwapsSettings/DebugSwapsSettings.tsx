import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import {
  getSwapDebugSettings,
  setSwapDebugSetting,
  SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS,
} from "config/externalSwaps";

import { ExpandableRow } from "components/ExpandableRow";
import NumberInput from "components/NumberInput/NumberInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function DebugSwapsSettings() {
  const [isShown, setIsShown] = useState(false);
  const [debugSettings, setDebugSettings] = useState(getSwapDebugSettings());

  const toggleDebugSwaps = useCallback((value: boolean) => {
    setIsShown(value);
  }, []);

  const updateDebugSettings = () => {
    const updated = getSwapDebugSettings();

    if (updated) {
      setDebugSettings({ ...updated });
    }
  };

  if (!debugSettings) {
    return null;
  }

  return (
    <ExpandableRow
      open={isShown}
      title={t`Debug Swaps`}
      onToggle={toggleDebugSwaps}
      disableCollapseOnError={false}
      contentClassName="flex flex-col gap-16 pt-8"
      scrollIntoViewOnMobile
    >
      <div className="max-h-180 flex flex-col gap-16 overflow-auto pr-16">
        <ToggleSwitch
          isChecked={debugSettings.forceExternalSwaps}
          setIsChecked={(checked) => {
            setSwapDebugSetting("forceExternalSwaps", checked);
            updateDebugSettings();
          }}
        >
          <Trans>Force External Swaps</Trans>
        </ToggleSwitch>
        <ToggleSwitch
          isChecked={debugSettings.failExternalSwaps}
          setIsChecked={(checked) => {
            setSwapDebugSetting("failExternalSwaps", checked);
            updateDebugSettings();
          }}
        >
          <Trans>Fail External Swaps</Trans>
        </ToggleSwitch>
        <div>
          <div className="mb-8">
            <Trans>Swap Price Impact for External Swap Threshold</Trans>
          </div>
          <div className="relative">
            <div className="absolute left-11 top-1/2 -translate-y-1/2 text-typography-secondary">-</div>
            <NumberInput
              className="mb-8 mt-8 w-full rounded-4 border border-gray-700 pl-25"
              value={(-debugSettings.swapPriceImpactForExternalSwapThresholdBps).toString()}
              onValueChange={(e) => {
                const value = -BigInt(e.target.value);
                setSwapDebugSetting("swapPriceImpactForExternalSwapThresholdBps", value);
                updateDebugSettings();
              }}
              placeholder={SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS.toString()}
            />
            <div className="absolute right-11 top-1/2 -translate-y-1/2 text-right text-typography-secondary">bps</div>
          </div>
        </div>
      </div>
    </ExpandableRow>
  );
}
