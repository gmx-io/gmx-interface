const { ESLintUtils } = require("@typescript-eslint/utils");
const ts = require("typescript");

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

function isBigIntType(checker, type) {
  const typeString = checker.typeToString(type);
  if (
    typeString === "bigint" ||
    typeString === "bigint | undefined" ||
    typeString === "bigint | null"
  ) {
    return true;
  }
  // Check for bigint literal types (e.g., 1n, 2n)
  if (type.flags & ts.TypeFlags.BigIntLiteral) {
    return true;
  }
  // Check union types containing bigint
  if (type.isUnion && type.isUnion()) {
    return type.types.some((t) => t.flags & ts.TypeFlags.BigInt || t.flags & ts.TypeFlags.BigIntLiteral);
  }
  return false;
}

module.exports = {
  "no-bigint-negation": createRule({
    name: "no-bigint-negation",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow negation of bigint or bigint | undefined variables",
        requiresTypeChecking: true,
      },
      schema: [],
      messages: {
        bigintNegation: "Negation of bigint is not allowed.",
      },
      hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
      const services = ESLintUtils.getParserServices(context);
      const checker = services.program.getTypeChecker();

      return {
        UnaryExpression(node) {
          if (node.operator === "!") {
            const tsNode = services.esTreeNodeToTSNodeMap.get(node.argument);
            const type = checker.getTypeAtLocation(tsNode);
            if (isBigIntType(checker, type)) {
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
    name: "no-logical-bigint",
    meta: {
      type: "problem",
      docs: {
        description: "Disallow using bigint type in logical expressions",
        requiresTypeChecking: true,
      },
      schema: [],
      messages: {
        logicalBigint: "Using bigint in logical expressions is not allowed.",
      },
      hasSuggestions: true,
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
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const tsNode = services.esTreeNodeToTSNodeMap.get(node);
    const type = checker.getTypeAtLocation(tsNode);
    return isBigIntType(checker, type);
  }

  if (node.type === "LogicalExpression") {
    if (node.operator !== "&&" && node.operator !== "||") return false;
    return checkBigInt(context, node.right) || checkBigInt(context, node.left);
  }

  return false;
}
