const webpack = require("webpack");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");

module.exports = function override(config) {
  config.resolve.plugins = config.resolve.plugins.filter((plugin) => !(plugin instanceof ModuleScopePlugin));
  // https://github.com/lingui/js-lingui/issues/1195
  // Adding loader to use for .po files to webpack
  const webpackLoaders = config.module.rules[0].oneOf;
  webpackLoaders.splice(webpackLoaders.length - 1, 0, {
    test: /\.po/,
    use: [
      {
        loader: "@lingui/loader",
      },
    ],
  });
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    stream: require.resolve("stream-browserify"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify/browser"),
    process: require.resolve("process"),
  });
  config.resolve.fallback = fallback;
  config.resolve.alias["@uniswap/v3-sdk"] = require.resolve("@uniswap/v3-sdk/dist/index.js");
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser.js",
      Buffer: ["buffer", "Buffer"],
    }),
  ]);
  return config;
};
