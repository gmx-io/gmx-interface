import { t, Trans } from "@lingui/macro";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useKey } from "react-use";

import { EXECUTION_FEE_CONFIG_V2 } from "config/chains";
import { isDevelopment } from "config/env";
import { BASIS_POINTS_DIVISOR, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SlideModal } from "components/Modal/SlideModal";
import NumberInput from "components/NumberInput/NumberInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./SettingsModal.scss";
import Checkbox from "components/Checkbox/Checkbox";

const defaultSippageDisplay = (DEFAULT_SLIPPAGE_AMOUNT / BASIS_POINTS_DIVISOR) * 100;

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
  const [isAutoCancelTPSL, setIsAutoCancelTPSL] = useState(true);
  const [showPnlAfterFees, setShowPnlAfterFees] = useState(true);
  const [shouldDisableValidationForTesting, setShouldDisableValidationForTesting] = useState(false);
  const [showDebugValues, setShowDebugValues] = useState(false);
  const [isLeverageSliderEnabled, setIsLeverageSliderEnabled] = useState(false);

  useEffect(() => {
    if (!isSettingsVisible) return;

    const slippage = parseInt(String(settings.savedAllowedSlippage));
    setSlippageAmount(String(roundToTwoDecimals((slippage / BASIS_POINTS_DIVISOR) * 100)));
    if (settings.executionFeeBufferBps !== undefined) {
      const bps = settings.executionFeeBufferBps;
      setExecutionFeeBufferBps(String(roundToTwoDecimals((bps / BASIS_POINTS_DIVISOR) * 100)));
    }
    setIsPnlInLeverage(settings.isPnlInLeverage);
    setIsAutoCancelTPSL(settings.isAutoCancelTPSL);
    setShowPnlAfterFees(settings.showPnlAfterFees);
    setShowDebugValues(settings.showDebugValues);
    setShouldDisableValidationForTesting(settings.shouldDisableValidationForTesting);
    setIsLeverageSliderEnabled(settings.isLeverageSliderEnabled);

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
    settings.setIsAutoCancelTPSL(isAutoCancelTPSL);
    settings.setShowPnlAfterFees(showPnlAfterFees);
    settings.setShouldDisableValidationForTesting(shouldDisableValidationForTesting);
    settings.setShowDebugValues(showDebugValues);
    settings.setIsLeverageSliderEnabled(isLeverageSliderEnabled);

    setIsSettingsVisible(false);
  }, [
    slippageAmount,
    settings,
    isPnlInLeverage,
    isAutoCancelTPSL,
    showPnlAfterFees,
    shouldDisableValidationForTesting,
    showDebugValues,
    isLeverageSliderEnabled,
    setIsSettingsVisible,
    executionFeeBufferBps,
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
    <SlideModal
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
      qa="settings-modal"
      className="text-body-medium"
      desktopContentClassName="w-[380px]"
    >
      <div className="mb-8">
        <div>
          <Trans>Default Allowed Slippage</Trans>
        </div>
        <div className="relative">
          <div className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-100">-</div>
          <NumberInput
            className="mb-8 mt-8 w-full rounded-4 border border-gray-700 pl-25"
            value={slippageAmount}
            onValueChange={(e) => setSlippageAmount(e.target.value)}
            placeholder={defaultSippageDisplay.toString()}
          />

          <div className="absolute right-11 top-1/2 -translate-y-1/2 text-right text-slate-100">%</div>
        </div>
        {parseFloat(slippageAmount) < defaultSippageDisplay && (
          <AlertInfo type="warning">
            <Trans>Allowed Slippage below {defaultSippageDisplay}% may result in failed orders. orders.</Trans>
          </AlertInfo>
        )}
      </div>
      {settings.shouldUseExecutionFeeBuffer && (
        <div className="mb-8">
          <div>
            <Tooltip
              handle={<Trans>Max Network Fee Buffer</Trans>}
              content={
                <>
                  <Trans>
                    The Max Network Fee is set to a higher value to handle potential increases in gas price during order
                    execution. Any excess network fee will be refunded to your account when the order is executed. Only
                    applicable to GMX V2.
                  </Trans>
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#auto-cancel-tp--sl">Read more</ExternalLink>
                </>
              }
            />
          </div>
          <div className="relative">
            <NumberInput
              className="mb-8 mt-8 w-full rounded-4 border border-gray-700"
              value={executionFeeBufferBps}
              onValueChange={(e) => setExecutionFeeBufferBps(e.target.value)}
              placeholder="10"
            />
            <div className="absolute right-11 top-1/2 -translate-y-1/2 text-right text-slate-100">%</div>
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
      <div className="flex flex-col gap-16">
        <ToggleSwitch isChecked={isLeverageSliderEnabled} setIsChecked={setIsLeverageSliderEnabled}>
          <Trans>Show leverage slider</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={showPnlAfterFees} setIsChecked={setShowPnlAfterFees}>
          <Trans>Display PnL after fees</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
          <Trans>Include PnL in leverage display</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={isAutoCancelTPSL} setIsChecked={setIsAutoCancelTPSL}>
          <TooltipWithPortal
            handle={t`Auto-Cancel TP/SL`}
            content={
              <div onClick={(e) => e.stopPropagation()}>
                <Trans>
                  Take Profit and Stop Loss orders will be automatically cancelled when the associated position is
                  completely closed. This will only affect newly created TP/SL orders.
                </Trans>
                <br />
                <br />
                <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#auto-cancel-tp--sl">Read more</ExternalLink>.
              </div>
            }
          />
        </ToggleSwitch>

        <div className="hidden max-[1100px]:block">
          <ToggleSwitch isChecked={settings.shouldShowPositionLines} setIsChecked={settings.setShouldShowPositionLines}>
            <Trans>Chart positions</Trans>
          </ToggleSwitch>
        </div>

        <div className="Exchange-settings-row">
          <Checkbox isChecked={settings.externalSwapsEnabled} setIsChecked={settings.setExternalSwapsEnabled}>
            <Trans>Enable external swaps</Trans>
          </Checkbox>
        </div>

        {isDevelopment() && (
          <ToggleSwitch
            isChecked={shouldDisableValidationForTesting}
            setIsChecked={setShouldDisableValidationForTesting}
          >
            <Trans>Disable order validations</Trans>
          </ToggleSwitch>
        )}

        {isDevelopment() && (
          <ToggleSwitch isChecked={showDebugValues} setIsChecked={setShowDebugValues}>
            <Trans>Show debug values</Trans>
          </ToggleSwitch>
        )}

        {isDevelopment() && <AbFlagSettings />}

        {isDevelopment() && <DebugSwapsSettings />}

        {isDevelopment() && <TenderlySettings isSettingsVisible={isSettingsVisible} />}
      </div>

      <Button variant="primary-action" className="mt-15 w-full" onClick={saveAndCloseSettings}>
        <Trans>Save</Trans>
      </Button>
    </SlideModal>
  );
}

function TenderlySettings({ isSettingsVisible }: { isSettingsVisible: boolean }) {
  const {
    tenderlyAccountSlug,
    tenderlyProjectSlug,
    tenderlyAccessKey,
    tenderlySimulationEnabled,
    setTenderlyAccessKey,
    setTenderlyAccountSlug,
    setTenderlyProjectSlug,
    setTenderlySimulationEnabled,
  } = useSettings();

  const [accountSlug, setAccountSlug] = useState(tenderlyAccountSlug ?? "");
  const [projectSlug, setProjectSlug] = useState(tenderlyProjectSlug ?? "");
  const [accessKey, setAccessKey] = useState(tenderlyAccessKey ?? "");

  useEffect(() => {
    if (isSettingsVisible) {
      setAccountSlug(tenderlyAccountSlug ?? "");
      setProjectSlug(tenderlyProjectSlug ?? "");
      setAccessKey(tenderlyAccessKey ?? "");
    }
  }, [isSettingsVisible, tenderlyAccessKey, tenderlyAccountSlug, tenderlyProjectSlug]);

  return (
    <div>
      <br />
      <h1>Tenderly Settings</h1>
      <br />
      <TenderlyInput name="Account" placeholder="account" value={accountSlug} onChange={setTenderlyAccountSlug} />
      <TenderlyInput name="Project" placeholder="project" value={projectSlug} onChange={setTenderlyProjectSlug} />
      <TenderlyInput name="Access Key" placeholder="xxxx-xxxx-xxxx" value={accessKey} onChange={setTenderlyAccessKey} />
      <div className="">
        <ToggleSwitch isChecked={Boolean(tenderlySimulationEnabled)} setIsChecked={setTenderlySimulationEnabled}>
          <span className="">Simulate TXs</span>
        </ToggleSwitch>
      </div>
      <br />
      See{" "}
      <ExternalLink href="https://docs.tenderly.co/tenderly-sdk/intro-to-tenderly-sdk#how-to-get-the-account-name-project-slug-and-secret-key">
        Tenderly Docs
      </ExternalLink>
      .
    </div>
  );
}

function TenderlyInput({
  value,
  name,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  name: string;
  onChange: (value: string) => void;
}) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <p className="mb-12 flex items-center justify-between gap-6">
      <span>{name}</span>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="border-1 w-[280px] border border-stroke-primary px-5 py-4 text-12"
      />
    </p>
  );
}
