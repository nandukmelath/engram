# Changelog

## 0.1.0

Initial release.

- `SessionEnd` hook archives every Claude Code session to an Obsidian vault as Markdown (`Sessions/` + daily index).
- `SessionStart` hook injects the last 3 days of work into each new session.
- `/recall <topic>` slash command to search the full archive mid-session.
- Secret redaction (API keys, tokens, JWTs, private keys, password pairs) before write.
- Trivial / empty sessions skipped.
- `engram` CLI: `init`, `backfill`, `doctor`, `uninstall`; `--global-memory` to globalize Claude Code's native memory into the vault.
- Ships as a Claude Code plugin **and** a zero-dependency npm package. Cross-platform (Linux/macOS/Windows).
