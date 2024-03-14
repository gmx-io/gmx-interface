/**
 * @see https://jestjs.io/docs/configuration#globalsetup-string
 */
export default async function (_globalConfig, _projectConfig) {
  globalThis.process.env.TZ = "Asia/Dubai";
}
