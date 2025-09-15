import { Trans } from "@lingui/macro";
import { useState } from "react";

import { getSwapDebugSettings, setSwapDebugSetting } from "config/externalSwaps";
import { SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS } from "config/externalSwaps";

import NumberInput from "components/NumberInput/NumberInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function DebugSwapsSettings() {
  const [isShown, setIsShown] = useState(false);
  const [debugSettings, setDebugSettings] = useState(getSwapDebugSettings());

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
    <div>
      <div className="cursor-pointer text-14 underline" onClick={() => setIsShown((old) => !old)}>
        {isShown ? "Hide" : "Show"} Debug Swaps
      </div>
      {isShown && (
        <div className="mt-8">
          <div className="divider"></div>
          <div className="max-h-180 mb-16 flex flex-col overflow-auto py-8">
            <ToggleSwitch
              isChecked={debugSettings.forceExternalSwaps}
              setIsChecked={(checked) => {
                setSwapDebugSetting("forceExternalSwaps", checked);
                updateDebugSettings();
              }}
            >
              <Trans>Force External Swaps</Trans>
            </ToggleSwitch>
            <br />
            <ToggleSwitch
              isChecked={debugSettings.failExternalSwaps}
              setIsChecked={(checked) => {
                setSwapDebugSetting("failExternalSwaps", checked);
                updateDebugSettings();
              }}
            >
              <Trans>Fail External Swaps</Trans>
            </ToggleSwitch>
            <br />
            <div className="mb-8">
              <div>
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
                <div className="absolute right-11 top-1/2 -translate-y-1/2 text-right text-typography-secondary">
                  bps
                </div>
              </div>
            </div>
            <div className="divider"></div>
          </div>
        </div>
      )}
    </div>
  );
}
