const { ESLintUtils } = require("@typescript-eslint/experimental-utils");
const path = require("node:path");

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

module.exports = {
  "solana-import-boundaries": {
    meta: {
      type: "problem",
      docs: {
        description: "Enforce package and module boundaries for Solana imports",
      },
      schema: [],
      messages: {
        restrictedImport:
          "Import Solana packages only inside src/lib/solana, src/domain/gmsol or src/config/gmsol. Dynamically import an internal Solana module instead.",
        staticInternalImport:
          "Load Solana modules with a dynamic import() outside src/lib/solana, src/domain/gmsol and src/config/gmsol. Pure type imports and exports are allowed.",
      },
    },
    create(context) {
      const srcDir = path.resolve(__dirname, "src");
      const solanaDirs = [
        path.join(srcDir, "lib/solana"),
        path.join(srcDir, "domain/gmsol"),
        path.join(srcDir, "config/gmsol"),
      ];

      function isInternalSolanaModule(specifier) {
        const target = specifier.startsWith(".")
          ? path.resolve(path.dirname(context.getFilename()), specifier)
          : /^(lib|domain|config)\//.test(specifier)
            ? path.resolve(srcDir, specifier)
            : undefined;

        return (
          target !== undefined && solanaDirs.some((dir) => target === dir || target.startsWith(`${dir}${path.sep}`))
        );
      }

      function checkImport(node) {
        const source = node.source;
        if (!source) return;

        const specifier =
          source.type === "Literal"
            ? source.value
            : source.type === "TemplateLiteral" && source.expressions.length === 0
              ? source.quasis[0].value.cooked
              : undefined;
        if (typeof specifier !== "string") return;

        if (
          /^@(solana|solana-program|gmsol-labs)\//.test(specifier) ||
          specifier === "@privy-io/react-auth/solana" ||
          specifier.startsWith("@privy-io/react-auth/solana/")
        ) {
          context.report({ node: source, messageId: "restrictedImport" });
          return;
        }

        const isTypeOnly =
          node.importKind === "type" ||
          node.exportKind === "type" ||
          (node.specifiers?.length > 0 &&
            node.specifiers.every((specifier) => specifier.importKind === "type" || specifier.exportKind === "type"));

        if (node.type !== "ImportExpression" && !isTypeOnly && isInternalSolanaModule(specifier)) {
          context.report({ node: source, messageId: "staticInternalImport" });
        }
      }

      return {
        ImportDeclaration: checkImport,
        ExportNamedDeclaration: checkImport,
        ExportAllDeclaration: checkImport,
        ImportExpression: checkImport,
      };
    },
  },
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
