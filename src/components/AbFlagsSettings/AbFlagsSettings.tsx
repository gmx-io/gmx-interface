import { useState } from "react";

import { AbFlag, getAbStorage, setAbFlagEnabled } from "config/ab";

import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

export function AbFlagSettings() {
  const [isShown, setIsShown] = useState(false);
  const [abStorage, setAbStorage] = useState({ ...getAbStorage() });

  return (
    <div>
      <div className="cursor-pointer underline" onClick={() => setIsShown((old) => !old)}>
        {isShown ? "Hide" : "Show"} AB flags
      </div>
      {isShown && (
        <div className="mt-8">
          <div className="divider"></div>
          {Object.entries(abStorage).length === 0 ? (
            <div className="py-8">No AB flags.</div>
          ) : (
            <div className="flex max-h-80 flex-col gap-8 overflow-auto py-8">
              {Object.entries(abStorage).map(([flag, flagValue]) => (
                <div key={flag}>
                  <ToggleSwitch
                    isChecked={flagValue.enabled}
                    setIsChecked={(checked) => {
                      setAbFlagEnabled(flag as AbFlag, checked);
                      setAbStorage({ ...getAbStorage() });
                    }}
                  >
                    {flag}
                  </ToggleSwitch>
                </div>
              ))}
            </div>
          )}
          <div className="divider"></div>
        </div>
      )}
    </div>
  );
}
