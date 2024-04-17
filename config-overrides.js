const webpack = require("webpack");

function override(config) {
  // https://github.com/lingui/js-lingui/issues/1195
  // Adding loader to use for .po files to webpack
  const loaders = config.module.rules.find((rule) => Array.isArray(rule.oneOf));
  loaders.oneOf.splice(loaders.length - 1, 0, {
    test: /\.po/,
    use: [
      {
        loader: "@lingui/loader",
      },
    ],
  });

  config.resolve.fallback = {
    os: false,
    http: false,
    https: false,
    stream: false,
    crypto: false,
  };
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
  ]);

  return config;
}

override.jest = function (config) {
  config.transform = {
    "node_modules/multiformats/(basics|block|cid)$": "react-app-rewired/scripts/utils/babelTransform",
    ...config.transform,
  };
  config.transformIgnorePatterns = ["node_modules/(?!multiformats|wagmi)/"];

  return config;
};

module.exports = override;
