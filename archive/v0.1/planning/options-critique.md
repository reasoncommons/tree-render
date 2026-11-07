---
title: "Critique of options.md v1"
created: 2026-10-17
parent: [[2026-shareable-tree-visuals]]
---

# Critique of options.md v1 (subagent, 2026-10-17)

**Verdict:** right engine (HTML/CSS + headless Chrome) and right family (editorial pillar poster), but as written it would come out a tidy consulting slide, too dense for a phone, that doesn't show pillars are *reasons*. Ranked issues and fixes; handling in v2 in brackets.

1. **Q2 is a chain of reasons, not four parallel pillars** (risk is real → yet the world races → so slow and steer → and traditions add will). Columns lose the "because… yet… so" logic V2 needs. Use a left **spine** from headline through numbered nodes, big numerals on it, small-caps connectives between pillars. The skill should ask for each tree's logic: inductive (parallel → columns/rows) or deductive (chain → spine + connectives). [Adopted: core of the grammar.]
2. **The synthesis node (Qn.5) is never a pillar**; it is always the "So:" strip. [Adopted.]
3. **4:5 word budget fails**: Q2 question 22 words, pillar leads 13–14 words each, ~120 words total, ~1,000 px of pillar text. Add a **short-label tier** (≤ 6 words per pillar, drafted and flagged) with the full lead as one muted supporting line; and a **short question** (≤ 12 words) for the kicker. [Adopted.]
4. **16:9 "shows children" contradicts the research** (50–70 words per spoken slide). Slide = pillars only; a separate dense handout carries children as ≤ 8-word lines at ≥ 32 px. [Adopted.]
5. **Area overview misses "how parts relate"** and runs ~250 words. Use four tiles (topic, short question, one-line answer), drop pillar headlines, draw real relations as labelled hairlines (Q1 → Q2 "feeds"), mark unfinished trees "open"/draft. [Adopted.]
6. **Skill must specify:** pillar count rules (3 generous; ≥ 5 drop support lines or go carousel); drop order (children → support lines → deck; never kicker, status, numbering); **qualifiers never cut** ("plausibly", "partly", "mostly words"); status stamp; traceable numbering; alt text + short source URL; wait on `document.fonts.ready`, render at 2x; bundle portable fonts or accept PNG-only fidelity. [Adopted; fonts: system Charter + Avenir Next for now, PNG is the artefact, since downloading fonts needs approval.]

**Dismissed too quickly:** carousel + thesis card is the native high-performing social form; a 120-word single image is a wall of text in a feed. Build the template so slide 1 of a carousel is the thesis card. [Noted as next format.]

**Concrete 1080×1350 spec offered:** 72 px margins; kicker 30 px sans caps +0.08em, accent; headline 112 px serif semibold, leading 1.0, owns the top third; deck 38 px serif italic (the asymmetry); numerals 80 px serif accent on a 2 px spine; pillar labels 46 px serif bold; support lines 32 px sans muted; connectives 26 px small caps; "So:" strip as full-bleed ink band; paper #F5F0E6, ink #1E1A16, muted #5A5248, hairline #D8CDB9, accent oxblood #9B2C2C; no boxes, no shadows. [Used as trial starting point.]
