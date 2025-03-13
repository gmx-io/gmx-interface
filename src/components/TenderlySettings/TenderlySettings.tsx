import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import ExternalLink from "components/ExternalLink/ExternalLink";

export function TenderlySettings({ isSettingsVisible }: { isSettingsVisible: boolean }) {
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

  useEffect(() => {
    if (isSettingsVisible) {
      setAccountSlug(tenderlyAccountSlug ?? "");
      setProjectSlug(tenderlyProjectSlug ?? "");
      setAccessKey(tenderlyAccessKey ?? "");
    }
  }, [isSettingsVisible, tenderlyAccessKey, tenderlyAccountSlug, tenderlyProjectSlug]);

  return (
    <div>
      <div className="cursor-pointer underline" onClick={() => setIsShown((old) => !old)}>
        {isShown ? "Hide" : "Show"} Tenderly Settings
      </div>
      {isShown && (
        <>
          <br />
          <TenderlyInput name="Account" placeholder="account" value={accountSlug} onChange={setTenderlyAccountSlug} />
          <TenderlyInput name="Project" placeholder="project" value={projectSlug} onChange={setTenderlyProjectSlug} />
          <TenderlyInput
            name="Access Key"
            placeholder="xxxx-xxxx-xxxx"
            value={accessKey}
            onChange={setTenderlyAccessKey}
          />
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
        </>
      )}
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

export default TenderlySettings;
