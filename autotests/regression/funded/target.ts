export function validateFundedTarget(value: string | undefined) {
  if (!value) throw new Error("Set REGRESSION_BASE_URL to the deployed preview address");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("REGRESSION_BASE_URL must be a complete web address");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("REGRESSION_BASE_URL must be a complete web address");
  if (/^(?:your-(?:updated-)?preview|placeholder)(?:\.|$)/i.test(url.hostname))
    throw new Error(
      "REGRESSION_BASE_URL still contains the example placeholder. Replace it with a deployed preview address."
    );
}
