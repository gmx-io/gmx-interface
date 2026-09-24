import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const GRADUATED_DIR = path.resolve(__dirname, '../src/config/graduated-flags');
const ENABLE_FILE = path.resolve(__dirname, '../src/config/featureFlagEnable.ts');
const APP_SRC = path.resolve(__dirname, '../src');
const AGENTS_SKILLS_DIR = path.join(REPO_ROOT, 'agents/skills');

const EDITOR_SKILL_DIRS = {
  codex: path.join(REPO_ROOT, '.codex/skills'),
  claude: path.join(REPO_ROOT, '.claude/skills'),
  cursor: path.join(REPO_ROOT, '.cursor/skills'),
} as const;

type EditorName = keyof typeof EDITOR_SKILL_DIRS;

function parseTicketId(arg?: string): string {
  if (arg) {
    const compound = arg.match(/^GMW[-_](\d+(?:[-_]\d+)+)$/i);
    if (compound) return `GMW_${compound[1].replace(/-/g, '_')}`;
    const match = arg.match(/GMW[-_]?(\d+)/i);
    if (match) return `GMW_${match[1]}`;
    if (/^[A-Z][A-Z0-9_]+$/.test(arg)) return arg;
    throw new Error(`Invalid ticket: ${arg}`);
  }
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  const fromBranch = branch.match(/GMW[-_]?(\d+)/i);
  if (fromBranch) return `GMW_${fromBranch[1]}`;
  throw new Error('Could not parse GMW ticket from branch. Pass GMW-N as argument.');
}

function flagFileName(ticket: string): string {
  return `${ticket}.ts`;
}

function gmwTicketToEnabledId(ticket: string): string | null {
  const parts = ticket.match(/^GMW_(\d+(?:_\d+)*)$/);
  return parts ? parts[1] : null;
}

function getEnabledFnName(ticket: string): string {
  if (ticket === 'POOL_NEW') return 'getPoolNewEnabled';
  if (ticket === 'GLV_NEW_NAME') return 'getGlvNewNameEnabled';
  const id = gmwTicketToEnabledId(ticket);
  if (!id) throw new Error(`Unknown flag ticket: ${ticket}`);
  return `getGmw${id}Enabled`;
}

function readProductionFeaturePass(filePath: string): boolean | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/export const productionFeaturePass\s*=\s*(true|false)/);
  return match ? match[1] === 'true' : null;
}

function listFlagFiles(): string[] {
  return fs
    .readdirSync(GRADUATED_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'registry.ts')
    .map((f) => f.replace(/\.ts$/, ''));
}

function cmdOpen(ticketArg?: string) {
  setProductionFeaturePass(ticketArg, true);
}

function cmdClose(ticketArg?: string) {
  setProductionFeaturePass(ticketArg, false);
}

