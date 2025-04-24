type ProgressiveStep<Input, Output> = {
  execute: (input: Input) => Promise<Output>;
  isBlocking?: boolean;
};

type ChainState = "pending" | "running" | "complete" | "error" | "cancelled";

type StepResult<T> = {
  value: T | undefined;
  state: ChainState;
  error?: Error;
};

type ProgressiveChainOptions = {
  onStepComplete?: (stepIndex: number, result: any) => void;
  onError?: (error: Error, stepIndex: number) => void;
  onStateChange?: (state: ChainState) => void;
};

export class ProgressiveChain<FinalOutput> {
  private state: ChainState = "pending";
  private results: StepResult<any>[] = [];
  private abortController = new AbortController();
  private activePromises: Promise<any>[] = [];

  private constructor(
    private readonly steps: ProgressiveStep<any, any>[],
    private readonly options?: ProgressiveChainOptions
  ) {
    this.results = steps.map(() => ({ value: undefined, state: "pending" }));
  }

  static from<T>(steps: ProgressiveStep<any, any>[], options?: ProgressiveChainOptions) {
    return new ProgressiveChain<T>(steps, options);
  }

  static create<T>() {
    return new ChainBuilder<undefined, T>();
  }

  private setState(newState: ChainState) {
    this.state = newState;
    this.options?.onStateChange?.(newState);
  }

  private updateStepResult(index: number, result: Partial<StepResult<any>>) {
    this.results[index] = { ...this.results[index], ...result };
    if (result.value !== undefined) {
      this.options?.onStepComplete?.(index, result.value);
    }
  }

  async execute(): Promise<FinalOutput> {
    this.setState("running");
    let lastResult: any = undefined;

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];

        if (this.state === "cancelled" && !step.isBlocking) {
          this.updateStepResult(i, { state: "cancelled" });
          continue;
        }

        const promise = step.execute(lastResult);
        this.activePromises.push(promise);

        try {
          const signal = this.abortController.signal;
          const result = await Promise.race([
            promise,
            new Promise((_, reject) => {
              signal.addEventListener("abort", () => reject(new Error("cancelled")));
            }),
          ]);

          this.updateStepResult(i, { value: result, state: "complete" });
          lastResult = result;
        } catch (error) {
          this.updateStepResult(i, { error, state: "error" });
          this.options?.onError?.(error, i);

          if (step.isBlocking) {
            throw error;
          }
        } finally {
          this.activePromises = this.activePromises.filter((p) => p !== promise);
        }
      }

      this.setState("complete");
      return lastResult as FinalOutput;
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  getCurrentValue(): FinalOutput | undefined {
    const lastResult = this.results[this.results.length - 1];
    return lastResult?.value;
  }

  getStepResults(): readonly StepResult<any>[] {
    return this.results;
  }

  getState(): ChainState {
    return this.state;
  }

  cancel() {
    this.setState("cancelled");
    this.abortController.abort();
  }
}

export class ChainBuilder<Input, Output> {
  private steps: ProgressiveStep<any, any>[] = [];

  a: Input;

  then<NewOutput>(
    fn: (input: Output) => Promise<NewOutput>,
    options: { isBlocking?: boolean } = {}
  ): ChainBuilder<Output, NewOutput> {
    this.steps.push({ execute: fn, ...options });
    return this as unknown as ChainBuilder<Output, NewOutput>;
  }

  parallel<NewOutput>(
    fns: ((input: Output) => Promise<NewOutput>)[],
    options: { isBlocking?: boolean } = {}
  ): ChainBuilder<Output, NewOutput[]> {
    this.steps.push({
      execute: (input: Output) => Promise.all(fns.map((fn) => fn(input))),
      ...options,
    });
    return this as unknown as ChainBuilder<Output, NewOutput[]>;
  }

  build(options?: ProgressiveChainOptions): ProgressiveChain<Output> {
    return ProgressiveChain.from(this.steps, options);
  }
}
