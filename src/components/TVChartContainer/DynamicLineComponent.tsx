import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useRef } from "react";
import { useLatest, usePrevious } from "react-use";

import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";
import type { IChartingLibraryWidget, IOrderLineAdapter } from "../../charting_library";
import { dynamicKeys } from "./constants";
import { DynamicChartLine, LineStyle } from "./types";

export function DynamicLineComponent({
  orderType,
  isLong,
  price,
  id,
  onEdit,
  onCancel,
  tvWidgetRef,
  isEdited,
  isPending,
}: {
  isEdited: boolean;
  isPending: boolean;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  onEdit: (id: string, price?: number) => void;
  onCancel: (id: string) => void;
} & DynamicChartLine) {
  const { _ } = useLingui();
  const lineApi = useRef<IOrderLineAdapter | undefined>(undefined);
  const latestOnEdit = useLatest(onEdit);
  const latestOnCancel = useLatest(onCancel);
  const latestPrice = useLatest(price);
  const prevIsPending = usePrevious(isPending);
  const prevIsEdited = usePrevious(isEdited);

  useEffect(() => {
    if (!tvWidgetRef.current?.activeChart().dataReady()) {
      return;
    }
    const chart = tvWidgetRef.current.activeChart();

    const range = chart.getVisibleRange();

    if (range.from === 0 && range.to === 0) {
      chart.onVisibleRangeChanged().subscribe(null, init, true);
    } else {
      init();
    }

    function init() {
      const predefinedKey = dynamicKeys[`${orderType}-${isLong ? "long" : "short"}`];
      const title = predefinedKey ? _(predefinedKey) : t`Unknown Order`;

      lineApi.current = chart
        .createOrderLine({ disableUndo: true })
        .setText(title)
        .setPrice(price)
        .setQuantity("\u270E")
        .setModifyTooltip(t`Edit Order`)
        .onModify(() => {
          latestOnEdit.current(id);
        })
        .setCancelTooltip(t`Cancel Order`)
        .onCancel(() => {
          latestOnCancel.current(id);
        })
        .onMove(() => {
          latestOnEdit.current(id, lineApi.current!.getPrice());
        })
        .setEditable(true)
        .setLineStyle(LineStyle.Dashed)
        .setLineLength(-200, "pixel")
        .setLineColor("#3a3e5e")

        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setBodyBackgroundColor("#3a3e5e")
        .setBodyBorderColor("#252a47")

        .setQuantityBackgroundColor("#16182e")
        .setQuantityFont(`normal 16pt "Relative", sans-serif`)
        .setQuantityBorderColor("#252a47")

        .setCancelButtonBackgroundColor("#16182e")
        .setCancelButtonBorderColor("#252a47")
        .setCancelButtonIconColor("#fff");
    }

    return () => {
      lineApi.current?.remove();
      lineApi.current = undefined;
    };
  }, [_, id, isLong, latestOnCancel, latestOnEdit, orderType, price, tvWidgetRef]);

  useEffect(() => {
    if (!lineApi.current || lineApi.current.getPrice() === price) {
      return;
    }

    lineApi.current.setPrice(price);
  }, [price]);

  useEffect(
    function handleDropEdit() {
      if (!lineApi.current) {
        return;
      }

      if (prevIsEdited && !isEdited && !(isPending || prevIsPending)) {
        lineApi.current.setPrice(price);
      }
    },
    [isEdited, isPending, prevIsEdited, prevIsPending, price]
  );

  useEffect(
    function handleDropPending() {
      if (!lineApi.current) {
        return;
      }

      if (prevIsPending && !isPending) {
        let counter = 0;
        const interval = setInterval(() => {
          const text = ".".repeat((counter % 3) + 1);
          lineApi.current?.setQuantity(text);
          counter++;
        }, 1000);

        setTimeout(() => {
          clearInterval(interval);
          lineApi.current?.setQuantity("\u270E");
          lineApi.current?.setPrice(latestPrice.current);
        }, FREQUENT_UPDATE_INTERVAL);
      }
    },
    [isPending, latestPrice, prevIsPending]
  );

  return null;
}
