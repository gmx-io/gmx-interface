import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest, usePrevious } from "react-use";

import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { OrderType } from "domain/synthetics/orders";
import { helperToast } from "lib/helperToast";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { orderTypeToTitle } from "./constants";
import { DynamicChartLine, LineStyle } from "./types";
import type { IChartingLibraryWidget, IOrderLineAdapter } from "../../charting_library";

const BUTTON_BACKGROUND_COLOR = "#121421";
const BORDER_COLOR = "#9295ad";
const BODY_ERROR_BACKGROUND_COLOR = "#831e2d";
const LOADER_ANIMATION_STEP_MS = 1000;

export function DynamicLine({
  orderType,
  isLong,
  price,
  id,
  onEdit,
  onCancel,
  tvWidgetRef,
  isMobile,
  isEdited,
  isPending,
  getError,
  marketName,
  lineLength,
}: {
  isMobile: boolean;
  isEdited: boolean;
  isPending: boolean;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  onEdit: (id: string, price?: number) => void;
  onCancel: (id: string) => void;
  getError: (id: string, price: number) => string | undefined;
  lineLength: number;
} & Omit<DynamicChartLine, "updatedAtTime">) {
  const { _ } = useLingui();
  const { theme } = useTheme();
  const lineApi = useRef<IOrderLineAdapter | undefined>(undefined);
  const latestOnEdit = useLatest(onEdit);
  const latestOnCancel = useLatest(onCancel);
  const latestPrice = useLatest(price);
  const prevIsPending = usePrevious(isPending);
  const prevIsEdited = usePrevious(isEdited);

  const [error, setError] = useState<string | undefined>(undefined);

  const orderLineColor =
    orderType === OrderType.LimitDecrease || orderType === OrderType.StopLossDecrease
      ? colors.red[500][theme]
      : isLong
        ? colors.green[500][theme]
        : colors.red[500][theme];

  const title = useMemo(() => {
    const predefinedKey = orderTypeToTitle[`${orderType}-${isLong ? "long" : "short"}`];
    const title = predefinedKey ? _(predefinedKey) : t`Unknown Order`;
    return `${title} - ${marketName}`;
  }, [_, isLong, orderType, marketName]);

  useEffect(() => {
    const chart = tvWidgetRef.current?.activeChart();
    if (!chart) {
      return;
    }

    let cancelled = false;

    const init = () => {
      if (cancelled) {
        return;
      }

      lineApi.current?.remove();

      lineApi.current = chart!
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
        .setEditable(true)
        .setLineStyle(LineStyle.Dashed)
        .setLineColor(orderLineColor)

        .setBodyFont(`normal 12pt "Relative", sans-serif`)
        .setBodyTextColor("#fff")
        .setBodyBackgroundColor(orderLineColor)
        .setBodyBorderColor(orderLineColor)

        .setQuantityBackgroundColor(BUTTON_BACKGROUND_COLOR)
        .setQuantityFont(`normal 16pt "Relative", sans-serif`)
        .setQuantityBorderColor(orderLineColor)

        .setCancelButtonBackgroundColor(BUTTON_BACKGROUND_COLOR)
        .setCancelButtonBorderColor(BORDER_COLOR)
        .setCancelButtonIconColor("#fff");

      if (!isMobile) {
        lineApi.current
          .setLineLength(lineLength, "pixel")
          .onMoving(() => {
            const error = getError(id, lineApi.current!.getPrice());
            setError(error);
          })
          .onMove(() => {
            const error = getError(id, lineApi.current!.getPrice());

            if (error) {
              helperToast.error(
                <>
                  <span className="text-body-large font-medium">
                    <Trans>The order could not be updated</Trans>
                  </span>
                  <br />
                  <br />
                  {error}
                </>
              );
              lineApi.current!.setPrice(latestPrice.current);
              lineApi.current!.setBodyBackgroundColor(orderLineColor);
              lineApi.current!.setBodyBorderColor(orderLineColor);
              lineApi.current!.setText(title);
              return;
            }

            latestOnEdit.current(id, lineApi.current!.getPrice());
          });
      } else {
        lineApi.current.setLineLength(-1, "pixel");
      }
    };

    chart.dataReady(() => {
      if (cancelled) {
        return;
      }

      const range = chart.getVisibleRange();

      if (range.from === 0 && range.to === 0) {
        chart.onVisibleRangeChanged().subscribe(null, init, true);
      } else {
        init();
      }
    });

    return () => {
      cancelled = true;
      chart.onVisibleRangeChanged().unsubscribe(null, init);

      lineApi.current?.remove();
      lineApi.current = undefined;
    };
  }, [
    _,
    getError,
    id,
    isLong,
    isMobile,
    latestOnCancel,
    latestOnEdit,
    latestPrice,
    lineLength,
    orderType,
    orderLineColor,
    price,
    title,
    tvWidgetRef,
  ]);

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
        lineApi.current?.setBodyBackgroundColor(orderLineColor);
        lineApi.current?.setBodyBorderColor(orderLineColor);
        lineApi.current?.setText(title);
      }
    },
    [isEdited, isPending, orderLineColor, prevIsEdited, prevIsPending, price, title]
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
        }, LOADER_ANIMATION_STEP_MS);

        setTimeout(() => {
          clearInterval(interval);
          lineApi.current?.setQuantity("\u270E");
          lineApi.current?.setPrice(latestPrice.current);
          lineApi.current?.setBodyBackgroundColor(orderLineColor);
          lineApi.current?.setBodyBorderColor(orderLineColor);
          lineApi.current?.setText(title);
        }, FREQUENT_UPDATE_INTERVAL);
      }
    },
    [isPending, latestPrice, orderLineColor, prevIsPending, title]
  );

  useEffect(() => {
    if (error) {
      lineApi.current?.setBodyBackgroundColor(BODY_ERROR_BACKGROUND_COLOR);
      lineApi.current?.setBodyBorderColor(BODY_ERROR_BACKGROUND_COLOR);
      lineApi.current?.setText(error);
    } else {
      lineApi.current?.setBodyBackgroundColor(orderLineColor);
      lineApi.current?.setBodyBorderColor(orderLineColor);
      lineApi.current?.setText(title);
    }
  }, [error, orderLineColor, title]);

  return null;
}
