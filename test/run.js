'use strict';
// Zero-dependency test runner. `npm test`.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { redactSecrets, parseTranscript } = require('../hooks/lib/transcript');
const { archiveSession } = require('../hooks/lib/archive');

let pass = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  -', name); }
  catch (e) { console.error('  FAIL -', name, '\n   ', e.message); process.exitCode = 1; }
}

// --- redaction ---
t('redacts sk- keys', () => assert.ok(!redactSecrets('key sk-abcdefghijklmnopqrstuvwx123 ok').includes('sk-abcdef')));
t('redacts password pairs', () => assert.ok(redactSecrets('password: hunter2trustno1').includes('[REDACTED]')));
t('redacts AKIA', () => assert.ok(!redactSecrets('creds AKIAIOSFODNN7EXAMPLE end').includes('AKIAIOSFODNN7EXAMPLE')));
t('keeps normal text intact', () => assert.strictEqual(redactSecrets('hello world'), 'hello world'));
t('redacts Authorization Bearer token fully', () => assert.ok(!/abcDEF123456ghiJKLmnop/.test(redactSecrets('Authorization: Bearer abcDEF123456ghiJKLmnop'))));
t('redacts a bare bearer token', () => assert.ok(!/abcDEF123456ghiJKLmnop/.test(redactSecrets('use Bearer abcDEF123456ghiJKLmnop now'))));

// --- fixtures ---
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-'));
const tp = path.join(tmp, 't.jsonl');
fs.writeFileSync(tp, [
  JSON.stringify({ type: 'user', timestamp: '2026-06-05T09:00:00.000Z', cwd: '/home/u/proj', message: { role: 'user', content: 'my key is sk-abcdefghijklmnopqrstuvwx123 build X' } }),
  JSON.stringify({ type: 'assistant', timestamp: '2026-06-05T09:00:05.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }, { type: 'tool_use', name: 'Read' }] } }),
  JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'x' }] } }),
  JSON.stringify({ type: 'assistant', isSidechain: true, message: { role: 'assistant', content: [{ type: 'text', text: 'subagent noise' }] } }),
].join('\n'));

t('parseTranscript extracts turns, counts tools, skips noise', () => {
  const r = parseTranscript(tp);
  assert.strictEqual(r.turns.length, 2);              // tool-result-only + sidechain skipped
  assert.strictEqual(r.toolCount, 1);
  assert.ok(!JSON.stringify(r.turns).includes('sk-abcdef'));   // redacted at parse
  assert.strictEqual(r.firstCwd, '/home/u/proj');
});

t('archiveSession writes a redacted note + daily index', () => {
  const r = archiveSession({ transcript_path: tp, session_id: 'sess1234abcd', cwd: '/home/u/proj', reason: 'test' }, { vault: tmp });
  assert.strictEqual(r.status, 'written');
  const note = fs.readFileSync(path.join(tmp, 'Sessions', r.note), 'utf8');
  assert.ok(note.includes('[REDACTED]'));
  assert.ok(!note.includes('sk-abcdef'));
  assert.ok(note.includes('## 🧑 User') && note.includes('## 🤖 Claude'));
  const date = r.note.split('_')[0];
  assert.ok(fs.existsSync(path.join(tmp, 'Sessions', 'Daily', `${date}.md`)));
});

t('archiveSession is idempotent (no duplicate daily line)', () => {
  const before = fs.readFileSync(path.join(tmp, 'Sessions', 'Daily', fs.readdirSync(path.join(tmp, 'Sessions', 'Daily'))[0]), 'utf8');
  archiveSession({ transcript_path: tp, session_id: 'sess1234abcd', cwd: '/home/u/proj' }, { vault: tmp });
  const after = fs.readFileSync(path.join(tmp, 'Sessions', 'Daily', fs.readdirSync(path.join(tmp, 'Sessions', 'Daily'))[0]), 'utf8');
  assert.strictEqual(before, after);
});

t('archiveSession skips trivial sessions', () => {
  const tp2 = path.join(tmp, 'triv.jsonl');
  fs.writeFileSync(tp2, JSON.stringify({ type: 'user', timestamp: '2026-06-05T10:00:00.000Z', message: { role: 'user', content: 'hi' } }));
  const r = archiveSession({ transcript_path: tp2, session_id: 'triv', cwd: '' }, { vault: tmp });
  assert.strictEqual(r.status, 'skipped');
});

t('no-session-id archives get unique, stable names', () => {
  const a = path.join(tmp, 'na.jsonl');
  const b = path.join(tmp, 'nb.jsonl');
  const mk = (s) => [
    JSON.stringify({ type: 'user', timestamp: '2026-06-05T12:00:00.000Z', cwd: '/x', message: { role: 'user', content: s + ' build something here' } }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-06-05T12:00:01.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } }),
  ].join('\n');
  fs.writeFileSync(a, mk('alpha'));
  fs.writeFileSync(b, mk('beta'));
  const r1 = archiveSession({ transcript_path: a, cwd: '/x' }, { vault: tmp }); // no session_id
  const r2 = archiveSession({ transcript_path: b, cwd: '/x' }, { vault: tmp });
  assert.strictEqual(r1.status, 'written');
  assert.strictEqual(r2.status, 'written');
  assert.notStrictEqual(r1.note, r2.note);                  // unique despite same date + no id
  assert.strictEqual(archiveSession({ transcript_path: a, cwd: '/x' }, { vault: tmp }).note, r1.note); // stable
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} checks passed`);
