import { sequentialTimedScheduler } from "./sequentialTimedScheduler";
import { sleep } from "./sleep";

describe("sequentialTimedScheduler", () => {
  it("should call the callback exactly after the interval when the runner finishes quickly", async () => {
    const runner = jest.fn(() => Promise.resolve());
    const cb = jest.fn();

    await sequentialTimedScheduler(runner, 100, cb);

    expect(runner).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(0);

    await sleep(100);

    expect(runner).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("should call the callback exactly after the interval takes half the interval", async () => {
    const runner = jest.fn(() => sleep(50));
    const cb = jest.fn();

    await sequentialTimedScheduler(runner, 100, cb);

    expect(runner).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(0);

    await sleep(50); // the runner itself takes 50ms, so the total time is 100ms

    expect(runner).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("should call the callback right after the runner finishes when the runner takes longer than the interval", async () => {
    const runner = jest.fn(() => sleep(200));
    const cb = jest.fn();

    await sequentialTimedScheduler(runner, 100, cb);

    expect(runner).toHaveBeenCalledTimes(1);

    // wait next macro task
    await sleep(0);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