function setProductionFeaturePass(ticketArg: string | undefined, enabled: boolean) {
  const ticket = parseTicketId(ticketArg);
  const filePath = path.join(GRADUATED_DIR, flagFileName(ticket));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Flag file not found: ${filePath}`);
  }
  const from = enabled ? 'false' : 'true';
  const to = enabled ? 'true' : 'false';
  let content = fs.readFileSync(filePath, 'utf8');
  const current = readProductionFeaturePass(filePath);
  if (current === enabled) {
    console.log(
      `${ticket} already ${enabled ? 'enabled' : 'disabled'} in production (productionFeaturePass = ${to})`
    );
    return;
  }
  if (!content.includes(`export const productionFeaturePass = ${from}`)) {
    throw new Error(`Could not find 'export const productionFeaturePass = ${from}' in ${filePath}`);
  }
  content = content.replace(
    `export const productionFeaturePass = ${from}`,
    `export const productionFeaturePass = ${to}`
  );
  fs.writeFileSync(filePath, content);
  console.log(
    `${enabled ? 'Enabled' : 'Disabled'} ${ticket} in production: productionFeaturePass = ${to}`
  );
  console.log('Rebuild and redeploy production for the change to take effect.');
}

function cmdList() {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  const branchTicket = branch.match(/GMW[-_]?(\d+)/i)?.[0]?.replace('-', '_').toUpperCase();
  console.log(`Branch: ${branch}`);
  console.log('');
  const closed: string[] = [];
  const open: string[] = [];
  for (const ticket of listFlagFiles().sort()) {
    const enabled = readProductionFeaturePass(path.join(GRADUATED_DIR, `${ticket}.ts`));
    const status = enabled ? 'open' : 'closed';
    const marker = branchTicket && ticket === `GMW_${branchTicket.match(/\d+/)?.[0]}` ? ' <- current branch' : '';
    console.log(`  ${ticket}: ${status}${marker}`);
    if (enabled) open.push(ticket);
    else closed.push(ticket);
  }
  console.log(`\nOpen: ${open.length}, closed: ${closed.length}`);
  if (closed.length) console.log(`Closed flags: ${closed.join(', ')}`);
}

function scanDir(dir: string, issues: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'graduated-flags') continue;
      scanDir(full, issues);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (entry.name === 'featureFlags.ts') continue;
    if (content.includes('FEATURE_NIGHTLY_') && content.includes('_PASS')) {
      issues.push(`${path.relative(APP_SRC, full)}: still uses _PASS`);
    }
    if (/useGmw\d+Enabled|use\bget(?:Gmw\d+|PoolNew|GlvNewName)Enabled\bEnabled/.test(content)) {
      issues.push(`${path.relative(APP_SRC, full)}: still uses use*Enabled hook`);
    }
    if (content.includes("from '@/config/featureFlags'") || content.includes('from "../config/featureFlags"')) {
      if (!full.includes('graduated-flags') && !full.includes('featureFlagEnable.ts') && !full.includes('featureFlags.ts')) {
        issues.push(`${path.relative(APP_SRC, full)}: imports featureFlags directly`);
      }
    }
  }
}

function cmdAudit() {
  const tickets = listFlagFiles();
  console.log('# Nightly flag inventory\n');
  console.log('| Flag | productionFeaturePass | getEnabled |');
  console.log('|------|------------------|-----------|');
  for (const ticket of tickets.sort()) {
    const g = readProductionFeaturePass(path.join(GRADUATED_DIR, `${ticket}.ts`));
    console.log(`| ${ticket} | ${g} | ${getEnabledFnName(ticket)} |`);
  }
  const issues: string[] = [];
  scanDir(APP_SRC, issues);
  console.log('\n## Migration issues\n');
  if (issues.length === 0) {
    console.log('No legacy _PASS, use*Enabled, or direct featureFlags imports found.');
  } else {
    for (const issue of issues) console.log(`- ${issue}`);
  }
}

function readEnabledFunctions(): Set<string> {
  const content = fs.readFileSync(ENABLE_FILE, 'utf8');
  const fns = new Set<string>();
  for (const match of content.matchAll(/export function (get(?:Gmw[\d_]+|PoolNew|GlvNewName)Enabled)/g)) {
    fns.add(match[1]);
  }
  return fns;
}

const ENABLED_FN_RE = /\bget(?:Gmw[\d_]+|PoolNew|GlvNewName)Enabled\b/g;

function extractEnabledFns(content: string): Set<string> {
  const fns = new Set<string>();
  for (const match of content.matchAll(ENABLED_FN_RE)) {
    fns.add(match[0]);
  }
  return fns;
}

function enabledFnToTicket(fn: string): string | null {
  if (fn === 'getPoolNewEnabled') return 'POOL_NEW';
  if (fn === 'getGlvNewNameEnabled') return 'GLV_NEW_NAME';
  const id = fn.match(/^getGmw(\d+(?:_\d+)*)Enabled$/)?.[1];
  return id ? `GMW_${id}` : null;
}

function getDiffFiles(): string[] {
  const files = new Set<string>();

  const addFromGit = (command: string) => {
    try {
      for (const line of execSync(command, { encoding: 'utf8' }).split('\n')) {
        const trimmed = line.trim();
        if (trimmed) files.add(trimmed);
      }
    } catch {
      // command may fail when upstream is not configured
    }
  };

  // Uncommitted changes on current branch (staged + unstaged vs HEAD)
  addFromGit('git diff HEAD --name-only --diff-filter=AM');

  // Committed on current branch but not on its upstream tracking ref (no local main)
  addFromGit('git diff @{upstream}..HEAD --name-only --diff-filter=AM');

  return [...files].filter((f) => f.startsWith('app/src/') && /\.(ts|tsx)$/.test(f));
}

function diffPathToAbs(rel: string): string {
  const repoRoot = path.resolve(__dirname, '../..');
  if (rel.startsWith('app/')) {
    return path.join(repoRoot, rel);
  }
  return path.join(APP_SRC, rel);
}

function cmdCheck() {
  const files = getDiffFiles();
  const behavioral = files.filter(
    (f) =>
      !f.includes('graduated-flags/') &&
      !f.includes('featureFlagEnable.ts') &&
      !f.includes('featureFlags.ts') &&
      !f.includes('vite-env.d.ts') &&
      (f.includes('/components/') || f.includes('/routes/') || f.includes('/selectors/') || f.includes('/hooks/'))
  );

  if (behavioral.length === 0) {
    console.log('No behavioral file changes in diff (components/routes/selectors/hooks).');
    return;
  }

  const registered = readEnabledFunctions();
  const issues: string[] = [];
  const gated = new Map<string, string[]>();
  let branchTicket: string | undefined;
  try {
    branchTicket = parseTicketId();
  } catch {
    branchTicket = undefined;
  }

  for (const rel of behavioral) {
    const full = diffPathToAbs(rel);
    if (!fs.existsSync(full)) {
      continue;
    }
    const used = extractEnabledFns(fs.readFileSync(full, 'utf8'));
    if (used.size === 0) {
      issues.push(`${rel}: behavioral change without get*Enabled() gate`);
      continue;
    }
    for (const fn of used) {
      gated.set(fn, [...(gated.get(fn) ?? []), rel]);
      if (!registered.has(fn)) {
        issues.push(`${rel}: uses ${fn}() but it is not defined in featureFlagEnable.ts`);
        continue;
      }
      const ticket = enabledFnToTicket(fn);
      if (ticket && !fs.existsSync(path.join(GRADUATED_DIR, flagFileName(ticket)))) {
        issues.push(`${rel}: uses ${fn}() but graduated-flags/${ticket}.ts is missing`);
      }
    }
  }

  if (branchTicket) {
    const branchFnName = getEnabledFnName(branchTicket);
    const graduatedPath = path.join(GRADUATED_DIR, flagFileName(branchTicket));
    const graduatedExists = fs.existsSync(graduatedPath);
    const flagInDiff = files.some((f) => f.includes(`graduated-flags/${branchTicket}.ts`));
    const enableInDiff = files.includes('app/src/config/featureFlagEnable.ts');

    if (graduatedExists || flagInDiff) {
      if (!registered.has(branchFnName)) {
        issues.push(
          `branch ${branchTicket}: ${branchFnName}() is not defined in featureFlagEnable.ts`
        );
      } else if (![...gated.keys()].includes(branchFnName) && !enableInDiff) {
        issues.push(
          `branch ${branchTicket}: diff changes behavioral files but does not use ${branchFnName}()`
        );
      }
    }
  }

  if (issues.length > 0) {
    console.warn('Warning: nightly gate check failed:\n');
    for (const issue of issues) console.warn(`  - ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log('Nightly gate check passed.');
  for (const [fn, fileList] of [...gated.entries()].sort()) {
    console.log(`  ${fn}() in ${fileList.join(', ')}`);
  }
}

