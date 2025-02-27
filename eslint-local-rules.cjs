// @ts-check
const { ESLintUtils } = require("@typescript-eslint/experimental-utils");
const { TypeFlags } = require("typescript");

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

module.exports = {
  "no-bigint-negation": createRule({
    name: "no-bigint-negation",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow negation of bigint or bigint | undefined variables",
        recommended: "error",
      },
      schema: [],
      messages: {
        bigintNegation: "Negation of bigint is not allowed.",
        bigintNegationDesc: "{{desc}}",
      },
      hasSuggestions: true,
      fixable: "code",
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
                    messageId: "bigintNegationDesc",
                    data: {
                      desc: "Use === undefined",
                    },
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === undefined"),
                      ];
                    },
                  },
                  {
                    messageId: "bigintNegationDesc",
                    data: {
                      desc: "Use === null",
                    },
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === null"),
                      ];
                    },
                  },
                  {
                    messageId: "bigintNegationDesc",
                    data: {
                      desc: "Use === 0n",
                    },
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
        recommended: "error",
      },
      schema: [],
      messages: {
        logicalBigint: "Using bigint in logical expressions is not allowed.",
      },
      hasSuggestions: false,
      fixable: undefined,
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
  "no-mixed-bigint-number-comparison": createRule({
    name: "no-mixed-bigint-number-comparison",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow comparing bigint values with regular numbers using comparison operators",
        recommended: "error",
      },
      schema: [],
      messages: {
        mixedZeroComparison: "Convert zero to bigint using 0n.",
        mixedComparisonChangeNumber: "Convert number to bigint using BigInt(Math.trunc({{value}}))",
      },
      hasSuggestions: true,
      fixable: "code",
    },

    defaultOptions: [],
    create(context) {
      const parserServices = ESLintUtils.getParserServices(context);
      const checker = parserServices.program.getTypeChecker();

      return {
        BinaryExpression(node) {
          if (["<", ">", "<=", ">="].includes(node.operator)) {
            const leftTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.left);
            const rightTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.right);

            const leftType = checker.getTypeAtLocation(leftTsNode);

            const rightType = checker.getTypeAtLocation(rightTsNode);

            const leftTypeString = checker.typeToString(leftType);
            const rightTypeString = checker.typeToString(rightType);
            leftType.isNumberLiteral;
            const leftIsBigInt =
              leftTypeString === "bigint" ||
              leftTypeString === "bigint | undefined" ||
              leftTypeString === "bigint | null" ||
              Boolean(leftType.flags & TypeFlags.BigIntLiteral);

            const rightIsBigInt =
              rightTypeString === "bigint" ||
              rightTypeString === "bigint | undefined" ||
              rightTypeString === "bigint | null" ||
              Boolean(rightType.flags & TypeFlags.BigIntLiteral);

            const leftIsNumber =
              leftTypeString === "number" ||
              leftTypeString === "number | undefined" ||
              leftTypeString === "number | null" ||
              leftType.isNumberLiteral();

            const rightIsNumber =
              rightTypeString === "number" ||
              rightTypeString === "number | undefined" ||
              rightTypeString === "number | null" ||
              rightType.isNumberLiteral();

            if ((leftIsBigInt && rightIsNumber) || (leftIsNumber && rightIsBigInt)) {
              const leftText = context.getSourceCode().getText(node.left);
              const rightText = context.getSourceCode().getText(node.right);

              const leftIsZero = leftText === "0";
              const rightIsZero = rightText === "0";

              if (leftIsZero && rightIsBigInt) {
                context.report({
                  node,
                  messageId: "mixedZeroComparison",
                  fix(fixer) {
                    return fixer.replaceText(node.left, "0n");
                  },
                });
                return;
              } else if (rightIsZero && leftIsBigInt) {
                context.report({
                  node,
                  messageId: "mixedZeroComparison",
                  fix(fixer) {
                    return fixer.replaceText(node.right, "0n");
                  },
                });
                return;
              }

              context.report({
                node,
                messageId: "mixedComparisonChangeNumber",
                data: {
                  value: leftIsBigInt && rightIsNumber ? rightText : leftText,
                },
                fix(fixer) {
                  if (leftIsBigInt && rightIsNumber) {
                    return fixer.replaceText(
                      node.right,
                      `BigInt(Math.trunc(${context.getSourceCode().getText(node.right)}))`
                    );
                  } else {
                    return fixer.replaceText(
                      node.left,
                      `BigInt(Math.trunc(${context.getSourceCode().getText(node.left)}))`
                    );
                  }
                },
              });
            }
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
