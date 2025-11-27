export class Storage<TState extends Record<string, any>> {
  private state: Partial<TState>;

  constructor(public storageKey: string) {
    this.state = this.loadState();
  }

  get<K extends keyof TState>(key: K): TState[K] | undefined {
    return this.state[key];
  }

  set<K extends keyof TState>(key: K, value: TState[K]): void {
    this.state[key] = value;
    this.saveState();
  }

  getState(): Partial<TState> {
    return this.state;
  }

  loadState(): Partial<TState> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      //
    }

    return {};
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      //
    }
  }
}
