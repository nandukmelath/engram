#!/usr/bin/env node
'use strict';
// Engram CLI — standalone installer + power tools.
//   engram init        wire hooks + /recall into Claude Code, create the vault
//   engram backfill    import all existing transcripts into the vault
//   engram doctor      check the install
//   engram uninstall   remove Engram's hooks + command (keeps your vault)
//
// Claude Code *plugin* users don't need this — the plugin wires hooks itself.
// The CLI adds backfill, global-memory, and non-plugin installs.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { archiveSession } = require('../hooks/lib/archive');
const { claudeConfigDir, configFile, resolveVault, vaultPaths } = require('../hooks/lib/paths');

const HOOKS_DIR = path.resolve(__dirname, '..', 'hooks');
const c = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const ok = (s) => console.log(c('32', '✓') + ' ' + s);
const info = (s) => console.log(c('36', '•') + ' ' + s);
const warn = (s) => console.log(c('33', '!') + ' ' + s);

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function parseFlags(argv) {
  const f = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) f[k] = argv[++i];
      else f[k] = true;
    } else f._.push(a);
  }
  return f;
}

const hookGroup = (cmd, msg, timeout) => ({
  hooks: [{ type: 'command', command: cmd, timeout, statusMessage: msg }],
});
const isEngramGroup = (g) =>
  Array.isArray(g.hooks) &&
  g.hooks.some((h) => typeof h.command === 'string' && /engram|log-session\.js|recall-digest\.js/.test(h.command));

function upsertHooks(settings, event, group) {
  settings.hooks = settings.hooks || {};
  const arr = (settings.hooks[event] || []).filter((g) => !isEngramGroup(g));
  arr.push(group);
  settings.hooks[event] = arr;
}

function cmdInit(flags) {
  const vault = path.resolve(flags.vault || resolveVault());
  const P = vaultPaths(vault);
  const cfgDir = claudeConfigDir();
  const settingsPath = path.join(cfgDir, 'settings.json');

  // 1. vault dirs
  for (const d of [P.sessions, P.daily, P.memory]) fs.mkdirSync(d, { recursive: true });
  ok(`Vault ready: ${vault}`);

  // 2. remember vault choice
  writeJSON(configFile(), { vault });
  info(`Config: ${configFile()}`);

  // 3. hooks
  const node = process.platform === 'win32' ? 'node' : 'node';
  const logCmd = `${node} "${path.join(HOOKS_DIR, 'log-session.js')}"`;
  const digestCmd = `${node} "${path.join(HOOKS_DIR, 'recall-digest.js')}"`;
  const settings = readJSON(settingsPath, {});
  upsertHooks(settings, 'SessionStart', hookGroup(digestCmd, 'Recalling recent work…', 20));
  upsertHooks(settings, 'SessionEnd', hookGroup(logCmd, 'Archiving session to Obsidian…', 30));

  // 4. optional global memory
  if (flags['global-memory']) {
    settings.autoMemoryDirectory = P.memory;
    let moved = 0;
    const projects = path.join(cfgDir, 'projects');
    try {
      for (const proj of fs.readdirSync(projects)) {
        const md = path.join(projects, proj, 'memory');
        let files = [];
        try { files = fs.readdirSync(md).filter((f) => f.endsWith('.md')); } catch { continue; }
        for (const f of files) {
          const dest = path.join(P.memory, f);
          if (!fs.existsSync(dest)) { fs.renameSync(path.join(md, f), dest); moved++; }
        }
      }
    } catch { /* none */ }
    ok(`Memory globalized → ${P.memory}` + (moved ? ` (moved ${moved} files)` : ''));
  }

  writeJSON(settingsPath, settings);
  ok(`Hooks installed in ${settingsPath}`);

  // 5. /recall command
  const cmdDir = path.join(cfgDir, 'commands');
  fs.mkdirSync(cmdDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'commands', 'recall.md'), path.join(cmdDir, 'recall.md'));
  ok('/recall command installed');

  console.log('');
  info('Restart Claude Code (or run /hooks) to load the hooks.');
  info('Run `engram backfill` to import your existing sessions.');
  info(`Open ${vault} as an Obsidian vault.`);
}

