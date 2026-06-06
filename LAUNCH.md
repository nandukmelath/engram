# Engram — launch playbook

Everything to launch Engram and give it the best shot at GitHub Trending. Copy-paste ready.

> **Reality check.** Nobody can *guarantee* Trending. It's driven by stars-per-day velocity, which comes from one launch landing well (HN front page, a hot Reddit thread, or a big account sharing). This kit maximizes the odds; it doesn't manufacture them. Ship a great post, at a good time, and engage every comment fast.

---

## 0. Pre-launch checklist (do first)

- [ ] `npm test` green locally.
- [ ] Record the demo GIF (see §5) and add it near the top of the README — **this is the single biggest lever for stars.**
- [ ] `npm publish` so `npx engram` works (or remove npm lines from README until then).
- [ ] Enable CI badge (needs `gh auth refresh -s workflow`, then push `.github/workflows/ci.yml`).
- [ ] Add a GitHub **social preview** image (Settings → General → Social preview) — use `assets/social.png` (1280×640).
- [ ] Star your own repo. Get 3–5 friends to star *before* posting so it's not at 0.
- [ ] Set a 2-hour window where you can reply to every comment within minutes.

**Best time to post:** Tuesday–Thursday, ~8:00–10:00 AM US Eastern (13:00–15:00 UTC). Avoid weekends and Fridays.

---

## 1. Show HN

**Title** (HN rule: no hype words, no emoji):

```
Show HN: Engram – give Claude Code a permanent memory in your Obsidian vault
```

**URL:** `https://github.com/nandukmelath/engram`

**First comment** (post immediately after submitting — this *is* the pitch on HN):

```
I use Claude Code daily and kept hitting the same wall: the moment a session
ends, it forgets everything — and it deletes the raw transcripts after 30 days.
Every decision and dead-end, gone.

Engram is two tiny Node hooks. SessionEnd writes each session to a Markdown
folder (an Obsidian vault if you open it as one). SessionStart reads the last
few days back in, so the next session starts with context. A /recall command
greps the whole history mid-session ("what did we decide about auth?").

Design choices:
- Zero dependencies. `npx engram init`, or install it as a Claude Code plugin.
- Plain Markdown — no DB, no cloud, you own the files. Survives the 30-day purge.
- Secrets (API keys, tokens, JWTs, private keys) are redacted before write.
- Hooks silent-fail: a bug in Engram can never block your session.

It's MIT. I'd love feedback on the redaction patterns and on transcript
edge-cases from real .jsonl files. Cross-platform but I've tested Windows
hardest — macOS/Linux reports welcome.
```

**Engagement rules:** reply to *every* comment in the first 2 hours. Be humble, concede real limitations, never argue. "Good point, opened #N" wins HN.

---

## 2. Reddit

### r/ClaudeAI  (best fit)

**Title:**
```
I built Engram: every Claude Code session auto-saved to Obsidian + /recall to search your history [open source, MIT]
```

**Body:**
```
Claude Code forgets everything when a session ends and purges transcripts after
30 days. Engram fixes that with two hooks:

• SessionEnd → archives the full session to a Markdown/Obsidian vault
• SessionStart → feeds the last 3 days back into the new session
• /recall <topic> → searches your whole history mid-session, with citations
• Secrets redacted before write; trivial sessions skipped

Install is one line as a Claude Code plugin, or `npx engram init`. Zero deps,
cross-platform, MIT. It also backfills all your existing sessions.

Repo + demo: https://github.com/nandukmelath/engram

Would love feedback — especially redaction patterns and what you'd want /recall
to do.
```

### r/ObsidianMD

**Title:**
```
Turned my Obsidian vault into long-term memory for an AI coding agent (Claude Code) — open source
```

**Body:** lead with the *vault* angle — screenshots of the graph view + a session note. Obsidian folks care about the notes, not the agent. Show the daily index and the linked sessions.

> Reddit etiquette: post as a maker sharing a tool, not an ad. Reply to comments. Don't cross-post the same minute — space them a day apart.

---

## 3. X / Twitter thread

**Tweet 1 (hook):**
```
Claude Code forgets everything when a session ends — and deletes transcripts after 30 days.

So I built Engram: it saves every session to your Obsidian vault, recalls recent work at startup, and adds /recall to search it all.

Open source, zero deps 🧠
github.com/nandukmelath/engram
```

**Tweet 2 (how):** the mermaid diagram screenshot + "two hooks, plain Markdown, no DB."
**Tweet 3 (recall demo):** the `/recall` GIF.
**Tweet 4 (privacy):** "secrets redacted before write; hooks silent-fail; you own the files."
**Tweet 5 (CTA):** "MIT. Stars help others find it 🙏 + tag anyone living in Claude Code."

Tag/seed: reply under relevant Claude Code and Obsidian threads (don't spam). Ask 2-3 builder friends to quote-tweet.

---

## 4. Other channels

- **Awesome lists:** PR Engram into `awesome-claude-code`, `awesome-obsidian`, `awesome-ai-tools`.
- **Claude Code plugin marketplaces / directories:** submit it.
- **Hacker News /newest** also gets scanned — even if Show HN doesn't take off, the repo is indexed.
- **Dev.to / Hashnode:** a short "how I gave my AI agent memory" build post linking the repo.

---

## 5. Demo recording (90 seconds)

A GIF at the top of the README converts browsers → stargazers. Record a terminal:

```
# 1. install
npx engram init
npx engram backfill

# 2. open the vault in Obsidian (cut to the graph view + a session note)

# 3. in Claude Code, show the magic:
/recall the auth decision
# → Claude cites past session notes

# 4. end a session, show the new note appearing in Sessions/
```

Tools: [asciinema](https://asciinema.org) + `agg` to make a GIF, or [terminalizer](https://terminalizer.com). Keep it < 8 MB so GitHub inlines it. Drop it in `assets/demo.gif` and reference it under the title.

---

## 6. After launch

- Reply to everything for 48h. Convert feedback → issues → quick PRs (visible momentum = more stars).
- Post the milestone ("#1 on r/ClaudeAI", "100 stars") as fuel for the next channel.
- Ship a small feature in week 1 so the repo looks alive.
- Add a `Star History` chart to the README once you have a curve worth showing.
