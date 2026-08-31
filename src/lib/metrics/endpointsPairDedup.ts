export function createEndpointsPairDedup() {
  let lastReportedPrimary: string | undefined;
  let lastReportedSecondary: string | undefined;

  return function shouldReportEndpointsPair(primary: string, secondary: string | undefined): boolean {
    if (primary === lastReportedPrimary && secondary === lastReportedSecondary) {
      return false;
    }

    lastReportedPrimary = primary;
    lastReportedSecondary = secondary;

    return true;
  };
}
