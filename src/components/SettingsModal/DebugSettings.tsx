import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { devtools } from "lib/devtools";

import { AbFlagSettings } from "components/AbFlagsSettings/AbFlagsSettings";
import { DebugSwapsSettings } from "components/DebugSwapsSettings/DebugSwapsSettings";
import { ExpandableRow } from "components/ExpandableRow";
import TenderlySettings from "components/TenderlySettings/TenderlySettings";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import { SettingsSection } from "./shared";

interface DebugSettingsProps {
  isSettingsVisible: boolean;
}

export function DebugSettings({ isSettingsVisible }: DebugSettingsProps) {
  const settings = useSettings();
  // eslint-disable-next-line react/hook-use-state
  const [, setUpdateTrigger] = useState(0);
  const [debugLinksExpanded, setDebugLinksExpanded] = useState(false);

  const handleRpcDebugToggle = useCallback((enabled: boolean) => {
    devtools.setFlag("debugRpcTracker", enabled);
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  const toggleDebugLinks = useCallback((value: boolean) => {
    setDebugLinksExpanded(value);
  }, []);

  return (
    <div className="font-medium">
      <SettingsSection className="gap-16">
        <ToggleSwitch isChecked={settings.showDebugValues} setIsChecked={settings.setShowDebugValues}>
          <Trans>Show Debug Values</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableValidationForTesting}
          setIsChecked={settings.setShouldDisableValidationForTesting}
        >
          <Trans>Disable Validation for Testing</Trans>
        </ToggleSwitch>

        <ToggleSwitch
          isChecked={settings.shouldDisableShareModalPnlCheck}
          setIsChecked={settings.setShouldDisableShareModalPnlCheck}
        >
          <Trans>Disable Share Modal PnL Check</Trans>
        </ToggleSwitch>

        <ToggleSwitch isChecked={devtools.getFlag("debugRpcTracker")} setIsChecked={handleRpcDebugToggle}>
          <Trans>RPC Tracker Logging</Trans>
        </ToggleSwitch>

        <ExpandableRow
          open={debugLinksExpanded}
          title={t`Debug Links`}
          onToggle={toggleDebugLinks}
          disableCollapseOnError={false}
          contentClassName="flex flex-col gap-12 pt-8"
          scrollIntoViewOnMobile
        >
          <Link
            to="/rpc-debug"
            className="link-underline text-12 text-typography-secondary hover:text-blue-300"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Trans>RPC Debug</Trans>
          </Link>
          <Link
            to="/permits"
            className="link-underline text-12 text-typography-secondary hover:text-blue-300"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Trans>Debug Permits</Trans>
          </Link>
          <Link
            to="/monitor"
            className="link-underline text-12 text-typography-secondary hover:text-blue-300"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Trans>Monitoring</Trans>
          </Link>
        </ExpandableRow>

        <AbFlagSettings />

        <DebugSwapsSettings />

        <TenderlySettings isSettingsVisible={isSettingsVisible} />
      </SettingsSection>
    </div>
  );
}
