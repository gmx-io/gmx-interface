// @ts-check
const { ESLintUtils } = require("@typescript-eslint/experimental-utils");
const ts = require("typescript");

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

module.exports = {
  /**
   * Custom rule: Merge duplicate imports from the same module.
   * Merges `import type { A }` and `import { B }` from same module into `import { A, B }`.
   * Works with import/no-duplicates but handles type imports properly.
   */
  "merge-type-imports": createRule({
    name: "merge-type-imports",
    meta: {
      type: "suggestion",
      docs: {
        description: "Merge import type with regular import from same module",
        recommended: false,
      },
      schema: [],
      messages: {
        mergeImports: "Merge type-only import with regular import from '{{module}}'.",
      },
      fixable: "code",
    },
    defaultOptions: [],
    create(context) {
      const importsByModule = new Map();

      return {
        ImportDeclaration(node) {
          const moduleName = node.source.value;

          if (!importsByModule.has(moduleName)) {
            importsByModule.set(moduleName, []);
          }
          importsByModule.get(moduleName).push(node);
        },
        "Program:exit"() {
          for (const [moduleName, imports] of importsByModule) {
            if (imports.length < 2) continue;

            // Check if there's a mix of type-only and regular imports
            const typeOnlyImports = imports.filter((imp) => imp.importKind === "type");
            const regularImports = imports.filter((imp) => imp.importKind !== "type");

            // Only handle case where we have both type-only and regular imports
            if (typeOnlyImports.length === 0 || regularImports.length === 0) continue;

            // Report on the first type-only import
            for (const typeImport of typeOnlyImports) {
              // Skip if has default or namespace import
              if (
                typeImport.specifiers.some(
                  (s) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier"
                )
              )
                continue;

              const namedSpecifiers = typeImport.specifiers
                .filter((s) => s.type === "ImportSpecifier")
                .map((s) => {
                  const imported = s.imported.name;
                  const local = s.local.name;
                  return imported === local ? imported : `${imported} as ${local}`;
                });

              if (namedSpecifiers.length === 0) continue;

              // Find the first regular import to merge into (can have default import)
              const targetImport = regularImports.find(
                (imp) => !imp.specifiers.some((s) => s.type === "ImportNamespaceSpecifier")
              );

              if (!targetImport) continue;

              context.report({
                node: typeImport,
                messageId: "mergeImports",
                data: { module: moduleName },
                fix(fixer) {
                  const fixes = [];

                  // Remove the type-only import entirely
                  fixes.push(fixer.remove(typeImport));

                  // Add the specifiers to the regular import
                  const targetNamedImports = targetImport.specifiers.filter((s) => s.type === "ImportSpecifier");
                  const targetDefaultImport = targetImport.specifiers.find((s) => s.type === "ImportDefaultSpecifier");

                  if (targetNamedImports.length > 0) {
                    // Has existing named imports - add to them
                    const lastSpecifier = targetNamedImports[targetNamedImports.length - 1];
                    fixes.push(fixer.insertTextAfter(lastSpecifier, `, ${namedSpecifiers.join(", ")}`));
                  } else if (targetDefaultImport) {
                    // Only has default import - add named imports after it
                    // e.g., `import Modal from "./Modal"` -> `import Modal, { ModalProps } from "./Modal"`
                    fixes.push(fixer.insertTextAfter(targetDefaultImport, `, { ${namedSpecifiers.join(", ")} }`));
                  }

                  return fixes;
                },
              });
            }
          }
        },
      };
    },
  }),

  /**
   * Custom rule: Remove inline `type` specifiers from imports.
   * Converts `import { type A, B }` to `import { A, B }`.
   */
  "no-inline-type-specifiers": createRule({
    name: "no-inline-type-specifiers",
    meta: {
      type: "suggestion",
      docs: {
        description: "Remove inline type specifiers from imports",
        recommended: false,
      },
      schema: [],
      messages: {
        noInlineType: "Remove inline 'type' specifier from '{{name}}'.",
      },
      fixable: "code",
    },
    defaultOptions: [],
    create(context) {
      const sourceCode = context.getSourceCode();

      return {
        ImportDeclaration(node) {
          // Skip if already a type-only import
          if (node.importKind === "type") {
            return;
          }

          // Find specifiers with inline type
          const inlineTypeSpecifiers = node.specifiers.filter(
            (s) => s.type === "ImportSpecifier" && s.importKind === "type"
          );

          if (inlineTypeSpecifiers.length === 0) {
            return;
          }

          // Report and fix each inline type specifier
          for (const specifier of inlineTypeSpecifiers) {
            context.report({
              node: specifier,
              messageId: "noInlineType",
              data: { name: /** @type {any} */ (specifier).imported.name },
              fix(fixer) {
                // Find the 'type' keyword and remove it
                const tokens = sourceCode.getTokens(specifier);
                const typeToken = tokens.find((t) => t.type === "Identifier" && t.value === "type");
                if (typeToken) {
                  // Remove 'type ' (including the space after)
                  const nextToken = sourceCode.getTokenAfter(typeToken);
                  if (nextToken) {
                    return fixer.removeRange([typeToken.range[0], nextToken.range[0]]);
                  }
                }
                return null;
              },
            });
          }
        },
      };
    },
  }),

  /**
   * Custom rule: Convert imports to `import type` ONLY when ALL imports are type-only.
   * Leaves mixed imports (some types, some values) completely unchanged.
   * No inline `type` specifiers, no splitting.
   */
  "prefer-type-imports": createRule({
    name: "prefer-type-imports",
    meta: {
      type: "suggestion",
      docs: {
        description: "Prefer import type when all imports are type-only, ignore mixed imports",
        recommended: false,
      },
      schema: [],
      messages: {
        preferTypeImport: "All imports from '{{module}}' are type-only. Use `import type` instead.",
      },
      fixable: "code",
    },
    defaultOptions: [],
    create(context) {
      const parserServices = ESLintUtils.getParserServices(context);
      const checker = parserServices.program.getTypeChecker();

      return {
        ImportDeclaration(node) {
          // Skip if already a type import
          if (node.importKind === "type") {
            return;
          }

          // Skip side-effect imports (import 'module')
          if (node.specifiers.length === 0) {
            return;
          }

          // Skip if has default import (complex case)
          const hasDefault = node.specifiers.some((s) => s.type === "ImportDefaultSpecifier");
          if (hasDefault) {
            return;
          }

          // Skip if has namespace import (import * as X)
          const hasNamespace = node.specifiers.some((s) => s.type === "ImportNamespaceSpecifier");
          if (hasNamespace) {
            return;
          }

          // Get only named imports
          const namedImports = node.specifiers.filter((s) => s.type === "ImportSpecifier");
          if (namedImports.length === 0) {
            return;
          }

          // Check if ALL named imports are used only as types
          let allAreTypeOnly = true;

          for (const specifier of namedImports) {
            // Skip if already marked as type import
            if (specifier.importKind === "type") {
              continue;
            }

            // Get the TypeScript node for this specifier
            const tsSpecifierNode = parserServices.esTreeNodeToTSNodeMap.get(specifier);
            if (!tsSpecifierNode) {
              allAreTypeOnly = false;
              break;
            }

            // Get the symbol being imported
            const symbol = checker.getSymbolAtLocation(tsSpecifierNode.name || tsSpecifierNode);

            if (!symbol) {
              // Can't determine, be conservative
              allAreTypeOnly = false;
              break;
            }

            // Follow aliases to get the actual symbol
            const resolvedSymbol = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

            // Check the symbol's declarations to see what kind of thing it is
            const declarations = resolvedSymbol.getDeclarations();
            if (!declarations || declarations.length === 0) {
              allAreTypeOnly = false;
              break;
            }

            // Check if it's ONLY a type-only construct (type alias, interface)
            // and NOT also a value (class, enum, function, variable)
            const hasTypeDecl = declarations.some(
              (decl) => ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl)
            );

            const hasValueDecl = declarations.some(
              (decl) =>
                ts.isClassDeclaration(decl) ||
                ts.isEnumDeclaration(decl) ||
                ts.isFunctionDeclaration(decl) ||
                ts.isVariableDeclaration(decl) ||
                ts.isModuleDeclaration(decl)
            );

            if (hasValueDecl) {
              // It's a value (class, enum, function, etc.) - NOT type-only
              allAreTypeOnly = false;
              break;
            }

            if (!hasTypeDecl) {
              // Not a type and not a value - unknown, be conservative
              allAreTypeOnly = false;
              break;
            }

            // It's a type-only construct - continue checking other imports
          }

          if (allAreTypeOnly) {
            context.report({
              node,
              messageId: "preferTypeImport",
              data: {
                module: node.source.value,
              },
              fix(fixer) {
                // Replace 'import' with 'import type'
                const importToken = context.getSourceCode().getFirstToken(node);
                if (importToken) {
                  return fixer.replaceText(importToken, "import type");
                }
                return null;
              },
            });
          }
        },
      };
    },
  }),

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
        suggestUndefined: "Use === undefined",
        suggestNull: "Use === null",
        suggestZero: "Use === 0n",
      },
      hasSuggestions: true,
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
                    messageId: "suggestUndefined",
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === undefined"),
                      ];
                    },
                  },
                  {
                    messageId: "suggestNull",
                    fix(fixer) {
                      return [
                        fixer.removeRange([node.range[0], node.range[0] + 1]),
                        fixer.insertTextAfter(node.argument, " === null"),
                      ];
                    },
                  },
                  {
                    messageId: "suggestZero",
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
