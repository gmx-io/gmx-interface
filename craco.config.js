module.exports = {
  babel: {
    plugins: [
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-transform-shorthand-properties',
      "@babel/plugin-proposal-logical-assignment-operators",
    ],
  },
  webpack: {
    configure: {
      module: {
        rules: [
          {
            type: 'javascript/auto',
            test: /\.mjs$/,
            use: [],
          },
        ],
      },
    },
  },
//   eslint: {
//     configure: {
//       rules: {
//         'no-unused-vars': 'off',
//       },
//     },
//   },
//   plugins: [
//     {
//       plugin: CracoLessPlugin,
//       options: {
//         lessLoaderOptions: {
//           lessOptions: {
//             modifyVars: { '@primary-color': '#2abdd2' },
//             javascriptEnabled: true,
//           },
//         },
//       },
//     },
//   ],
};