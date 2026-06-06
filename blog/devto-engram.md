---
title: I gave Claude Code a permanent memory — in my Obsidian vault
published: false
description: Claude Code forgets every session and deletes transcripts after 30 days. So I built Engram — two tiny hooks that archive every session to Markdown, recall recent work at startup, and let you /recall your whole history.
tags: claudeai, obsidian, opensource, productivity
canonical_url: https://github.com/nandukmelath/engram
---

I use [Claude Code](https://docs.anthropic.com/claude-code) every day. And every day I hit the same wall: **the moment a session ends, it forgets everything.** Worse — it deletes the raw transcripts after 30 days. Every decision, every dead-end, every "ah, that's why" — gone.

So I built **[Engram](https://github.com/nandukmelath/engram)**: a tiny, zero-dependency tool that gives Claude Code a long-term memory, written to plain Markdown — i.e. an Obsidian vault you own.

## The idea in one diagram

```
 session ends ──▶ [SessionEnd hook] ──▶ Sessions/2026-06-05_ab12.md   (the vault)
 new session ──▶ [SessionStart hook] ◀── reads last 3 days ──┐
                          │                                   │
                          └── injects "here's what you were doing" into context
 /recall "auth"  ──▶ greps the whole vault, answers with citations
```

Two hooks. No daemon, no database, no network. The whole thing is plain Markdown you can open in Obsidian, grep, or read in any editor.

## How it works

Claude Code lets you run [hooks](https://docs.anthropic.com/claude-code) on lifecycle events. Engram wires two:

**`SessionEnd` → archive.** It reads the session transcript (a `.jsonl` file), pulls out the real conversation turns, and writes a Markdown note with frontmatter:

```js
// parse transcript JSONL → clean turns, skipping tool noise + subagents
for (const line of raw.split('\n')) {
  const o = JSON.parse(line);
  if (o.isSidechain || o.isMeta) continue;
  if (o.type !== 'user' && o.type !== 'assistant') continue;
  // ...extract text blocks, mark tool calls, skip pure tool-results
}
```

**`SessionStart` → recall.** It reads the last few daily indexes and injects them into the new session as `additionalContext`, so Claude starts already knowing what you were doing yesterday.

**`/recall <topic>`** is a slash command that greps the vault and summarizes with citations — *"what did we decide about the payment provider?"* → it quotes the exact session note.

## Three things I learned shipping it

**1. Redact before you write.** People paste secrets into coding sessions. Archiving those to plaintext is a footgun. Engram scrubs them first:

```js
s.replace(/-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*PRIVATE KEY-----/gi, '[REDACTED PRIVATE KEY]')
 .replace(/\b(sk|rk)-[A-Za-z0-9]{20,}/gi, '[REDACTED]')
 .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}/g, '[REDACTED]')
 .replace(/\b(api[_-]?key|secret|token|password|bearer)\b\s*[:=]\s*["']?[^\s"']+/gi, '$1: [REDACTED]')
```

**2. Hooks must silent-fail.** A bug in your hook must *never* block someone's session. Every hook wraps its work and `exit 0`s no matter what; errors go to a log file in the vault.

**3. Windows will humble you.** Two bugs I'd never have caught on Linux:
- PowerShell's `[char]` can't hold an emoji code point (> U+FFFF) — it throws. Use `String.fromCodePoint` / `[char]::ConvertFromUtf32`.
- PowerShell pipes prepend a **UTF-8 BOM**, so `JSON.parse` on piped hook input throws. Strip `﻿` defensively.

## Install

As a Claude Code plugin:

```
/plugin marketplace add nandukmelath/engram
/plugin install engram@engram
```

Or standalone (any agent that can call a command hook):

```bash
npx engram init
npx engram backfill   # imports all your existing sessions
```

Then open the vault folder in Obsidian → *Open folder as vault*.

## It's open source

Engram is MIT, zero-dependency, cross-platform, and the whole thing is ~950 lines. I'd love feedback — especially on redaction patterns and transcript edge-cases.

👉 **[github.com/nandukmelath/engram](https://github.com/nandukmelath/engram)** — a ⭐ helps others find it.

What would you want your AI agent to *remember*?
