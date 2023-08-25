export const Profiler = () => {
  const start = new Date();
  const profile: Array<[string, number]> = [];
  let last = start;

  return Object.assign((msg: string) => {
    const now = new Date();
    const time = now.getTime() - last.getTime();
    profile.push([msg, time]);
    last = now;
    return time;
  }, {
    getTime() {
      return last.getTime() - start.getTime();
    },
    report() {
      // eslint-disable-next-line no-console
      console.groupCollapsed("Profiling report");
      // eslint-disable-next-line no-console
      for (const [m, time] of profile) console.info(`  • ${m}: +${time}ms`);
      // eslint-disable-next-line no-console
      console.info("Total time:", this.getTime());
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  });
};
