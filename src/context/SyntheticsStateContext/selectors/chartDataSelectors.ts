import type { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectChartDataProvider = (s: SyntheticsState) => s.globals.chartDataProvider;
