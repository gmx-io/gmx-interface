const path = require("path");
const fs = require("fs");
const rewireBabelLoader = require("react-app-rewire-babel-loader");


const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = function override(config, _env) {
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: "javascript/auto",
  });
  config = rewireBabelLoader.include(config, resolveApp("node_modules/viem"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/@turnkey"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/superstruct"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/@dynamic-labs"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/@walletconnect"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/unstorage"));
  config = rewireBabelLoader.include(config, resolveApp("node_modules/@turnkey/solana/node_modules/@solana"));
  return config;
};
