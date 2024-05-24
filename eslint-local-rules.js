const { ESLintUtils } = require("@typescript-eslint/experimental-utils");

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

module.exports = {
  "no-bigint-negation": createRule({
    name: "no-bigint-negation",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow negation of bigint or bigint | undefined variables",
        category: "Possible Errors",
        recommended: true,
      },
      schema: [],
      messages: {
        bigintNegation: "Negation of bigint is not allowed.",
      },
      hasSuggestions: true,
      fixable: true,
    },
    defaultOptions: [],
    create(context) {
      const parserServices = ESLintUtils.getParserServices(context);
      const checker = parserServices.program.getTypeChecker();

      return {
        UnaryExpression(node) {
          if (node.operator === "!") {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.argument);
            const type = checker.getTypeAtLocation(tsNode);
            if (
              // checker.typeToString(type) === "bigint" ||
              checker.typeToString(type) === "bigint | undefined"
              // checker.typeToString(type) === "bigint | null"
            ) {
              context.report({
                node,
                messageId: "bigintNegation",
                fix(fixer) {
                  return [
                    fixer.removeRange([node.range[0], node.range[0] + 1]),
                    fixer.insertTextAfter(node.argument, " === undefined"),
                  ];
                },
                suggest: [
                  {
                    desc: "Use === undefined",
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === undefined"),
                      ];
                    },
                  },
                  {
                    desc: "Use === null",
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === null"),
                      ];
                    },
                  },
                  {
                    desc: "Use === 0n",
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === 0n"),
                      ];
                    },
                  },
                ],
              });
            }
          }
        },
      };
    },
  }),
};
