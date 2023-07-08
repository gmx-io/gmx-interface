import { BigNumberish } from "ethers";
import { createStore } from "zustand/vanilla";

type CurrentPriceStore = {
  v1Prices: Promise<{ [address: string]: BigNumberish }>;
  updateV1Price: (prices: Promise<{ [address: string]: BigNumberish }>) => void;
};

const currentPriceStore = createStore<CurrentPriceStore>((set) => ({
  v1Prices: Promise.resolve({}),
  updateV1Price: (prices) => set({ v1Prices: prices }),
}));

export default currentPriceStore;
