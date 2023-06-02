module.exports = function override(config) {
  // https://github.com/lingui/js-lingui/issues/1195
  // Adding loader to use for .po files to webpack
  const loaders = config.module.rules[1].oneOf;
  loaders.splice(loaders.length - 1, 0, {
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
  return config;
};
