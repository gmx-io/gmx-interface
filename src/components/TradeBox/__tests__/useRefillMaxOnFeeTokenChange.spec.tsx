import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRefillMaxOnFeeTokenChange } from "../hooks/useRefillMaxOnFeeTokenChange";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

type Props = Parameters<typeof useRefillMaxOnFeeTokenChange>[0];

function Harness({ params }: { params: Props }) {
  useRefillMaxOnFeeTokenChange(params);
  return null;
}

function setup(initial: Omit<Props, "onMaxClick">) {
  const onMaxClick = vi.fn();
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  let props: Props = { ...initial, onMaxClick };
  const utils = render(<Harness params={props} />);

  const update = (next: Partial<Props>) => {
    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
    props = { ...props, ...next };
    utils.rerender(<Harness params={props} />);
  };

  return { onMaxClick, update };
}

describe("useRefillMaxOnFeeTokenChange", () => {
  afterEach(cleanup);

  it("fills Max again once the fee for the new token is ready", () => {
    const { onMaxClick, update } = setup({
      feeTokenAddress: USDC,
      payTokenAddress: USDC,
      inputValue: "10",
      selected: "max",
      isReady: true,
      maxAvailableAmount: 10n,
    });

    // the holdback appears, so the old fill no longer reads as Max
    update({ feeTokenAddress: WETH, selected: undefined, isReady: false, maxAvailableAmount: 9n });
    expect(onMaxClick).not.toHaveBeenCalled();

    update({ isReady: true, maxAvailableAmount: 8n });
    expect(onMaxClick).toHaveBeenCalledTimes(1);

    update({ maxAvailableAmount: 7n });
    expect(onMaxClick).toHaveBeenCalledTimes(1);
  });

  it("leaves a typed amount alone", () => {
    const { onMaxClick, update } = setup({
      feeTokenAddress: USDC,
      payTokenAddress: USDC,
      inputValue: "10",
      selected: undefined,
      isReady: true,
      maxAvailableAmount: 10n,
    });

    update({ feeTokenAddress: WETH, maxAvailableAmount: 8n });
    expect(onMaxClick).not.toHaveBeenCalled();
  });

  it("doesn't refill while the fee token stays the same", () => {
    const { onMaxClick, update } = setup({
      feeTokenAddress: WETH,
      payTokenAddress: USDC,
      inputValue: "10",
      selected: "max",
      isReady: true,
      maxAvailableAmount: 10n,
    });

    update({ selected: undefined, maxAvailableAmount: 8n });
    expect(onMaxClick).not.toHaveBeenCalled();
  });

  it("keeps the amount when the user switches the pay token", () => {
    const { onMaxClick, update } = setup({
      feeTokenAddress: undefined,
      payTokenAddress: WETH,
      inputValue: "10",
      selected: "max",
      isReady: true,
      maxAvailableAmount: 10n,
    });

    update({ feeTokenAddress: WETH });
    update({ feeTokenAddress: USDC, payTokenAddress: USDC, selected: undefined, maxAvailableAmount: 8n });
    expect(onMaxClick).not.toHaveBeenCalled();
  });

  it("drops the refill when the user types while the new fee is estimated", () => {
    const { onMaxClick, update } = setup({
      feeTokenAddress: USDC,
      payTokenAddress: USDC,
      inputValue: "10",
      selected: "max",
      isReady: true,
      maxAvailableAmount: 10n,
    });

    update({ feeTokenAddress: WETH, selected: undefined, isReady: false });
    update({ inputValue: "5" });
    update({ isReady: true, maxAvailableAmount: 8n });
    expect(onMaxClick).not.toHaveBeenCalled();
  });
});
