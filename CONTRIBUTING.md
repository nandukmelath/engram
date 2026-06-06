# Contributing to Engram

Thanks for helping! Engram is intentionally small and dependency-free — keep it that way.

## Dev setup

```bash
git clone https://github.com/nandukmelath/engram
cd engram
node test/run.js     # or: npm test
```

No `npm install` needed — there are zero runtime dependencies, and the tests use only Node built-ins.

## Guidelines

- **No runtime dependencies.** The whole point is `npx engram` with nothing to install. Built-ins only.
- **Hooks must silent-fail.** A crash in a hook must never block a Claude Code session. Wrap, log to the vault error log, `exit 0`.
- **Cross-platform.** Resolve paths with `path`/`os`. Honor `CLAUDE_CONFIG_DIR` and `ENGRAM_VAULT`. CI runs on Linux, macOS, Windows.
- **Add a test** for any parsing or redaction change (`test/run.js`).
- **Redaction PRs welcome** — new secret formats are high-value. Add a pattern + a test.

## Good first issues

- More secret-redaction patterns (Slack, Stripe live keys, GCP service-account JSON…).
- Transcript edge-cases from real `.jsonl` files.
- A `--since <date>` flag for `backfill`.
- Per-project digest filtering in `recall-digest.js`.

Open an issue first for anything large. PRs to `main`.
