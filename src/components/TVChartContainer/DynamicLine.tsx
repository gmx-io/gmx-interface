import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLatest, usePrevious } from "react-use";

import { useTheme } from "context/ThemeContext/ThemeContext";
import { OrderType } from "domain/synthetics/orders";
import { helperToast } from "lib/helperToast";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

import { chartLabelColors, orderTypeToTitle } from "./constants";
import { DynamicChartLine, LineStyle } from "./types";
import type { IChartingLibraryWidget, IOrderLineAdapter } from "../../charting_library";

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
  bodyFontSizePt = 12,
}: {
  isMobile: boolean;
  isEdited: boolean;
  isPending: boolean;
  tvWidgetRef: React.RefObject<IChartingLibraryWidget>;
  onEdit: (id: string, price?: number) => void;
  onCancel: (id: string) => void;
  getError: (id: string, price: number) => string | undefined;
  lineLength: number;
  bodyFontSizePt?: number;
} & Omit<DynamicChartLine, "updatedAtTime">) {
  const { _ } = useLingui();
  const { theme } = useTheme();
  const lineApi = useRef<IOrderLineAdapter | undefined>(undefined);
  const latestOnEdit = useLatest(onEdit);
  const latestOnCancel = useLatest(onCancel);
  const latestPrice = useLatest(price);
  const lineLengthRef = useLatest(lineLength);
  const prevIsPending = usePrevious(isPending);
  const prevIsEdited = usePrevious(isEdited);

  const [error, setError] = useState<string | undefined>(undefined);

  const isGreen = orderType !== OrderType.LimitDecrease && orderType !== OrderType.StopLossDecrease && isLong;

  const palette = isGreen ? chartLabelColors.green : chartLabelColors.red;

  const orderLineColor = palette.text[theme];
  const orderBodyBgBorderColor = palette.bg[theme];
  const orderBodyTextColor = palette.text[theme];

  const title = useMemo(() => {
    const directionText = isLong ? t`Long` : t`Short`;
    const orderTypeTitle = orderTypeToTitle[orderType];
    const orderTitleText = orderTypeTitle ? _(orderTypeTitle) : t`Unknown Order`;
    return `${directionText} ${marketName} · ${orderTitleText}`;
  }, [_, isLong, marketName, orderType]);

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
        .setExtendLeft(false)
        .setEditable(true)
        .setLineStyle(LineStyle.Dashed)
        .setLineColor(orderLineColor)

        .setBodyFont(`normal ${bodyFontSizePt}pt "Relative", sans-serif`)
        .setBodyTextColor(orderBodyTextColor)
        .setBodyBackgroundColor(orderBodyBgBorderColor)
        .setBodyBorderColor(orderBodyBgBorderColor)

        .setQuantityBackgroundColor(chartLabelColors.button.bg[theme])
        .setQuantityFont(`normal ${bodyFontSizePt + 4}pt "Relative", sans-serif`)
        .setQuantityBorderColor(orderBodyBgBorderColor)

        .setCancelButtonBackgroundColor(chartLabelColors.button.bg[theme])
        .setCancelButtonBorderColor(orderBodyBgBorderColor)
        .setCancelButtonIconColor(chartLabelColors.button.icon[theme]);

      if (!isMobile) {
        lineApi.current
          .setLineLength(lineLengthRef.current, "pixel")
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
              lineApi.current!.setBodyBackgroundColor(orderBodyBgBorderColor);
              lineApi.current!.setBodyBorderColor(orderBodyBgBorderColor);
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
    lineLengthRef,
    orderType,
    orderLineColor,
    orderBodyBgBorderColor,
    orderBodyTextColor,
    price,
    title,
    tvWidgetRef,
    bodyFontSizePt,
    theme,
  ]);

  useEffect(() => {
    if (!lineApi.current || isMobile) {
      return;
    }

    lineApi.current.setLineLength(lineLength, "pixel");
  }, [isMobile, lineLength]);

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
        lineApi.current?.setBodyBackgroundColor(orderBodyBgBorderColor);
        lineApi.current?.setBodyBorderColor(orderBodyBgBorderColor);
        lineApi.current?.setText(title);
      }
    },
    [isEdited, isPending, orderBodyBgBorderColor, prevIsEdited, prevIsPending, price, title]
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
          lineApi.current?.setBodyBackgroundColor(orderBodyBgBorderColor);
          lineApi.current?.setBodyBorderColor(orderBodyBgBorderColor);
          lineApi.current?.setText(title);
        }, FREQUENT_UPDATE_INTERVAL);
      }
    },
    [isPending, latestPrice, orderBodyBgBorderColor, prevIsPending, title]
  );

  useEffect(() => {
    if (error) {
      lineApi.current?.setBodyBackgroundColor(chartLabelColors.error.bg[theme]);
      lineApi.current?.setBodyBorderColor(chartLabelColors.error.bg[theme]);
      lineApi.current?.setText(error);
    } else {
      lineApi.current?.setBodyBackgroundColor(orderBodyBgBorderColor);
      lineApi.current?.setBodyBorderColor(orderBodyBgBorderColor);
      lineApi.current?.setText(title);
    }
  }, [error, orderBodyBgBorderColor, title, theme]);

  return null;
}
