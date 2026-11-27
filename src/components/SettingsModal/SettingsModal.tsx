import { msg, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLatest } from "react-use";

import { isDevelopment } from "config/env";
import { getNetworkFeatures } from "config/features";
import { useNotificationsContext } from "context/NotificationsContext/NotificationsContextProvider";
import { type SettingsTab, type SettingsTabSource, useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { sendNotificationsTabOpenEvent } from "domain/notifications/notificationsAnalytics";
import { getOrderRelayRouterAddress } from "domain/synthetics/express/expressOrderUtils";
import {
  getIsSubaccountActionsExceeded,
  getIsSubaccountApprovalInvalid,
  getIsSubaccountExpired,
  getIsSubaccountNonceExpired,
} from "domain/synthetics/subaccount";
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
import { NotificationsSettings } from "./NotificationsSettings";
import { TradingMode } from "./shared";
import { TradingSettings } from "./TradingSettings";

const SETTINGS_TABS: SettingsTab[] = isDevelopment()
  ? ["trading", "display", "notifications", "debug"]
  : ["trading", "display", "notifications"];

const TAB_LABELS = {
  trading: msg`Trading`,
  display: msg`Display`,
  notifications: msg`Notifications`,
  debug: msg`Debug`,
};

export function SettingsModal({
  isSettingsVisible,
  setIsSettingsVisible,
}: {
  isSettingsVisible: boolean;
  setIsSettingsVisible: (value: boolean) => void;
}) {
  const { chainId, srcChainId, networkId } = useChainId();
  const features = getNetworkFeatures(networkId);
  const showTradingSettings = features.express || features.oneClickTrading || features.twap || features.stopMarket;

  const settings = useSettings();
  const subaccountState = useSubaccountContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>(showTradingSettings ? "trading" : "display");
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
        helperToast.error(t`Slippage must be less than 5%`);
        return;
      }

      const basisPoints = roundToTwoDecimals(slippage);
      if (parseInt(String(basisPoints)) !== parseFloat(String(basisPoints))) {
        helperToast.error(t`Max slippage precision is 0.01%`);
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
      if (isTradingModeChanging) {
        return;
      }

      const prevMode = tradingMode;
      setIsTradingModeChanging(true);
      setTradingMode(mode);

      try {
        switch (mode) {
          case TradingMode.Classic: {
            if (srcChainId) {
              // eslint-disable-next-line no-console
              console.error("Express trading can not be disabled for multichain");
              setTradingMode(prevMode);
              return;
            }
            if (subaccountState.subaccount) {
              const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

              if (!isSubaccountDeactivated) {
                setTradingMode(prevMode);
                return;
              }
            }

            settings.setExpressOrdersEnabled(false);
            break;
          }
          case TradingMode.Express: {
            if (subaccountState.subaccount) {
              const isSubaccountDeactivated = await subaccountState.tryDisableSubaccount();

              if (!isSubaccountDeactivated) {
                setTradingMode(prevMode);
                return;
              }
            }

            settings.setExpressOrdersEnabled(true);
            break;
          }
          case TradingMode.Express1CT: {
            const isSubaccountActivated = await subaccountState.tryEnableSubaccount(subaccountState.initialSettings);

            if (!isSubaccountActivated) {
              setTradingMode(prevMode);
              return;
            }

            settings.setExpressOrdersEnabled(true);
            break;
          }
          default: {
            mustNeverExist(mode);
            break;
          }
        }
      } finally {
        setIsTradingModeChanging(false);
      }
    },
    [isTradingModeChanging, settings, srcChainId, subaccountState, tradingMode]
  );

  useEffect(
    function defineTradingMode() {
      if (isTradingModeChanging) {
        return;
      }

      let nextTradingMode = tradingMode;

      if (subaccountState.subaccount) {
        const subaccountRouterAddress = getOrderRelayRouterAddress(chainId, true, Boolean(srcChainId));
        const isOneClickExpired = getIsSubaccountExpired(subaccountState.subaccount);
        const isOneClickActionsExceeded = getIsSubaccountActionsExceeded(subaccountState.subaccount, 1);
        const isOneClickStructurallyInvalid =
          getIsSubaccountNonceExpired(subaccountState.subaccount) ||
          getIsSubaccountApprovalInvalid({
            chainId,
            signerChainId: srcChainId ?? chainId,
            onchainData: subaccountState.subaccount.onchainData,
            signedApproval: subaccountState.subaccount.signedApproval,
            subaccountRouterAddress,
          });

        const shouldFallbackFromOneClickToExpress =
          !isOneClickStructurallyInvalid && (isOneClickExpired || isOneClickActionsExceeded);

        if (shouldFallbackFromOneClickToExpress) {
          nextTradingMode = settings.expressOrdersEnabled ? TradingMode.Express : TradingMode.Classic;
        } else {
          nextTradingMode = TradingMode.Express1CT;
        }
      } else if (settings.expressOrdersEnabled) {
        nextTradingMode = TradingMode.Express;
      } else {
        nextTradingMode = TradingMode.Classic;
      }

      if (nextTradingMode !== tradingMode) {
        setTradingMode(nextTradingMode);
      }
    },
    [chainId, isTradingModeChanging, settings.expressOrdersEnabled, srcChainId, subaccountState.subaccount, tradingMode]
  );

  const tabLabels = useLocalizedMap(TAB_LABELS);

  const tabOptions = useMemo(
    () =>
      SETTINGS_TABS.filter((tab) => showTradingSettings || tab !== "trading").map((tab) => ({
        value: tab,
        label: tabLabels[tab],
      })),
    [showTradingSettings, tabLabels]
  );

  useEffect(() => {
    if (!tabOptions.some((tab) => tab.value === activeTab)) {
      setActiveTab(tabOptions[0].value);
    }
  }, [activeTab, tabOptions]);

  const { settingsTabRequest, setSettingsTabRequest } = settings;
  const [tabSource, setTabSource] = useState<SettingsTabSource>();

  // Set during the render, so the tab used last does not show for a moment: the Notifications tab counts its opens.
  const [wasSettingsVisible, setWasSettingsVisible] = useState(isSettingsVisible);
  if (isSettingsVisible !== wasSettingsVisible) {
    setWasSettingsVisible(isSettingsVisible);

    if (isSettingsVisible) {
      // Settings links in toasts mean trading settings, so Settings doesn't reopen on the tab used last.
      setActiveTab(settingsTabRequest?.tab ?? tabOptions[0].value);
      setTabSource(settingsTabRequest?.source);
    }
  }

  useEffect(() => {
    if (isSettingsVisible && settingsTabRequest) {
      setActiveTab(settingsTabRequest.tab);
      setTabSource(settingsTabRequest.source);
      setSettingsTabRequest(undefined);
    }
  }, [isSettingsVisible, settingsTabRequest, setSettingsTabRequest]);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    setTabSource(undefined);
  }, []);

  // Counted here, not in the tab: the modal remounts its content when the window crosses the mobile breakpoint.
  const isNotificationsTabShown = isSettingsVisible && activeTab === "notifications";
  const { status: notificationsStatus } = useNotificationsContext();
  // The entry and the state as the tab opens; later changes are not another open.
  const latestNotificationsOpen = useLatest({ entry: tabSource ?? ("settings" as const), state: notificationsStatus });

  useEffect(() => {
    if (isNotificationsTabShown) {
      sendNotificationsTabOpenEvent(latestNotificationsOpen.current.entry, latestNotificationsOpen.current.state);
    }
  }, [isNotificationsTabShown, latestNotificationsOpen]);

  return (
    <SlideModal
      isVisible={isSettingsVisible}
      setIsVisible={setIsSettingsVisible}
      label={t`Settings`}
      qa="settings-modal"
      className="text-body-medium text-typography-secondary"
      desktopClassName="!items-start !justify-end !pt-[56px] !pr-8"
      desktopZIndex={1002}
    >
      <div className="flex flex-col gap-8">
        <Tabs options={tabOptions} selectedValue={activeTab} onChange={handleTabChange} type="underline" />
        <div className="flex max-w-[380px] flex-row items-start overflow-x-hidden max-md:max-w-none">
          {showTradingSettings && (
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
          )}
          <TabWrapper tab="display" activeTab={activeTab}>
            <DisplaySettings />
          </TabWrapper>
          <TabWrapper tab="notifications" activeTab={activeTab}>
            <NotificationsSettings isSettingsVisible={isSettingsVisible} />
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
      className={cx("w-full shrink-0", {
        "max-md:hidden md:invisible": activeTab !== tab,
        "order-first": activeTab === tab,
      })}
    >
      {children}
    </div>
  );
}