function findTranscripts(cfgDir) {
  const projects = path.join(cfgDir, 'projects');
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(projects, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const pdir = path.join(projects, d.name);
    let files = [];
    try { files = fs.readdirSync(pdir); } catch { continue; }
    for (const f of files) if (f.endsWith('.jsonl')) out.push(path.join(pdir, f));
  }
  return out;
}

function cmdBackfill(flags) {
  const vault = path.resolve(flags.vault || resolveVault());
  const files = findTranscripts(claudeConfigDir());
  if (!files.length) return warn('No transcripts found under ~/.claude/projects.');
  let written = 0, skipped = 0;
  for (const tp of files) {
    const r = archiveSession({ transcript_path: tp, session_id: path.basename(tp, '.jsonl'), cwd: '', reason: 'backfill' }, { vault });
    if (r.status === 'written') { written++; process.stdout.write('.'); } else { skipped++; }
  }
  console.log('');
  ok(`Backfilled ${written} session(s), skipped ${skipped} trivial/empty. Vault: ${vault}`);
}

function cmdDoctor() {
  const cfgDir = claudeConfigDir();
  const settingsPath = path.join(cfgDir, 'settings.json');
  const settings = readJSON(settingsPath, {});
  const P = vaultPaths();
  info(`node ${process.version}`);
  info(`claude config: ${cfgDir}`);
  const hasStart = (settings.hooks?.SessionStart || []).some(isEngramGroup);
  const hasEnd = (settings.hooks?.SessionEnd || []).some(isEngramGroup);
  (hasStart ? ok : warn)(`SessionStart (digest) hook ${hasStart ? 'installed' : 'MISSING'}`);
  (hasEnd ? ok : warn)(`SessionEnd (archive) hook ${hasEnd ? 'installed' : 'MISSING'}`);
  let notes = 0;
  try { notes = fs.readdirSync(P.sessions).filter((f) => f.endsWith('.md')).length; } catch { /* none */ }
  (notes ? ok : warn)(`Vault ${P.vault} — ${notes} session note(s)`);
  if (settings.autoMemoryDirectory) ok(`autoMemoryDirectory → ${settings.autoMemoryDirectory}`);
  else info('autoMemoryDirectory not set (run `engram init --global-memory` to globalize memory)');
}

function cmdUninstall() {
  const cfgDir = claudeConfigDir();
  const settingsPath = path.join(cfgDir, 'settings.json');
  const settings = readJSON(settingsPath, {});
  for (const ev of ['SessionStart', 'SessionEnd']) {
    if (settings.hooks?.[ev]) settings.hooks[ev] = settings.hooks[ev].filter((g) => !isEngramGroup(g));
  }
  writeJSON(settingsPath, settings);
  try { fs.unlinkSync(path.join(cfgDir, 'commands', 'recall.md')); } catch { /* gone */ }
  ok('Engram hooks + /recall removed. Your vault is untouched.');
}

function help() {
  console.log(`
🧠 Engram — persistent memory for Claude Code, in your Obsidian vault

  engram init [--vault <path>] [--global-memory]   install hooks + /recall, create vault
  engram backfill [--vault <path>]                 import existing sessions
  engram doctor                                    check the install
  engram uninstall                                 remove hooks + command (keeps vault)

Env: ENGRAM_VAULT overrides the vault path. CLAUDE_CONFIG_DIR is honored.
Docs: https://github.com/nandukmelath/engram
`);
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const cmd = flags._[0];
  switch (cmd) {
    case 'init': return cmdInit(flags);
    case 'backfill': return cmdBackfill(flags);
    case 'doctor': return cmdDoctor();
    case 'uninstall': return cmdUninstall();
    case 'version': case '--version': case '-v':
      return console.log(require('../package.json').version);
    default: return help();
  }
}
main();
