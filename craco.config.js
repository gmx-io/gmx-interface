module.exports = {
  babel: {
    plugins: [
      "@babel/plugin-proposal-nullish-coalescing-operator",
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-transform-shorthand-properties",
      "@babel/plugin-proposal-logical-assignment-operators",
    ],
  },
  webpack: {
    configure: {
      module: {
        rules: [
          {
            type: "javascript/auto",
            test: /\.mjs$/,
            use: [],
          },
        ],
      },
    },
    devServer: (config) => {
      console.log("\n\nconfig", config, "\n\n");
      console.log("\n\nconfig.devServer", config.devServer, "\n\n");
      config.headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
      };

      config.allowedHosts = "all";

      return config;
    },
    eslint: null,
  },
};
