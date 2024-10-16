import Checkbox from "components/Checkbox/Checkbox";
import { AbFlag, getAbStorage, setAbFlagEnabled } from "config/ab";
import { useState } from "react";

export function AbFlagSettings() {
  const [isShown, setIsShown] = useState(false);
  const [abStorage, setAbStorage] = useState({ ...getAbStorage() });

  return (
    <div className="mb-8 mt-16">
      <div className="cursor-pointer text-14 underline" onClick={() => setIsShown((old) => !old)}>
        {isShown ? "Hide" : "Show"} AB flags
      </div>
      {isShown && (
        <div className="mt-8">
          <div className="divider"></div>
          <div className="flex max-h-80 flex-col overflow-auto py-8">
            {Object.entries(abStorage).map(([flag, flagValue]) => (
              <div key={flag} className="Exchange-settings-row">
                <Checkbox
                  isChecked={flagValue.enabled}
                  setIsChecked={(checked) => {
                    setAbFlagEnabled(flag as AbFlag, checked);
                    setAbStorage({ ...getAbStorage() });
                  }}
                >
                  {flag}
                </Checkbox>
              </div>
            ))}
          </div>
          <div className="divider"></div>
        </div>
      )}
    </div>
  );
}
