import { createStore } from "zustand/vanilla";
import { Bar } from "./types";

type ActiveChartInfo = {
  ticker: string;
  period: string;
  bars: Bar[];
  isChartRady: boolean;
  reset: () => void;
};

const activeChartStore = createStore<ActiveChartInfo>((set) => ({
  ticker: "",
  period: "",
  bars: [],
  isChartRady: false,
  reset: () => set({ ticker: "", period: "", bars: [], isChartRady: false }),
}));

export default activeChartStore;
