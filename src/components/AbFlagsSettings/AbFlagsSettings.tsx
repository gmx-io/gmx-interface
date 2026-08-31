import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import { AB_FLAG_NAMES, getAbStorage, setAbFlagEnabled } from "config/ab";

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
      title={t`AB flags`}
      onToggle={toggleAbFlags}
      disableCollapseOnError={false}
      contentClassName="flex flex-col gap-16 pt-8"
      scrollIntoViewOnMobile
    >
      {AB_FLAG_NAMES.length === 0 ? (
        <div className="py-8 text-typography-secondary">
          <Trans>No AB flags</Trans>
        </div>
      ) : (
        <div className="max-h-300 flex flex-col gap-8 overflow-auto rounded-8 bg-slate-800 p-12 pr-16">
          {AB_FLAG_NAMES.map((flag) => (
            <ToggleSwitch
              key={flag}
              isChecked={Boolean(abStorage[flag]?.enabled)}
              setIsChecked={(checked) => {
                setAbFlagEnabled(flag, checked);
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