function listAgentSkills(): string[] {
  if (!fs.existsSync(AGENTS_SKILLS_DIR)) {
    throw new Error(`Agent skills directory not found: ${AGENTS_SKILLS_DIR}`);
  }
  return fs
    .readdirSync(AGENTS_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(AGENTS_SKILLS_DIR, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

function symlinkTargetFor(skill: string, linkPath: string): string {
  const absoluteTarget = path.join(AGENTS_SKILLS_DIR, skill);
  return path.relative(path.dirname(linkPath), absoluteTarget).split(path.sep).join('/');
}

function normalizeCommand(command?: string): string | undefined {
  if (!command) return command;
  if (command === 'link-skils' || command === 'link-skill') return 'link-skills';
  return command;
}

function normalizeEditor(editorArg?: string): EditorName | undefined {
  if (!editorArg) return undefined;
  const normalized = editorArg.toLowerCase().replace(/^\./, '');
  if (normalized in EDITOR_SKILL_DIRS) {
    return normalized as EditorName;
  }
  return undefined;
}

function cmdLinkSkills(editorArg?: string) {
  const editor = normalizeEditor(editorArg);
  if (!editor) {
    throw new Error(`Unknown editor: ${editorArg ?? '(missing)'}. Use: codex, claude, or cursor`);
  }

  const targetDir = EDITOR_SKILL_DIRS[editor];
  const skills = listAgentSkills();
  if (skills.length === 0) {
    throw new Error(`No skills found under ${AGENTS_SKILLS_DIR}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Linking ${skills.length} skill(s) for ${editor} in ${targetDir}\n`);

  for (const skill of skills) {
    const linkPath = path.join(targetDir, skill);
    const relativeTarget = symlinkTargetFor(skill, linkPath);

    if (fs.existsSync(linkPath)) {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        const current = fs.readlinkSync(linkPath).split(path.sep).join('/');
        if (current === relativeTarget) {
          console.log(`  ${skill}: already linked`);
          continue;
        }
        fs.unlinkSync(linkPath);
      } else {
        throw new Error(`${linkPath} exists and is not a symlink`);
      }
    }

    fs.symlinkSync(relativeTarget, linkPath);
    console.log(`  ${skill}: ${relativeTarget}`);
  }

  console.log(`\nDone. ${editor} can load skills from ${targetDir}`);
}

const [rawCommand, arg] = process.argv.slice(2);
const command = normalizeCommand(rawCommand);

switch (command) {
  case 'open':
    cmdOpen(arg);
    break;
  case 'close':
    cmdClose(arg);
    break;
  case 'list':
    cmdList();
    break;
  case 'audit':
    cmdAudit();
    break;
  case 'check':
    cmdCheck();
    break;
  case 'link-skills':
    cmdLinkSkills(arg);
    break;
  default:
    console.log(`Usage: pnpm nightly:flags <command> [args]

Commands:
  open [GMW-N]           Set productionFeaturePass = true for production
  close [GMW-N]          Set productionFeaturePass = false for production
  list                   List prod open/closed flags
  audit                  Inventory + legacy pattern scan
  check                  Verify behavioral diff uses get*Enabled() from featureFlagEnable.ts
  link-skills <editor>   Symlink agents/skills into .codex, .claude, or .cursor/skills
                         editor: codex | claude | cursor (with or without leading dot)`);
    process.exit(command ? 1 : 0);
}
