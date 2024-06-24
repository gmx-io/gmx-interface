import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_ALLOWED_SLIPPAGE_BPS, EXECUTION_FEE_CONFIG_V2 } from "config/chains";
import { isDevelopment } from "config/env";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import Tooltip from "components/Tooltip/Tooltip";
import { useKey } from "react-use";

import "./SettingsModal.scss";

export function SettingsModal({
  isSettingsVisible,
  setIsSettingsVisible,
}: {
  isSettingsVisible: boolean;
  setIsSettingsVisible: (value: boolean) => void;
}) {
  const settings = useSettings();
  const { chainId } = useChainId();

  const [slippageAmount, setSlippageAmount] = useState<string>("0");
  const [executionFeeBufferBps, setExecutionFeeBufferBps] = useState<string>("0");
  const [isPnlInLeverage, setIsPnlInLeverage] = useState(false);
  const [showPnlAfterFees, setShowPnlAfterFees] = useState(true);
  const [shouldDisableValidationForTesting, setShouldDisableValidationForTesting] = useState(false);
  const [showDebugValues, setShowDebugValues] = useState(false);

  useEffect(() => {
    if (!isSettingsVisible) return;

    const slippage = parseInt(String(settings.savedAllowedSlippage));
    setSlippageAmount(String(roundToTwoDecimals((slippage / BASIS_POINTS_DIVISOR) * 100)));
    if (settings.executionFeeBufferBps !== undefined) {
      const bps = settings.executionFeeBufferBps;
      setExecutionFeeBufferBps(String(roundToTwoDecimals((bps / BASIS_POINTS_DIVISOR) * 100)));
    }
    setIsPnlInLeverage(settings.isPnlInLeverage);
    setShowPnlAfterFees(settings.showPnlAfterFees);
    setShowDebugValues(settings.showDebugValues);
    setShouldDisableValidationForTesting(settings.shouldDisableValidationForTesting);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsVisible]);

  const saveAndCloseSettings = useCallback(() => {
    const slippage = parseFloat(String(slippageAmount));
    if (isNaN(slippage)) {
      helperToast.error(t`Invalid slippage value`);
      return;
    }
    if (slippage > 5) {
      helperToast.error(t`Slippage should be less than -5%`);
      return;
    }
    const basisPoints = roundToTwoDecimals((slippage * BASIS_POINTS_DIVISOR) / 100);
    if (parseInt(String(basisPoints)) !== parseFloat(String(basisPoints))) {
      helperToast.error(t`Max slippage precision is -0.01%`);
      return;
    }

    settings.setSavedAllowedSlippage(basisPoints);

    if (settings.shouldUseExecutionFeeBuffer) {
      const executionFeeBuffer = parseFloat(String(executionFeeBufferBps));
      if (isNaN(executionFeeBuffer) || executionFeeBuffer < 0) {
        helperToast.error(t`Invalid network fee buffer value`);
        return;
      }
      const nextExecutionBufferFeeBps = roundToTwoDecimals((executionFeeBuffer * BASIS_POINTS_DIVISOR) / 100);

      if (parseInt(String(nextExecutionBufferFeeBps)) !== parseFloat(String(nextExecutionBufferFeeBps))) {
        helperToast.error(t`Max network fee buffer precision is 0.01%`);
        return;
      }

      settings.setExecutionFeeBufferBps(nextExecutionBufferFeeBps);
    }

    settings.setIsPnlInLeverage(isPnlInLeverage);
    settings.setShowPnlAfterFees(showPnlAfterFees);
    settings.setShouldDisableValidationForTesting(shouldDisableValidationForTesting);
    settings.setShowDebugValues(showDebugValues);
    setIsSettingsVisible(false);
  }, [
    settings,
    slippageAmount,
    executionFeeBufferBps,
    isPnlInLeverage,
    showPnlAfterFees,
    shouldDisableValidationForTesting,
    showDebugValues,
    setIsSettingsVisible,
  ]);

  useKey(
    "Enter",
    () => {
      if (isSettingsVisible) {
        saveAndCloseSettings();
      }
    },
    {},
    [isSettingsVisible, saveAndCloseSettings]
  );

  return (
    <Modal
      className="App-settings"
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
    >
      <div className="App-settings-row">
        <div>
          <Trans>Allowed Slippage</Trans>
        </div>
        <div className="App-slippage-tolerance-input-container">
          <div className="App-slippage-tolerance-input-minus muted">-</div>
          <NumberInput
            className="App-slippage-tolerance-input with-minus"
            value={slippageAmount}
            onValueChange={(e) => setSlippageAmount(e.target.value)}
            placeholder="0.3"
          />
          <div className="App-slippage-tolerance-input-percent">%</div>
        </div>
        {parseFloat(slippageAmount) < (DEFAULT_ALLOWED_SLIPPAGE_BPS / BASIS_POINTS_DIVISOR) * 100 && (
          <AlertInfo type="warning">
            <Trans>
              Allowed Slippage below {(DEFAULT_ALLOWED_SLIPPAGE_BPS / BASIS_POINTS_DIVISOR) * 100}% may result in failed
              orders.
            </Trans>
          </AlertInfo>
        )}
      </div>
      {settings.shouldUseExecutionFeeBuffer && (
        <div className="App-settings-row">
          <div>
            <Tooltip
              handle={<Trans>Max Network Fee Buffer</Trans>}
              renderContent={() => (
                <div>
                  <Trans>
                    The Max Network Fee is set to a higher value to handle potential increases in gas price during order
                    execution. Any excess network fee will be refunded to your account when the order is executed. Only
                    applicable to GMX V2.
                  </Trans>
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2#execution-fee">Read more</ExternalLink>
                </div>
              )}
            />
          </div>
          <div className="App-slippage-tolerance-input-container">
            <NumberInput
              className="App-slippage-tolerance-input"
              value={executionFeeBufferBps}
              onValueChange={(e) => setExecutionFeeBufferBps(e.target.value)}
              placeholder="10"
            />
            <div className="App-slippage-tolerance-input-percent">%</div>
          </div>
          {parseFloat(executionFeeBufferBps) <
            (EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps! / BASIS_POINTS_DIVISOR) * 100 && (
            <div className="mb-15">
              <AlertInfo type="warning">
                <Trans>
                  Max Network Fee buffer below{" "}
                  {(EXECUTION_FEE_CONFIG_V2[chainId].defaultBufferBps! / BASIS_POINTS_DIVISOR) * 100}% may result in
                  failed orders.
                </Trans>
              </AlertInfo>
            </div>
          )}
        </div>
      )}
      <div className="Exchange-settings-row">
        <Checkbox isChecked={showPnlAfterFees} setIsChecked={setShowPnlAfterFees}>
          <Trans>Display PnL after fees</Trans>
        </Checkbox>
      </div>
      <div className="Exchange-settings-row">
        <Checkbox isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
          <Trans>Include PnL in leverage display</Trans>
        </Checkbox>
      </div>
      <div className="Exchange-settings-row chart-positions-settings">
        <Checkbox isChecked={settings.shouldShowPositionLines} setIsChecked={settings.setShouldShowPositionLines}>
          <span>
            <Trans>Chart positions</Trans>
          </span>
        </Checkbox>
      </div>
      {isDevelopment() && (
        <div className="Exchange-settings-row">
          <Checkbox isChecked={shouldDisableValidationForTesting} setIsChecked={setShouldDisableValidationForTesting}>
            <Trans>Disable order validations</Trans>
          </Checkbox>
        </div>
      )}

      {isDevelopment() && (
        <div className="Exchange-settings-row">
          <Checkbox isChecked={showDebugValues} setIsChecked={setShowDebugValues}>
            <Trans>Show debug values</Trans>
          </Checkbox>
        </div>
      )}

      <Button variant="primary-action" className="mt-15 w-full" onClick={saveAndCloseSettings}>
        <Trans>Save</Trans>
      </Button>
    </Modal>
  );
}
