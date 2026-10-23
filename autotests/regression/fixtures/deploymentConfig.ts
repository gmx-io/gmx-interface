import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

type ConfigEndpoint = { file: string; keys: string[]; url: string };

// CI points this at a sparse checkout of the deployed PR commit.
const candidateRoot = () => process.env.REGRESSION_CANDIDATE_ROOT || ".";

function readInitializer(path: string, name: string, root = candidateRoot()) {
  const source = readFileSync(join(root, path), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(file) === name && declaration.initializer) {
        return { source, file, initializer: declaration.initializer };
      }
    }
  }
  throw new Error(`Missing ${name} in ${join(root, path)}`);
}

export function readObject(path: string, name: string, root = candidateRoot()) {
  const { source, file, initializer } = readInitializer(path, name, root);
  if (!ts.isObjectLiteralExpression(initializer)) throw new Error(`${name} in ${path} is not an object literal`);
  return { source, file, object: initializer };
}

export type RegressionAnnouncement = {
  id: string;
  type: string;
  startDate?: string;
  endDate: string;
  title?: string;
  flagId?: string;
  requiresOpenPosition?: string;
  isActive?: boolean;
  // Chain constant names, such as "ARBITRUM".
  chains?: string[];
  linkHref?: string;
  // String `href`/`to` attributes in the announcement's JSX, in source order.
  hrefs: string[];
};

export function readRegressionAnnouncements(): RegressionAnnouncement[] {
  const { file, initializer } = readInitializer("src/config/events.tsx", "appEventsData");
  if (!ts.isArrayLiteralExpression(initializer)) throw new Error("appEventsData is not an array literal");
  return initializer.elements.filter(ts.isObjectLiteralExpression).map((event) => {
    const fields: Record<string, unknown> = {};
    for (const property of event.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = property.name.getText(file);
      const value = property.initializer;
      if (ts.isStringLiteral(value)) fields[name] = value.text;
      else if (name === "isActive" && [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(value.kind))
        fields.isActive = value.kind === ts.SyntaxKind.TrueKeyword;
      else if (name === "chains" && ts.isArrayLiteralExpression(value))
        fields.chains = value.elements.map((chain) => chain.getText(file));
      else if (name === "link" && ts.isObjectLiteralExpression(value))
        for (const entry of value.properties)
          if (
            ts.isPropertyAssignment(entry) &&
            entry.name.getText(file) === "href" &&
            ts.isStringLiteral(entry.initializer)
          )
            fields.linkHref = entry.initializer.text;
    }
    const hrefs: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxAttribute(node) && ["href", "to"].includes(node.name.getText(file))) {
        const value =
          node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) hrefs.push(value.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(event);
    return { ...fields, hrefs } as RegressionAnnouncement;
  });
}

export function readRegressionIndexers(kind: "subsquid" | "syntheticsStats" = "subsquid") {
  const { source, file, object } = readObject("src/config/indexers.ts", "INDEXER_URLS");
  const endpoints = new Map<string, string>();
  for (const chain of object.properties) {
    if (!ts.isPropertyAssignment(chain) || !ts.isObjectLiteralExpression(chain.initializer)) continue;
    for (const entry of chain.initializer.properties) {
      if (
        ts.isPropertyAssignment(entry) &&
        entry.name.getText(file) === kind &&
        ts.isStringLiteral(entry.initializer)
      ) {
        endpoints.set(chain.name.getText(file), entry.initializer.text);
      }
    }
  }
  return { source, endpoints };
}

const ENDPOINT_CONFIGS = [
  ["src/config/indexers.ts", "INDEXER_URLS"],
  ["sdk/src/configs/oracleKeeper.ts", "ORACLE_KEEPER_URLS"],
  ["sdk/src/configs/oracleKeeper.ts", "ORACLE_KEEPER_FALLBACK_URLS"],
  ["sdk/src/configs/api.ts", "API_URLS"],
  ["sdk/src/configs/api.ts", "API_FALLBACK_URLS"],
  ["src/config/backend.ts", "BACKEND_URLS"],
] as const;

export function readRegressionEndpoints() {
  return ENDPOINT_CONFIGS.flatMap(([path, name]) => {
    const { file, object } = readObject(path, name);
    const endpoints: ConfigEndpoint[] = [];
    const visit = (node: ts.Expression, keys: string[]) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        endpoints.push({ file: path, keys, url: node.text });
      else if (ts.isArrayLiteralExpression(node)) node.elements.forEach((element) => visit(element, keys));
      else if (ts.isObjectLiteralExpression(node))
        for (const property of node.properties)
          if (ts.isPropertyAssignment(property)) visit(property.initializer, [...keys, property.name.getText(file)]);
    };
    visit(object, [name]);
    return endpoints;
  });
}

export function readRegressionGlvs(chainId: 42161 | 43114) {
  const { file, object } = readObject("src/config/markets.ts", "GLV_MARKETS");
  const chainName = chainId === 42161 ? "[ARBITRUM]" : "[AVALANCHE]";
  for (const chain of object.properties) {
    if (
      ts.isPropertyAssignment(chain) &&
      chain.name.getText(file) === chainName &&
      ts.isObjectLiteralExpression(chain.initializer)
    ) {
      return chain.initializer.properties.flatMap((entry) =>
        ts.isPropertyAssignment(entry) && ts.isStringLiteral(entry.name) ? [entry.name.text] : []
      );
    }
  }
  throw new Error(`Missing GLV markets for ${chainName}`);
}
