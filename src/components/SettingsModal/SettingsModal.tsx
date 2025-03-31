import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useKey } from "react-use";

import { getIsFlagEnabled } from "config/ab";
import { isDevelopment } from "config/env";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import Button from "components/Button/Button";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { ExpressTradingEnabledBanner } from "components/ExpressTradingEnabledBanner/ExpressTradingEnabledBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GasPaymentTokenSelector } from "components/GasPaymentTokenSelector/GasPaymentTokenSelector";
import { SlideModal } from "components/Modal/SlideModal";
import { OldSubaccountWithdraw } from "components/OldSubaccountWithdraw/OldSubaccountWithdraw";
import { OneClickAdvancedSettings } from "components/OneClickAdvancedSettings/OneClickAdvancedSettings";
import PercentageInput from "components/PercentageInput/PercentageInput";
import TenderlySettings from "components/TenderlySettings/TenderlySettings";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function SettingsModal({
  isSettingsVisible,
  setIsSettingsVisible,
}: {
  isSettingsVisible: boolean;
  setIsSettingsVisible: (value: boolean) => void;
}) {
  const settings = useSettings();
  const subaccountState = useSubaccountContext();

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

    setSlippageAmount(String(settings.savedAllowedSlippage));

    if (settings.executionFeeBufferBps !== undefined) {
      setExecutionFeeBufferBps(String(settings.executionFeeBufferBps));
    }

    setIsPnlInLeverage(settings.isPnlInLeverage);
    setIsAutoCancelTPSL(settings.isAutoCancelTPSL);
    setShowPnlAfterFees(settings.showPnlAfterFees);
    setShowDebugValues(settings.showDebugValues);
    setShouldDisableValidationForTesting(settings.shouldDisableValidationForTesting);
    setIsLeverageSliderEnabled(settings.isLeverageSliderEnabled);

    subaccountState.refreshSubaccountData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsVisible]);

  const saveAndCloseSettings = useCallback(() => {
    const slippage = parseFloat(String(slippageAmount));
    if (isNaN(slippage)) {
      helperToast.error(t`Invalid slippage value`);
      return;
    }

    if (slippage > 500) {
      helperToast.error(t`Slippage should be less than -5%`);
      return;
    }

    const basisPoints = roundToTwoDecimals(slippage);
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
      const nextExecutionBufferFeeBps = roundToTwoDecimals(executionFeeBuffer);

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

  const handleExpressOrdersToggle = (enabled: boolean) => {
    settings.setExpressOrdersEnabled(enabled);
    if (!enabled && subaccountState.subaccount) {
      subaccountState.tryDisableSubaccount().catch(() => {
        settings.setExpressOrdersEnabled(true);
      });
    }
  };

  const handleOneClickTradingToggle = (enabled: boolean) => {
    if (enabled) {
      subaccountState.tryEnableSubaccount();
    } else {
      subaccountState.tryDisableSubaccount();
    }
  };

  return (
    <SlideModal
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
      qa="settings-modal"
      className="text-body-medium"
      desktopContentClassName="w-[400px]"
    >
      <div className="flex flex-col">
        <h1 className="muted">
          <Trans>Trading Settings</Trans>
        </h1>
        <div className="mt-16">
          <SettingsSection>
            <ToggleSwitch isChecked={settings.expressOrdersEnabled} setIsChecked={handleExpressOrdersToggle}>
              <TooltipWithPortal
                content={
                  <Trans>
                    Express Trading simplifies your trades on GMX. Instead of sending transactions directly and paying
                    gas fees in ETH/AVAX, you sign secure off-chain messages.
                    <br />
                    <br />
                    These messages are then processed on-chain for you, which helps reduce issues with network
                    congestion and RPC errors.
                  </Trans>
                }
                handle={<Trans>Express Trading</Trans>}
              />
            </ToggleSwitch>

            {settings.expressOrdersEnabled && <ExpressTradingEnabledBanner />}

            <ToggleSwitch
              isChecked={Boolean(subaccountState.subaccount?.optimisticActive)}
              setIsChecked={handleOneClickTradingToggle}
            >
              <TooltipWithPortal
                content={<Trans>One-Click Trading requires Express Trading to function.</Trans>}
                handle={<Trans>One-Click Trading</Trans>}
              />
            </ToggleSwitch>

            <OldSubaccountWithdraw />

            {settings.oneClickTradingEnabled && <OneClickAdvancedSettings />}
          </SettingsSection>

          {settings.expressOrdersEnabled && (
            <SettingsSection className="mt-2">
              <div>
                <Trans>Gas Payment Token</Trans>
              </div>
              <GasPaymentTokenSelector
                currentTokenAddress={settings.gasPaymentTokenAddress}
                onSelectToken={settings.setGasPaymentTokenAddress}
              />
            </SettingsSection>
          )}

          <SettingsSection className="mt-2">
            <InputSetting
              title={<Trans>Default Allowed Slippage</Trans>}
              description={
                <Trans>
                  The maximum percentage difference between your specified price and execution price when placing
                  orders.
                </Trans>
              }
              defaultValue={DEFAULT_SLIPPAGE_AMOUNT}
              value={parseFloat(slippageAmount)}
              onChange={(value) => setSlippageAmount(String(value))}
            />

            <InputSetting
              title={<Trans>Max Network Fee Buffer</Trans>}
              description={
                <div>
                  <Trans>
                    The Max Network Fee is set to a higher value to handle potential increases in gas price during order
                    execution. Any excess network fee will be refunded to your account when the order is executed. Only
                    applicable to GMX V2.
                  </Trans>
                  <br />
                  <br />
                  <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#network-fee-buffer">Read more</ExternalLink>
                </div>
              }
              defaultValue={30}
              value={parseFloat(executionFeeBufferBps)}
              onChange={(value) => setExecutionFeeBufferBps(String(value))}
            />

            <ToggleSwitch isChecked={isAutoCancelTPSL} setIsChecked={setIsAutoCancelTPSL}>
              <TooltipWithPortal
                content={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Trans>
                      Take Profit and Stop Loss orders will be automatically cancelled when the associated position is
                      completely closed. This will only affect newly created TP/SL orders.
                    </Trans>
                    <br />
                    <br />
                    <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#auto-cancel-tp--sl">
                      Read more
                    </ExternalLink>
                  </div>
                }
                handle={<Trans>Auto-Cancel TP/SL</Trans>}
              />
            </ToggleSwitch>

            {getIsFlagEnabled("testExternalSwap") && (
              <ToggleSwitch isChecked={settings.externalSwapsEnabled} setIsChecked={settings.setExternalSwapsEnabled}>
                <Trans>Enable external swaps</Trans>
              </ToggleSwitch>
            )}
          </SettingsSection>

          <div className="divider mt-16"></div>

          <h1 className="muted mt-16">
            <Trans>Display Settings</Trans>
          </h1>

          <SettingsSection className="mt-16 gap-16">
            <ToggleSwitch isChecked={isLeverageSliderEnabled} setIsChecked={setIsLeverageSliderEnabled}>
              <Trans>Show Leverage Slider</Trans>
            </ToggleSwitch>

            <ToggleSwitch isChecked={showPnlAfterFees} setIsChecked={setShowPnlAfterFees}>
              <Trans>Display PnL After Fees</Trans>
            </ToggleSwitch>

            <ToggleSwitch isChecked={isPnlInLeverage} setIsChecked={setIsPnlInLeverage}>
              <Trans>Include PnL In Leverage Display</Trans>
            </ToggleSwitch>
          </SettingsSection>
        </div>

        {isDevelopment() && (
          <>
            <div className="divider mt-16"></div>

            <h1 className="muted mt-16">
              <Trans>Debug Settings</Trans>
            </h1>

            <SettingsSection className="mt-16">
              <ToggleSwitch isChecked={showDebugValues} setIsChecked={setShowDebugValues}>
                <Trans>Show debug values</Trans>
              </ToggleSwitch>

              <AbFlagSettings />

              <DebugSwapsSettings />

              <TenderlySettings isSettingsVisible={isSettingsVisible} />
            </SettingsSection>
          </>
        )}
      </div>
      <div className="mt-24">
        <Button variant="primary-action" className="w-full" onClick={saveAndCloseSettings}>
          <Trans>Save</Trans>
        </Button>
      </div>
    </SlideModal>
  );
}

function SettingsSection({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-16 rounded-4 bg-cold-blue-900 p-16", className)}>{children}</div>;
}

function InputSetting({
  title,
  description,
  defaultValue,
  value,
  onChange,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  defaultValue: number;
  value?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const titleComponent = <span className="text-14 font-medium">{title}</span>;

  const titleWithDescription = description ? (
    <TooltipWithPortal position="bottom" content={description}>
      {titleComponent}
    </TooltipWithPortal>
  ) : (
    titleComponent
  );

  return (
    <div className={cx("flex items-center justify-between", className)}>
      <div className="mr-8">{titleWithDescription}</div>
      <PercentageInput defaultValue={defaultValue} value={value} onChange={onChange} tooltipPosition="bottom" />
    </div>
  );
}
