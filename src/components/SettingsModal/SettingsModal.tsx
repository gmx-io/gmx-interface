import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback, useEffect, useState } from "react";

import { isDevelopment } from "config/env";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { getIsExpressSupported } from "config/features";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { getChainName } from "config/static/chains";
import { DEFAULT_TIME_WEIGHTED_NUMBER_OF_PARTS } from "config/twap";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { MULTI_CHAIN_SOURCE_TO_SETTLEMENT_CHAIN_MAPPING } from "domain/multichain/config";
import { useIsOutOfGasPaymentBalance } from "domain/synthetics/express/useIsOutOfGasPaymentBalance";
import { getIsSubaccountActive } from "domain/synthetics/subaccount";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { roundToTwoDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { mustNeverExist } from "lib/types";
import { MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
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

import ExpressIcon from "img/ic_express.svg?react";
import HourGlassIcon from "img/ic_hourglass.svg?react";
import InfoIcon from "img/ic_info.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";

enum TradingMode {
  Classic = "classic",
  Express = "express",
  Express1CT = "express-1ct",
}

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
  const subaccountState = useSubaccountContext();

  const [tradingMode, setTradingMode] = useState<TradingMode | undefined>(undefined);
  const [isTradningModeChanging, setIsTradningModeChanging] = useState(false);

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

  const handleTradingModeChange = useCallback(
    async (mode: TradingMode) => {
      const prevMode = tradingMode;
      setIsTradningModeChanging(true);
      setTradingMode(mode);

      switch (mode) {
        case TradingMode.Classic: {
          if (srcChainId) {
            // eslint-disable-next-line no-console
            console.error("Express trading can not be disabled for multichain");
            setTradingMode(prevMode);
            setIsTradningModeChanging(false);
            return;
          }
          if (subaccountState.subaccount) {
            const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

            if (!isSubaccountDeactivated) {
              setTradingMode(prevMode);
              setIsTradningModeChanging(false);
              return;
            }
          }

          settings.setExpressOrdersEnabled(false);
          setIsTradningModeChanging(false);
          break;
        }
        case TradingMode.Express: {
          if (subaccountState.subaccount) {
            const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

            if (!isSubaccountDeactivated) {
              setTradingMode(prevMode);
              setIsTradningModeChanging(false);
              return;
            }
          }

          settings.setExpressOrdersEnabled(true);
          setIsTradningModeChanging(false);
          break;
        }
        case TradingMode.Express1CT: {
          const isSubaccountActivated = await subaccountState.tryEnableSubaccount();

          if (!isSubaccountActivated) {
            setTradingMode(prevMode);
            setIsTradningModeChanging(false);
            return;
          }

          settings.setExpressOrdersEnabled(true);
          setIsTradningModeChanging(false);
          break;
        }
        default: {
          mustNeverExist(mode);
          break;
        }
      }
    },
    [settings, srcChainId, subaccountState, tradingMode]
  );

  useEffect(
    function defineTradingMode() {
      if (isTradningModeChanging) {
        return;
      }

      let nextTradingMode = tradingMode;

      if (subaccountState.subaccount) {
        nextTradingMode = TradingMode.Express1CT;
      } else if (settings.expressOrdersEnabled) {
        nextTradingMode = TradingMode.Express;
      } else {
        nextTradingMode = TradingMode.Classic;
      }

      if (nextTradingMode !== tradingMode) {
        setTradingMode(nextTradingMode);
      }
    },
    [isTradningModeChanging, settings.expressOrdersEnabled, subaccountState.subaccount, tradingMode]
  );

  return (
    <SlideModal
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
      qa="settings-modal"
      className="text-body-medium"
      desktopContentClassName="w-[420px]"
    >
      <div className="flex flex-col">
        <h1 className="muted">
          <Trans>Trading Settings</Trans>
        </h1>
        <div className="mt-16">
          {getIsExpressSupported(chainId) && (
            <>
              <SettingsSection>
                <div className="text-14 font-medium">
                  <Trans>Trading Mode</Trans>
                </div>

                <SettingButton
                  title="Classic"
                  description="On-chain signing for every transaction"
                  info={
                    <Trans>
                      Your wallet, your keys. You sign each transaction on-chain using your own RPC, typically provided
                      by your wallet. Gas payments in ETH.
                    </Trans>
                  }
                  icon={<HourGlassIcon className="opacity-50" />}
                  active={tradingMode === TradingMode.Classic}
                  onClick={() => handleTradingModeChange(TradingMode.Classic)}
                />

                <SettingButton
                  title="Express"
                  description="High execution reliability using premium RPCs"
                  info={
                    <Trans>
                      Your wallet, your keys. You sign each transaction off-chain. Trades use GMX-sponsored premium RPCs
                      for reliability, even during network congestion. Gas payments in USDC or WETH.
                    </Trans>
                  }
                  icon={<ExpressIcon />}
                  disabled={isOutOfGasPaymentBalance}
                  chip={
                    <Chip color="gray">
                      <Trans>Optimal</Trans>
                    </Chip>
                  }
                  active={tradingMode === TradingMode.Express}
                  onClick={() => handleTradingModeChange(TradingMode.Express)}
                />

                <SettingButton
                  title="Express + One-Click"
                  description="CEX-like experience with Express reliability"
                  icon={<OneClickIcon />}
                  disabled={isOutOfGasPaymentBalance}
                  info={
                    <Trans>
                      Your wallet, your keys. GMX executes transactions for you without individual signing, providing a
                      seamless, CEX-like experience. Trades use GMX-sponsored premium RPCs for reliability, even during
                      network congestion. Gas payments in USDC or WETH.
                    </Trans>
                  }
                  chip={
                    <Chip color="blue">
                      <Trans>Fastest</Trans>
                    </Chip>
                  }
                  active={tradingMode === TradingMode.Express1CT}
                  onClick={() => handleTradingModeChange(TradingMode.Express1CT)}
                />

                {isOutOfGasPaymentBalance && <ExpressTradingOutOfGasBanner onClose={onClose} />}

                <OldSubaccountWithdraw />

                {Boolean(subaccountState.subaccount && getIsSubaccountActive(subaccountState.subaccount)) && (
                  <OneClickAdvancedSettings />
                )}

                {settings.expressOrdersEnabled && (
                  <>
                    <div className="divider"></div>

                    <GasPaymentTokenSelector
                      currentTokenAddress={settings.gasPaymentTokenAddress}
                      onSelectToken={settings.setGasPaymentTokenAddress}
                    />
                  </>
                )}

                {srcChainId && (
                  <SettingsSection className="mt-2">
                    <div className="flex items-center justify-between">
                      <TooltipWithPortal
                        content={<Trans>Network for Cross-Chain Deposits and positions.</Trans>}
                        handle={<Trans>Settlement Chain</Trans>}
                      />
                      <div>
                        <DropdownSelector
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
              </SettingsSection>
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
                maxValue={1000 * 100}
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
  maxValue,
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
  maxValue?: number;
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
        maxValue={maxValue}
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

function SettingButton({
  title,
  icon,
  description,
  onClick,
  active,
  chip,
  info,
  disabled,
}: {
  title: string;
  icon: ReactNode;
  description: string;
  active?: boolean;
  chip?: ReactNode;
  onClick: () => void;
  info?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={cx(
        `flex select-none items-center rounded-4 border border-solid`,
        active ? "border-gray-400" : "border-stroke-primary",
        disabled ? "muted cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div className={cx("px-16 py-6", disabled && "opacity-50")}>{icon}</div>
      <div className="flex py-6 ">
        <div className="flex flex-col border-l border-solid border-stroke-primary pl-12">
          <div className="flex items-center gap-4">
            <div>{title}</div>
            {info && (
              <TooltipWithPortal
                content={info}
                handleClassName="-mb-6"
                handle={<InfoIcon className="muted size-12" />}
              />
            )}
          </div>
          <div className="text-slate-100">{description}</div>
        </div>
        {chip ? <div className="mr-6 mt-4">{chip}</div> : null}
      </div>
    </div>
  );
}

function Chip({ children, color }: { children: ReactNode; color: "blue" | "gray" }) {
  const colorClass = {
    blue: "bg-blue-600",
    gray: "bg-slate-500",
  }[color];

  return <div className={cx(`rounded-full px-8 py-4 text-[10px]`, colorClass)}>{children}</div>;
}
