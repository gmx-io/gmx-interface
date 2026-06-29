import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import {
  selectChainId,
  selectDepositMarketTokensData,
  selectMarketsInfoData,
  selectPositionsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import EventToast from "components/EventToast/EventToast";

import { getDelistingAnnouncementActions, writeDismissal } from "./delistingExitAnnouncementsLogic";

export function DelistingExitAnnouncements() {
  const chainId = useSelector(selectChainId);
  const positionsInfoData = useSelector(selectPositionsInfoData);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  // Maps a toast id to the signature of the set it currently displays, to avoid redundant re-renders
  // while still refreshing when the affected set changes.
  const shownSignatures = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const { toShow, toDismiss } = getDelistingAnnouncementActions({
      chainId,
      positionsInfoData,
      depositMarketTokensData,
      marketsInfoData,
      now: Date.now(),
    });

    for (const id of toDismiss) {
      if (shownSignatures.current.has(id)) {
        toast.dismiss(id);
        shownSignatures.current.delete(id);
      }
    }

    for (const item of toShow) {
      const signature = [...item.markets].sort().join(",");
      if (shownSignatures.current.get(item.id) === signature) {
        continue;
      }
      shownSignatures.current.set(item.id, signature);

      // Render the optional action link inline in the body, separated by a blank line.
      const body = item.link ? (
        <>
          {item.bodyText}
          <br />
          <br />
          <Link to={item.link.href} className="link-underline hover:text-blue-300">
            {item.link.text}
          </Link>
        </>
      ) : (
        item.bodyText
      );

      toast.custom(
        (t) => (
          <EventToast
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            event={{
              id: item.id,
              title: item.title,
              bodyText: body,
              endDate: "",
            }}
            id={item.id}
            toast={t}
            variant="warning"
            onClick={() => {
              toast.dismiss(item.id);
              shownSignatures.current.delete(item.id);
              writeDismissal(item.id, item.markets, Date.now());
            }}
          />
        ),
        { id: item.id, style: {} }
      );
    }
  }, [chainId, positionsInfoData, depositMarketTokensData, marketsInfoData]);

  return null;
}
