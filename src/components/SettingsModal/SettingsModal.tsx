import { plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { isDevelopment } from "config/env";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { getIsExpressSupported } from "config/features";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { getChainName } from "config/static/chains";
import { DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS } from "config/twap";
import { MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING } from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useIsOutOfGasPaymentBalance } from "domain/synthetics/express/useIsOutOfGasPaymentBalance";
import { useEnabledFeaturesRequest } from "domain/synthetics/features/useDisabledFeatures";
import {
  getIsSubaccountActive,
  getRemainingSubaccountActions,
  getRemainingSubaccountSeconds,
} from "domain/synthetics/subaccount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "sdk/configs/express";
import { MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";
import { secondsToPeriod } from "sdk/utils/time";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { ExpressTradingGasTokenSwitchedBanner } from "components/ExpressTradingGasTokenSwitchedBanner.ts/ExpressTradingGasTokenSwithedBanner";
import { ExpressTradingOutOfGasBanner } from "components/ExpressTradingOutOfGasBanner.ts/ExpressTradingOutOfGasBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { GasPaymentTokenSelector } from "components/GasPaymentTokenSelector/GasPaymentTokenSelector";
import { SlideModal } from "components/Modal/SlideModal";
import NumberInput from "components/NumberInput/NumberInput";
import { OldSubaccountWithdraw } from "components/OldSubaccountWithdraw/OldSubaccountWithdraw";
import { OneClickAdvancedSettings } from "components/OneClickAdvancedSettings/OneClickAdvancedSettings";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { Selector } from "components/Synthetics/GmxAccountModal/Selector";
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
  const { chainId, srcChainId } = useChainId();

  const [settlementChainId, setSettlementChainId] = useGmxAccountSettlementChainId();
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
    if (srcChainId) {
      // eslint-disable-next-line no-console
      console.error("Express trading can not be disabled for multichain");
      return;
    }
    settings.setExpressOrdersEnabled(enabled);

    if (!enabled && subaccountState.subaccount) {
      subaccountState.tryDisableSubaccount().then((success) => {
        if (success) {
          settings.setExpressOrdersEnabled(false);
        } else {
          settings.setExpressOrdersEnabled(true);
        }
      });
    }
  };

  const handleOneClickTradingToggle = (enabled: boolean) => {
    if (enabled) {
      subaccountState.tryEnableSubaccount().then((success) => {
        if (success) {
          settings.setExpressOrdersEnabled(true);
        } else {
          settings.setExpressOrdersEnabled(false);
        }
      });
    } else {
      subaccountState.tryDisableSubaccount();
    }
  };

  const remainingSubaccountActions = useMemo(() => {
    const actions = Number(
      subaccountState.subaccount
        ? getRemainingSubaccountActions(subaccountState.subaccount)
        : DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT
    );

    return plural(actions, {
      one: "1 action",
      other: `${actions} actions`,
    });
  }, [subaccountState.subaccount]);

  const remainingSubaccountDays = useMemo(() => {
    if (!subaccountState.subaccount) {
      const days = secondsToPeriod(DEFAULT_SUBACCOUNT_EXPIRY_DURATION, "1d");

      return plural(Number(days), {
        one: "1 day",
        other: `${days} days`,
      });
    }

    const seconds = Number(getRemainingSubaccountSeconds(subaccountState.subaccount));

    const days = secondsToPeriod(seconds, "1d");

    if (days > 0) {
      return plural(Number(days), {
        one: "1 day",
        other: `${days} days`,
      });
    }

    const hours = secondsToPeriod(seconds, "1h");

    if (hours > 0) {
      return plural(Number(hours), {
        one: "1 hour",
        other: `${hours} hours`,
      });
    }

    const minutes = secondsToPeriod(seconds, "1m");

    return plural(Number(minutes), {
      one: "1 minute",
      other: `${minutes} minutes`,
    });
  }, [subaccountState.subaccount]);

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
          {getIsExpressSupported(chainId) && (
            <>
              <SettingsSection>
                {!srcChainId && (
                  <ToggleSwitch
                    disabled={
                      !features?.relayRouterEnabled || (isOutOfGasPaymentBalance && !settings.expressOrdersEnabled)
                    }
                    isChecked={settings.expressOrdersEnabled}
                    setIsChecked={handleExpressOrdersToggle}
                  >
                    <TooltipWithPortal
                      content={
                        <Trans>
                          Express Trading streamlines your trades on GMX by replacing on-chain transactions with secure
                          off-chain message signing, helping reduce issues from network congestion and RPC errors.
                          <br />
                          <br />
                          These signed messages are processed on-chain for you, so a gas payment token is still
                          required.
                        </Trans>
                      }
                      handle={<Trans>Express Trading</Trans>}
                    />
                  </ToggleSwitch>
                )}

                <ToggleSwitch
                  isChecked={Boolean(subaccountState.subaccount && getIsSubaccountActive(subaccountState.subaccount))}
                  setIsChecked={handleOneClickTradingToggle}
                  disabled={
                    !features?.subaccountRelayRouterEnabled || (isOutOfGasPaymentBalance && !subaccountState.subaccount)
                  }
                >
                  <TooltipWithPortal
                    content={
                      <Trans>
                        One-Click Trading (1CT) lets you trade without signing pop-ups and requires Express Trading to
                        be enabled. Your 1CT session is valid for {remainingSubaccountActions} or{" "}
                        {remainingSubaccountDays}, whichever comes first.
                        <br />
                        <br />
                        You can adjust these settings anytime under "One-Click Trading Settings"
                      </Trans>
                    }
                    handle={<Trans>One-Click Trading</Trans>}
                  />
                </ToggleSwitch>

                {isOutOfGasPaymentBalance && <ExpressTradingOutOfGasBanner onClose={onClose} />}

                {settings.expressTradingGasTokenSwitched &&
                  !isOutOfGasPaymentBalance &&
                  settings.expressOrdersEnabled && (
                    <ExpressTradingGasTokenSwitchedBanner
                      onClose={() => settings.setExpressTradingGasTokenSwitched(false)}
                    />
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
                    currentTokenAddress={settings.gasPaymentTokenAddress}
                    onSelectToken={settings.setGasPaymentTokenAddress}
                  />
                </SettingsSection>
              )}

              {srcChainId && (
                <SettingsSection className="mt-2">
                  <div className="flex items-center justify-between">
                    <TooltipWithPortal
                      content={<Trans>Network for Cross-Chain Deposits and positions.</Trans>}
                      handle={<Trans>Settlement Chain</Trans>}
                    />
                    <div>
                      <Selector
                        slim
                        elevated
                        value={settlementChainId}
                        onChange={setSettlementChainId}
                        options={MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING[srcChainId]}
                        item={({ option }) => (
                          <div className="flex items-center gap-8">
                            <img
                              src={CHAIN_ID_TO_NETWORK_ICON[option]}
                              alt={getChainName(option)}
                              className="size-16"
                            />
                            <span>{getChainName(option)}</span>
                          </div>
                        )}
                        button={
                          <div className="flex items-center gap-4">
                            <img
                              src={CHAIN_ID_TO_NETWORK_ICON[settlementChainId]}
                              alt={getChainName(settlementChainId)}
                              className="size-16"
                            />
                            <span>{getChainName(settlementChainId)}</span>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </SettingsSection>
              )}
            </>
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
                  <Trans>The default number of parts for Time-Weighted Average Price (TWAP) orders.</Trans>
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

              <ToggleSwitch
                isChecked={settings.shouldDisableValidationForTesting}
                setIsChecked={settings.setShouldDisableValidationForTesting}
              >
                <Trans>Disable validation for testing</Trans>
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
