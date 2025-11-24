import { t } from "@lingui/macro";
import { useCallback, useState } from "react";

import { AbFlag, getAbStorage, setAbFlagEnabled } from "config/ab";

import { ExpandableRow } from "components/ExpandableRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function AbFlagSettings() {
  const [isShown, setIsShown] = useState(false);
  const [abStorage, setAbStorage] = useState({ ...getAbStorage() });

  const toggleAbFlags = useCallback((value: boolean) => {
    setIsShown(value);
  }, []);

  return (
    <ExpandableRow
      open={isShown}
      title={t`AB Flags`}
      onToggle={toggleAbFlags}
      disableCollapseOnError={false}
      contentClassName="flex flex-col gap-16 pt-8"
      scrollIntoViewOnMobile
    >
      {Object.entries(abStorage).length === 0 ? (
        <div className="py-8 text-typography-secondary">No AB flags.</div>
      ) : (
        <div className="flex max-h-80 flex-col gap-8 overflow-auto rounded-8 bg-slate-800 p-12 pr-16">
          {Object.entries(abStorage).map(([flag, flagValue]) => (
            <ToggleSwitch
              key={flag}
              isChecked={flagValue.enabled}
              setIsChecked={(checked) => {
                setAbFlagEnabled(flag as AbFlag, checked);
                setAbStorage({ ...getAbStorage() });
              }}
            >
              {flag}
            </ToggleSwitch>
          ))}
        </div>
      )}
    </ExpandableRow>
  );
}
