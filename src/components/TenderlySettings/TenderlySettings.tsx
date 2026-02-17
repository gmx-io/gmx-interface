import { t, Trans } from "@lingui/macro";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { ExpandableRow } from "components/ExpandableRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

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

  const [isShown, setIsShown] = useState(false);

  const [accountSlug, setAccountSlug] = useState(tenderlyAccountSlug ?? "");
  const [projectSlug, setProjectSlug] = useState(tenderlyProjectSlug ?? "");
  const [accessKey, setAccessKey] = useState(tenderlyAccessKey ?? "");

  const toggleTenderlySettings = useCallback((value: boolean) => {
    setIsShown(value);
  }, []);

  useEffect(() => {
    if (isSettingsVisible) {
      setAccountSlug(tenderlyAccountSlug ?? "");
      setProjectSlug(tenderlyProjectSlug ?? "");
      setAccessKey(tenderlyAccessKey ?? "");
    }
  }, [isSettingsVisible, tenderlyAccessKey, tenderlyAccountSlug, tenderlyProjectSlug]);

  return (
    <ExpandableRow
      open={isShown}
      title={t`Tenderly settings`}
      onToggle={toggleTenderlySettings}
      disableCollapseOnError={false}
      contentClassName="flex flex-col gap-16 pt-8"
      scrollIntoViewOnMobile
    >
      <TenderlyInput
        name={t`Account`}
        placeholder={t`account`}
        value={accountSlug}
        onChange={setTenderlyAccountSlug}
      />
      <TenderlyInput
        name={t`Project`}
        placeholder={t`project`}
        value={projectSlug}
        onChange={setTenderlyProjectSlug}
      />
      <TenderlyInput
        name={t`Access key`}
        placeholder={t`xxxx-xxxx-xxxx`}
        value={accessKey}
        onChange={setTenderlyAccessKey}
      />
      <ToggleSwitch isChecked={Boolean(tenderlySimulationEnabled)} setIsChecked={setTenderlySimulationEnabled}>
        <Trans>Simulate transactions</Trans>
      </ToggleSwitch>
      <div className="text-typography-secondary">
        <Trans>
          See{" "}
          <ExternalLink href="https://docs.tenderly.co/tenderly-sdk/intro-to-tenderly-sdk#how-to-get-the-account-name-project-slug-and-secret-key">
            Tenderly docs
          </ExternalLink>
        </Trans>
      </div>
    </ExpandableRow>
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
        className="border-1 w-[280px] border border-slate-600 px-5 py-4 text-12"
      />
    </p>
  );
}

export default TenderlySettings;
