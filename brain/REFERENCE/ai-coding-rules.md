# AI Coding Rules — Guardrails

> **Location in repo:** `docs/superpowers/ai-coding-rules`
> **Purpose:** Prevent Kimi (and other agents) from going rogue and messing stuff up

---

## ⚠️ What This File Does

This is your **DO NOT** list for AI agents. It defines boundaries so agents don't:
- Overwrite working code without permission
- Change file structures randomly
- Delete things that matter
- Go off-spec and build random features

---

## 📍 Where It Lives

```
docs/
└── superpowers/
    └── ai-coding-rules     ← The original guardrails file
```

**Do NOT move it.** It's already in the right place. All agents should read this BEFORE touching any code.

---

## 🔗 How Agents Use It

**Before implementing anything:**
1. Read `docs/superpowers/ai-coding-rules`
2. Read `brain/PROJECTS/farm-tycoon/specs.md`
3. Read `brain/PROJECTS/farm-tycoon/current-task.md`
4. THEN start coding

---

## 📝 Quick Reference

The original file contains rules like:
- *(User maintains this — specific rules are in the original file)*
- *(Agents: read the source file, not this summary)*

---

## 🧠 Brain Note

This file was created by Jose after Kimi went rogue and started messing things up. It's battle-tested. Respect it.
