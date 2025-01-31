import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import NumberInput from "components/NumberInput/NumberInput";
import { getSwapDebugSettings, setSwapDebugSetting } from "config/externalSwaps";
import { useState } from "react";

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
    <div className="mb-8 mt-16">
      <div className="cursor-pointer text-14 underline" onClick={() => setIsShown((old) => !old)}>
        {isShown ? "Hide" : "Show"} Debug Swaps
      </div>
      {isShown && (
        <div className="mt-8">
          <div className="divider"></div>
          <div className="max-h-180 mb-16 flex flex-col overflow-auto py-8">
            <Checkbox
              isChecked={debugSettings.forceExternalSwaps}
              setIsChecked={(checked) => {
                setSwapDebugSetting("forceExternalSwaps", checked);
                updateDebugSettings();
              }}
            >
              <Trans>Force External Swaps</Trans>
            </Checkbox>
            <br />
            <div className="App-settings-row">
              <div>
                <Trans>Swap Price Impact for External Swap Threshold</Trans>
              </div>
              <div className="App-slippage-tolerance-input-container">
                <div className="App-slippage-tolerance-input-minus">-</div>
                <NumberInput
                  className="App-slippage-tolerance-input with-minus"
                  value={(-debugSettings.swapPriceImpactForExternalSwapThresholdBps).toString()}
                  onValueChange={(e) => {
                    const value = -BigInt(e.target.value);
                    setSwapDebugSetting("swapPriceImpactForExternalSwapThresholdBps", value);
                    updateDebugSettings();
                  }}
                  placeholder="15"
                />
                <div className="App-slippage-tolerance-input-percent">bps</div>
              </div>
            </div>
            <div className="App-settings-row">
              <div>
                <Trans>Auto Swap Fallback Max Fees</Trans>
              </div>
              <div className="App-slippage-tolerance-input-container">
                <div className="App-slippage-tolerance-input-minus">-</div>
                <NumberInput
                  className="App-slippage-tolerance-input with-minus"
                  value={(-debugSettings.autoSwapFallbackMaxFeesBps).toString()}
                  onValueChange={(e) => {
                    const value = -BigInt(e.target.value);
                    setSwapDebugSetting("autoSwapFallbackMaxFeesBps", value);
                    updateDebugSettings();
                  }}
                  placeholder="15"
                />
                <div className="App-slippage-tolerance-input-percent">bps</div>
              </div>
            </div>
            <div className="divider"></div>
          </div>
        </div>
      )}
    </div>
  );
}
