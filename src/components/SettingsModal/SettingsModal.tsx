import { msg, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { isDevelopment } from "config/env";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { roundToTwoDecimals } from "lib/numbers";
import { mustNeverExist } from "lib/types";
import { MAX_TWAP_NUMBER_OF_PARTS, MIN_TWAP_NUMBER_OF_PARTS } from "sdk/configs/twap";

import { SlideModal } from "components/Modal/SlideModal";
import Tabs from "components/Tabs/Tabs";

import { DebugSettings } from "./DebugSettings";
import { DisplaySettings } from "./DisplaySettings";
import { TradingMode } from "./shared";
import { TradingSettings } from "./TradingSettings";

let SETTINGS_TABS: ("trading" | "display" | "debug")[] = [];
if (isDevelopment()) {
  SETTINGS_TABS = ["trading", "display", "debug"];
} else {
  SETTINGS_TABS = ["trading", "display"];
}

type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_LABELS = {
  trading: msg`Trading Settings`,
  display: msg`Display Settings`,
  debug: msg`Debug Settings`,
};

export function SettingsModal({
  isSettingsVisible,
  setIsSettingsVisible,
}: {
  isSettingsVisible: boolean;
  setIsSettingsVisible: (value: boolean) => void;
}) {
  const { srcChainId } = useChainId();

  const settings = useSettings();
  const subaccountState = useSubaccountContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>("trading");
  const [tradingMode, setTradingMode] = useState<TradingMode | undefined>(undefined);
  const [isTradingModeChanging, setIsTradingModeChanging] = useState(false);

  const [numberOfParts, setNumberOfParts] = useState<number>();

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
      setIsTradingModeChanging(true);
      setTradingMode(mode);

      switch (mode) {
        case TradingMode.Classic: {
          if (srcChainId) {
            // eslint-disable-next-line no-console
            console.error("Express trading can not be disabled for multichain");
            setTradingMode(prevMode);
            setIsTradingModeChanging(false);
            return;
          }
          if (subaccountState.subaccount) {
            const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

            if (!isSubaccountDeactivated) {
              setTradingMode(prevMode);
              setIsTradingModeChanging(false);
              return;
            }
          }

          settings.setExpressOrdersEnabled(false);
          setIsTradingModeChanging(false);
          break;
        }
        case TradingMode.Express: {
          if (subaccountState.subaccount) {
            const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

            if (!isSubaccountDeactivated) {
              setTradingMode(prevMode);
              setIsTradingModeChanging(false);
              return;
            }
          }

          settings.setExpressOrdersEnabled(true);
          setIsTradingModeChanging(false);
          break;
        }
        case TradingMode.Express1CT: {
          const isSubaccountActivated = await subaccountState.tryEnableSubaccount();

          if (!isSubaccountActivated) {
            setTradingMode(prevMode);
            setIsTradingModeChanging(false);
            return;
          }

          settings.setExpressOrdersEnabled(true);
          setIsTradingModeChanging(false);
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
      if (isTradingModeChanging) {
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
    [isTradingModeChanging, settings.expressOrdersEnabled, subaccountState.subaccount, tradingMode]
  );

  const tabLabels = useLocalizedMap(TAB_LABELS);

  const tabOptions = useMemo(
    () =>
      SETTINGS_TABS.map((tab) => ({
        value: tab,
        label: tabLabels[tab],
      })),
    [tabLabels]
  );

  return (
    <SlideModal
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
      qa="settings-modal"
      className="text-body-medium text-typography-secondary"
    >
      <div className="flex flex-col gap-8">
        <Tabs options={tabOptions} selectedValue={activeTab} onChange={setActiveTab} type="inline" />
        <div className="flex max-w-[380px] flex-row items-start overflow-x-hidden max-md:max-w-none">
          <TabWrapper tab="trading" activeTab={activeTab}>
            <TradingSettings
              tradingMode={tradingMode}
              handleTradingModeChange={handleTradingModeChange}
              onChangeSlippage={onChangeSlippage}
              onChangeExecutionFeeBufferBps={onChangeExecutionFeeBufferBps}
              onChangeTwapNumberOfParts={onChangeTwapNumberOfParts}
              onBlurTwapNumberOfParts={onBlurTwapNumberOfParts}
              numberOfParts={numberOfParts}
              onClose={onClose}
            />
          </TabWrapper>
          <TabWrapper tab="display" activeTab={activeTab}>
            <DisplaySettings />
          </TabWrapper>
          <TabWrapper tab="debug" activeTab={activeTab}>
            <DebugSettings isSettingsVisible={isSettingsVisible} />
          </TabWrapper>
        </div>
      </div>
    </SlideModal>
  );
}

function TabWrapper({
  tab,
  activeTab,
  children,
}: {
  tab: SettingsTab;
  activeTab: SettingsTab;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx("w-[380px] shrink-0 max-md:w-full", {
        "max-md:hidden md:invisible": activeTab !== tab,
        "order-first": activeTab === tab,
      })}
    >
      {children}
    </div>
  );
}
