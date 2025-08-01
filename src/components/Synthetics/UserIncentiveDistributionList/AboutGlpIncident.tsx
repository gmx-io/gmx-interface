import { t, Trans } from "@lingui/macro";
import cn from "classnames";
import { useState } from "react";
import { useMedia } from "react-use";

import Card from "components/Common/Card";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";

export function AboutGlpIncident() {
  const [row1Visible, setRow1Visible] = useState(false);
  const [row2Visible, setRow2Visible] = useState(false);

  const isBigResolution = useMedia("(min-width: 1200px)");
  const isSmallResolution = useMedia("(max-width: 1024px)");

  return (
    <div
      className={cn("flex-grow-0", {
        ["min-w-[388px] max-w-[388px]"]: isBigResolution,
        ["min-w-[300px] max-w-[300px]"]: !isBigResolution && !isSmallResolution,
        "w-full": isSmallResolution,
      })}
    >
      <Card title={t`About GLP Incident`}>
        <div>
          <ExpandableRow
            className="flex flex-col gap-14"
            contentClassName="flex flex-col gap-14"
            title={t`Why is the claim in GLV tokens?`}
            open={row1Visible}
            onToggle={setRow1Visible}
            handleClassName="!text-white"
          >
            <div className="text-slate-100">
              <Trans>
                GLV is similar in composition to GLP. Users can sell it, but holding it will earn them incentives
              </Trans>
            </div>
          </ExpandableRow>
          <div className="App-card-divider" />
          <ExpandableRow
            className="flex flex-col gap-14"
            contentClassName="flex flex-col gap-14"
            title={t`Can I claim more than once?`}
            open={row2Visible}
            onToggle={setRow2Visible}
            handleClassName="!text-white"
          >
            <div className="text-slate-100">
              <Trans>
                Some funds are still held in GLP. Users should expect future claims and check back periodically. most
                funds have already been distributed.
              </Trans>
            </div>
          </ExpandableRow>
        </div>
      </Card>
    </div>
  );
}
