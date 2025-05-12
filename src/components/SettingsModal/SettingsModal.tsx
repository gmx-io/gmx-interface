import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { isDevelopment } from "config/env";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS } from "config/twap";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useIsOutOfGasPaymentBalance } from "domain/synthetics/express/useIsOutOfGasPaymentBalance";
import { useEnabledFeaturesRequest } from "domain/synthetics/features/useDisabledFeatures";
import { getIsSubaccountActive } from "domain/synthetics/subaccount";
import { MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "domain/synthetics/trade/twap/utils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { ExpressTradingEnabledBanner } from "components/ExpressTradingEnabledBanner/ExpressTradingEnabledBanner";
import { ExpressTradingGasTokenSwitchedBanner } from "components/ExpressTradingGasTokenSwitchedBanner.ts/ExpressTradingGasTokenSwithedBanner";
import { ExpressTradingOutOfGasBanner } from "components/ExpressTradingOutOfGasBanner.ts/ExpressTradingOutOfGasBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GasPaymentTokenSelector } from "components/GasPaymentTokenSelector/GasPaymentTokenSelector";
import { SlideModal } from "components/Modal/SlideModal";
import NumberInput from "components/NumberInput/NumberInput";
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
  const { chainId } = useChainId();
  const settings = useSettings();
  const { features } = useEnabledFeaturesRequest(chainId);
  const subaccountState = useSubaccountContext();

  const [numberOfParts, setNumberOfParts] = useState<number>();

  const isOutOfGasPaymentBalance = useIsOutOfGasPaymentBalance();

  useEffect(() => {
    if (!isSettingsVisible) return;

    subaccountState.refreshSubaccountData();

    if (settings.settingsWarningDotVisible) {
      settings.setSettingsWarningDotVisible(false);
    }

    setNumberOfParts(settings.savedTwapNumberOfParts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsVisible]);

  const onChangeSlippage = useCallback(
    (value: number) => {
      const slippage = parseFloat(String(value));
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
    },
    [settings]
  );

  const onChangeExecutionFeeBufferBps = useCallback(
    (value: number) => {
      const executionFeeBuffer = parseFloat(String(value));

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
    },
    [settings]
  );

  const onChangeTwapNumberOfParts = useCallback((value: number) => {
    const parsedValue = parseInt(String(value));

    setNumberOfParts(parsedValue);
  }, []);

  const onBlurTwapNumberOfParts = useCallback(() => {
    if (!numberOfParts || isNaN(numberOfParts) || numberOfParts < 0) {
      helperToast.error(t`Invalid TWAP number of parts value`);
      setNumberOfParts(settings.savedTwapNumberOfParts);
      return;
    }

    if (numberOfParts < MIN_TWAP_NUMBER_OF_PARTS || numberOfParts > MAX_TWAP_NUMBER_OF_PARTS) {
      helperToast.error(t`Number of parts must be between ${MIN_TWAP_NUMBER_OF_PARTS} and ${MAX_TWAP_NUMBER_OF_PARTS}`);
      setNumberOfParts(settings.savedTwapNumberOfParts);
      return;
    }

    settings.setSavedTWAPNumberOfParts(numberOfParts);
  }, [numberOfParts, settings]);

  const onClose = useCallback(() => {
    setIsSettingsVisible(false);
  }, [setIsSettingsVisible]);

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
            <ToggleSwitch
              disabled={!features?.relayRouterEnabled || (isOutOfGasPaymentBalance && !settings.expressOrdersEnabled)}
              isChecked={settings.expressOrdersEnabled}
              setIsChecked={handleExpressOrdersToggle}
            >
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
              isChecked={Boolean(subaccountState.subaccount && getIsSubaccountActive(subaccountState.subaccount))}
              setIsChecked={handleOneClickTradingToggle}
              disabled={
                !features?.subaccountRelayRouterEnabled || (isOutOfGasPaymentBalance && !subaccountState.subaccount)
              }
            >
              <TooltipWithPortal
                content={<Trans>One-Click Trading requires Express Trading to function.</Trans>}
                handle={<Trans>One-Click Trading</Trans>}
              />
            </ToggleSwitch>

            {isOutOfGasPaymentBalance && <ExpressTradingOutOfGasBanner onClose={onClose} />}

            {settings.expressTradingGasTokenSwitched && !isOutOfGasPaymentBalance && (
              <ExpressTradingGasTokenSwitchedBanner onClose={() => settings.setExpressTradingGasTokenSwitched(false)} />
            )}

            <OldSubaccountWithdraw />

            {Boolean(subaccountState.subaccount && getIsSubaccountActive(subaccountState.subaccount)) && (
              <OneClickAdvancedSettings />
            )}
          </SettingsSection>

          {settings.expressOrdersEnabled && (
            <SettingsSection className="mt-2">
              <div>
                <Trans>Gas Payment Token</Trans>
              </div>
              <GasPaymentTokenSelector
                curentTokenAddress={settings.gasPaymentTokenAddress}
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
              value={parseFloat(String(settings.savedAllowedSlippage))}
              onChange={onChangeSlippage}
              suggestions={EMPTY_ARRAY}
            />

            <InputSetting
              title={<Trans>TWAP Number of Parts</Trans>}
              description={
                <div>
                  <Trans>TWAP Number of Parts</Trans>
                </div>
              }
              defaultValue={DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS}
              value={numberOfParts}
              onChange={onChangeTwapNumberOfParts}
              onBlur={onBlurTwapNumberOfParts}
              type="number"
            />

            {settings.shouldUseExecutionFeeBuffer && (
              <InputSetting
                title={<Trans>Max Network Fee Buffer</Trans>}
                description={
                  <div>
                    <Trans>
                      The Max Network Fee is set to a higher value to handle potential increases in gas price during
                      order execution. Any excess network fee will be refunded to your account when the order is
                      executed. Only applicable to GMX V2.
                    </Trans>
                    <br />
                    <br />
                    <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#network-fee-buffer">
                      Read more
                    </ExternalLink>
                  </div>
                }
                defaultValue={30}
                value={parseFloat(String(settings.executionFeeBufferBps))}
                onChange={onChangeExecutionFeeBufferBps}
                suggestions={EMPTY_ARRAY}
              />
            )}

            <ToggleSwitch isChecked={settings.isAutoCancelTPSL} setIsChecked={settings.setIsAutoCancelTPSL}>
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

            <ToggleSwitch isChecked={settings.externalSwapsEnabled} setIsChecked={settings.setExternalSwapsEnabled}>
              <Trans>Enable external swaps</Trans>
            </ToggleSwitch>
          </SettingsSection>

          <div className="divider mt-16"></div>

          <h1 className="muted mt-16">
            <Trans>Display Settings</Trans>
          </h1>

          <SettingsSection className="mt-16 gap-16">
            <ToggleSwitch
              isChecked={settings.isLeverageSliderEnabled}
              setIsChecked={settings.setIsLeverageSliderEnabled}
            >
              <Trans>Show Leverage Slider</Trans>
            </ToggleSwitch>

            <ToggleSwitch isChecked={settings.showPnlAfterFees} setIsChecked={settings.setShowPnlAfterFees}>
              <Trans>Display PnL After Fees</Trans>
            </ToggleSwitch>

            <ToggleSwitch isChecked={settings.isPnlInLeverage} setIsChecked={settings.setIsPnlInLeverage}>
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
              <ToggleSwitch isChecked={settings.showDebugValues} setIsChecked={settings.setShowDebugValues}>
                <Trans>Show debug values</Trans>
              </ToggleSwitch>

              <AbFlagSettings />

              <DebugSwapsSettings />

              <TenderlySettings isSettingsVisible={isSettingsVisible} />
            </SettingsSection>
          </>
        )}
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
  onBlur,
  className,
  suggestions,
  type = "percentage",
}: {
  title: ReactNode;
  description?: ReactNode;
  defaultValue: number;
  value?: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  className?: string;
  suggestions?: number[];
  type?: "percentage" | "number";
}) {
  const titleComponent = <span className="text-14 font-medium">{title}</span>;

  const titleWithDescription = description ? (
    <TooltipWithPortal position="bottom" content={description}>
      {titleComponent}
    </TooltipWithPortal>
  ) : (
    titleComponent
  );

  const Input =
    type === "percentage" ? (
      <PercentageInput
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        tooltipPosition="bottom"
        suggestions={suggestions}
      />
    ) : (
      <NumberInput
        className="w-60 rounded-4 border border-solid border-slate-700 bg-slate-700 px-4 py-2 text-right hover:border-cold-blue-700"
        value={value}
        onValueChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
      />
    );

  return (
    <div className={cx("flex items-center justify-between", className)}>
      <div className="mr-8">{titleWithDescription}</div>
      {Input}
    </div>
  );
}
