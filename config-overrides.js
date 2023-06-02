module.exports = function override(config, env) {
  config.resolve.fallback = {
    os: false,
    http: false,
    https: false,
    stream: false,
    crypto: false,
  };
  return config;
};
