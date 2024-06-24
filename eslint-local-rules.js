const { ESLintUtils } = require("@typescript-eslint/experimental-utils");
const jsxUtils = require("eslint-plugin-react/lib/util/jsx");

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
              checker.typeToString(type) === "bigint" ||
              checker.typeToString(type) === "bigint | undefined" ||
              checker.typeToString(type) === "bigint | null"
            ) {
              context.report({
                node,
                messageId: "bigintNegation",
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
  "no-logical-bigint": createRule({
    name: "no-conditional-bigint",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow using bigint type in logical expressions",
        category: "Possible Errors",
        recommended: true,
      },
      schema: [],
      messages: {
        logicalBigint: "Using bigint in logical expressions is not allowed.",
      },
      hasSuggestions: true,
      fixable: true,
    },
    defaultOptions: [],
    create(context) {
      return {
        LogicalExpression(node) {
          if (checkBigInt(context, node)) {
            context.report({
              node,
              messageId: "logicalBigint",
            });
          }
        },
        IfStatement(node) {
          if (checkBigInt(context, node.test)) {
            context.report({
              node,
              messageId: "logicalBigint",
            });
          }
        },
      };
    },
  }),
};

function checkBigInt(context, node) {
  if (node.type === "Literal" || node.type === "Identifier" || node.type === "MemberExpression") {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();
    const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
    const type = checker.getTypeAtLocation(tsNode);

    return (
      checker.typeToString(type) === "bigint" ||
      checker.typeToString(type) === "bigint | undefined" ||
      checker.typeToString(type) === "bigint | null"
    );
  }

  if (node.type === "LogicalExpression") {
    if (node.operator !== "&&" && node.operator !== "||") return false;
    return checkBigInt(context, node.right) || checkBigInt(context, node.left);
  }

  return false;
}
