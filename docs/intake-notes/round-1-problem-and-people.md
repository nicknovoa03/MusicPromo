# Round 1: Problem and People — CONFIRMED

## Problem Statement

Musicians and creators spend too much time (and need too many skills) to make simple promotional videos for their music. Today they cobble together tools like CapCut, Photoshop, or random websites — a process that's slow, fragmented, and frustrating. There should be a dead-simple tool: drop in a photo + an audio clip, get a polished promo video out.

## Core Job-to-Be-Done

> "When I release music and want to promote it on social media, I want to quickly generate a short promo video from a photo and audio clip, so I can share it without learning video editing or spending an hour in CapCut."

## Personas

| Persona | Description | Frequency | Motivation | Current Alternative |
|---|---|---|---|---|
| **Indie Artist / Creator** (primary) | Independent musician or content creator self-promoting on Instagram, TikTok, etc. | Every release / weekly | Fast, low-effort social promo | CapCut, Photoshop, random web tools — hacked together |
| **Small Label / Publisher** (future) | Record label or publishing company creating promo for a roster of artists | Per-release across roster | Scale promo creation for multiple artists | Same manual tools, or hire designers |

**v1 focus:** Indie Artist / Creator only. Label/agency use deferred.

## Inspirations & Competitive Landscape

| Product | Relationship |
|---|---|
| **CapCut** | Primary inspiration — does the job but overly complex; takes an hour for what should take a minute |
| General web tools / tutorials | Fragmented; "hack it together" approach |

## What Success Looks Like (v1)

> Two inputs (photo + audio) → one output (short promo video). Fast, reliable, no friction.

## Non-Goals (v1)

- NOT a music distribution platform
- NOT a social network
- NOT a DAW / music creation tool
- NOT an analytics dashboard
- NOT a full-featured video editor — it's a **focused tool**

## Product Principles

1. **Stupidly simple** — two inputs, one output, no learning curve
2. **Fast** — seconds, not an hour
3. **Modern & artistic** — feels good to use, reflects the creative audience
4. **No hoops** — basic sign-in, no strings attached, get what you need and go
5. **Mobile-first** — phone app for creators on the go

## Assumptions (Round 1)

| # | Assumption | Impact if Wrong |
|---|---|---|
| A1 | v1 is a mobile app (not web-only) | Changes entire tech stack and deployment |
| A2 | Primary output is a short video (15-60s) for Instagram Stories/Reels, TikTok, etc. | Affects video rendering, aspect ratios, export formats |
| A3 | v1 supports one video style (e.g., spinning CD visual) — not a template marketplace | Scope control — multiple templates is Phase 2 |
| A4 | Label/agency persona deferred to post-v1 | No multi-user accounts, team features, or batch processing in v1 |
