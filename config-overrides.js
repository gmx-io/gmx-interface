const path = require("path");
const { override } = require("customize-cra");
const { babelInclude } = require("customize-cra");

module.exports = override(
  babelInclude([path.resolve("src"), path.resolve("node_modules/wagmi"), path.resolve("node_modules/@wagmi")])
);
