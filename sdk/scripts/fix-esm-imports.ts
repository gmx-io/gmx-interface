/**
 * Node's ESM resolver needs full file specifiers ("./foo.js", "./dir/index.js",
 * "lodash/merge.js") and can't import JSON without an import attribute. `tsc` with
 * `moduleResolution: "node"` keeps the extensionless specifiers from the sources, so the
 * ESM build could not be imported in Node (bundlers resolve them on their own). This
 * rewrites the specifiers of the emitted ESM files in place.
 *
 * JSON imports are pointed at a generated `<name>.json.js` module (`export default <json>`)
 * rather than given an import attribute, so the build keeps working with bundlers that
 * don't support `with { type: "json" }`.
 */
import fs from "fs";
import path from "path";

/* eslint-disable-next-line no-restricted-globals */
const ESM_DIR = path.resolve(process.cwd(), process.argv[2] ?? "build/esm");

// `import ... from "x"`, `export ... from "x"`, `import "x"` and `import("x")`.
const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\2/g;

/* eslint-disable-next-line no-restricted-globals */
const PACKAGE_ROOT = process.cwd();

// A deep import into a package without an `exports` map (e.g. "lodash/merge") is
// resolved by file path in ESM too, so it needs the extension as well.
function resolvePackageSubpath(specifier: string): string | undefined {
  const match = /^((?:@[^/]+\/)?[^/@][^/]*)\/(.+)$/.exec(specifier);
  if (!match || /\.(c|m)?js$|\.json$/.test(specifier)) {
    return specifier;
  }

  const [, packageName, subpath] = match;
  const packageDir = path.join(PACKAGE_ROOT, "node_modules", packageName);
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(packageJsonPath) || JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).exports) {
    return specifier;
  }

  if (fs.existsSync(path.join(packageDir, `${subpath}.js`))) {
    return `${specifier}.js`;
  }
  if (fs.existsSync(path.join(packageDir, subpath, "index.js"))) {
    return `${specifier}/index.js`;
  }

  return specifier;
}

function resolveSpecifier(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return resolvePackageSubpath(specifier);
  }

  const target = path.resolve(path.dirname(fromFile), specifier);

  if (/\.(c|m)?js$|\.json$/.test(specifier) && fs.existsSync(target)) {
    return specifier;
  }
  if (fs.existsSync(`${target}.js`)) {
    return `${specifier}.js`;
  }
  if (fs.existsSync(path.join(target, "index.js"))) {
    return `${specifier.replace(/\/$/, "")}/index.js`;
  }

  return undefined;
}

// Writes `<name>.json.js` next to the JSON file and returns the specifier to import it by.
function jsonModuleFor(fromFile: string, specifier: string): string {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  const jsonPath = path.resolve(path.dirname(fromFile), specifier);
  const modulePath = `${jsonPath}.js`;
  if (!fs.existsSync(modulePath)) {
    const json = fs.readFileSync(jsonPath, "utf8");
    // Parse first, so a malformed file fails the build instead of producing broken JS.
    JSON.parse(json);
    fs.writeFileSync(modulePath, `export default ${json.trim()};\n`);
  }

  return `${specifier}.js`;
}

function fixFile(file: string): number {
  const source = fs.readFileSync(file, "utf8");
  let changes = 0;

  const fixed = source.replace(SPECIFIER_RE, (match, prefix: string, quote: string, specifier: string) => {
    const resolved = resolveSpecifier(file, specifier);
    if (resolved === undefined) {
      throw new Error(`Cannot resolve "${specifier}" imported from ${path.relative(ESM_DIR, file)}`);
    }

    const finalSpecifier = resolved.endsWith(".json") ? jsonModuleFor(file, resolved) : resolved;
    const replacement = `${prefix}${quote}${finalSpecifier}${quote}`;

    if (replacement !== match) {
      changes++;
    }

    return replacement;
  });

  if (changes > 0) {
    fs.writeFileSync(file, fixed);
  }

  return changes;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

let files = 0;
let specifiers = 0;
for (const file of walk(ESM_DIR)) {
  const changes = fixFile(file);
  if (changes > 0) {
    files++;
    specifiers += changes;
  }
}

/* eslint-disable-next-line no-console */
console.log(
  `fix-esm-imports: rewrote ${specifiers} specifiers in ${files} files under ${path.relative(process.cwd(), ESM_DIR)}`
);
