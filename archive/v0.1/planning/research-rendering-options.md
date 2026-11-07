---
title: "Shareable tree visuals: rendering options"
created: 2026-10-17
parent: [[2026-shareable-tree-visuals]]
---

# Rendering options for text-heavy tree posters

Question: which rendering route lets an AI agent (Claude Code on macOS) reliably produce beautiful, text-heavy hypothesis-tree visuals (governing claim + 3–5 pillars + 2–4 sub-points, 8–15-word labels) as PNG and SVG, at phone (1080×1350) and slide (1920×1080) sizes, under the constraint "principles + skill, at most a small bundled helper"? See [problem.md](problem.md) for requirements (V5 looks designed, V6 legible at size, V8 real text in SVG, S2 self-checking, S3 no product).

## Answer

**Lay out in HTML/CSS, render with the already-installed Google Chrome in headless mode.** PNG via `--screenshot`; SVG with real `<text>` via a ~40-line bundled script that reads Chrome's own line boxes and writes them out, and that also reports overflow. Zero installs, browser-grade typography and wrapping (`text-wrap: balance/pretty`, hyphenation, grid/flex), and the agent checks its work by rendering and viewing the PNG. Proven end to end below for a phone card and a 16:9 slide.

**Typst is the strong second** (installed, beautiful typesetting, fastest, PNG/PDF/SVG in one command) but its SVG has glyphs as paths, not text, and it is a less familiar layout language. Use it if PDF/print becomes primary. Mermaid, Graphviz, D3 and Excalidraw are wrong for this job: they produce the "software diagram" look the problem statement rules out.

## What is installed on this machine (checked 2026-10-17)

| Tool | Status |
|---|---|
| Google Chrome 155 (`/Applications/Google Chrome.app`) | **Installed.** Headless `--screenshot` and `--dump-dom` work with no extra packages. |
| Playwright browsers (`~/Library/Caches/ms-playwright/chromium-1234`, headless shell) | Cached browsers present, but no `playwright` npm package installed globally; not needed. |
| typst 0.15.1 (`/opt/homebrew/bin/typst`) | **Installed.** Sees system fonts (Charter, Iowan Old Style, New York, Avenir Next, Helvetica Neue, IBM Plex Sans). |
| node 25.8.1, bun, npx | Installed. |
| mmdc (`~/.config/yarn/global`) | **0.3.6, from 2018, broken**: does not know `flowchart`, emits `viewBox="0 0 -Infinity -Infinity"`. Modern Mermaid needs `npx @mermaid-js/mermaid-cli` (network install). |
| gstack `diagram` skill renderer | Installed and working (bundled modern Mermaid + Excalidraw converter, offline). |
| python3 (Homebrew) | Installed, but **no Pillow, fontTools or cairosvg**. |
| rsvg-convert, cairosvg, inkscape, resvg, Graphviz `dot`, ImageMagick, LaTeX | **Not installed.** |
| `fc-list` | Not on PATH. |

Fonts available (system, no install): **Charter**, **Iowan Old Style**, **New York**, Georgia, Palatino, Baskerville (serif); **Avenir Next**, Avenir, **Helvetica Neue**, SF Pro, **IBM Plex Sans** (sans). Not found: Inter, Source Serif. Charter or Iowan for claims plus Avenir Next for labels is a good, already-available pairing. Caveat: Iowan, Avenir Next, New York are macOS-only, so an SVG with live text renders in fallback fonts on other systems unless fonts are embedded (see SVG notes).

## Comparison

Scores: ●●● good, ●● workable, ● poor.

| Option | Typography | Text wrapping | Layout control | AI reliability / self-check | SVG with real text | Dependencies here | Effort |
|---|---|---|---|---|---|---|---|
| 1. Hand-authored SVG | ●●● (any font) | ● none: manual `<tspan>` per line, guessed widths, overflow invisible until rendered | ●●● absolute, but every coordinate by hand | ● frequent overflow/collision; needs a render loop anyway | ●●● | none to write; needs a renderer (Chrome) to check | high per visual, does not scale to 15–20 nodes |
| 2. Templated SVG + measuring helper (Pillow/fontTools or canvas `measureText`) | ●●● | ●● greedy wrap from metrics; no kerning-aware balance/hyphenation unless you write it | ●● you write the layout engine | ●● deterministic, but helper bugs are yours | ●●● | Pillow/fontTools **missing** (pip install); or run `measureText` in Chrome, which is option 3 by another name | medium-high: you are building a mini layout engine |
| 3. **HTML/CSS + headless Chrome** | ●●● real browser shaping, kerning, ligatures, `text-wrap: balance/pretty`, `hyphens` | ●●● native | ●●● grid/flex, exact px sizes per format | ●●● render, `Read` the PNG, overflow report from the DOM | ●●● via bundled line-box exporter (tested); plain `foreignObject` route is not shareable (see below) | **none** (Chrome installed) | low |
| 4. Mermaid (mmdc / gstack renderer) | ● fixed theme, sans default, centred text in boxes | ●● auto, narrow boxes | ● auto layout, little control | ●● | ●/●● uses `foreignObject` or plain text depending on config | local mmdc broken; gstack renderer works | low, but output is a software diagram |
| 5. Graphviz dot | ● | ● manual `\n` or HTML-like labels, no auto-wrap | ● auto layout, fights you | ●● | ●●● | **not installed** | low, wrong look |
| 6. D3 d3-hierarchy headless | ●● | ● D3 does not wrap text; needs measuring (as option 2) | ●● tree positions only | ●● | ●●● | needs npm packages + jsdom or a browser | medium, and it only solves node placement, which is the easy part |
| 7. Excalidraw JSON / gstack `diagram` | ● hand-drawn Virgil/Excalifont or plain sans | ●● | ● | ●● | ●● | gstack renderer installed | low, wrong look (sketchy), but editable on excalidraw.com |
| 8a. **Typst** | ●●● excellent (proper typesetting, OpenType features, hyphenation, justification) | ●●● native | ●●● grid, place, measure; exact pt sizes | ●●● `typst compile` to PNG, view; errors are clear; compiles in ~0.1 s | ● SVG has glyphs as `<path>`/`<use>`, **no `<text>`**; PDF has real text | **installed** | low-medium (new language for most editors; good LLM fluency but less than HTML) |
| 8b. LaTeX/TikZ | ●●● | ●● (`text width=` in nodes) | ●●● but verbose | ●● slow, cryptic errors | ● via dvisvgm, glyphs as paths | **not installed** (large) | high |
| 9a. Satori (Vercel; JSX → SVG) | ●● flexbox subset, no grid, limited CSS | ●● | ●● | ●● | ● text emitted as paths by default | needs npm install + font files | medium |
| 9b. resvg / rsvg-convert / cairosvg (SVG → PNG) | n/a (rasterisers) | none | n/a | useful as an independent SVG check | n/a | **none installed**; Chrome does the same job | n/a |

## Notes on each route

**1. Hand-authored SVG.** SVG 1.1/2 has no text wrapping in practice (SVG 2 `inline-size` is unsupported in most renderers). Every line becomes a `<tspan x= dy=>` with widths guessed from character counts; with 8–15-word labels in proportional fonts the agent will regularly overflow boxes and only find out by rendering. Fine for a 3-node card, painful for 15–20 nodes and multiple sizes.

**2. Templated SVG with a measuring helper.** Workable (wrap with Pillow `ImageFont.getlength` or fontTools advance widths, then emit tspans), but it means writing a small layout engine: line breaking, line height, box sizing, vertical rhythm, and later balance/hyphenation. Pillow and fontTools are not installed. If measurement happens in Chrome via canvas `measureText`, you are already in the browser and should just let CSS lay it out (option 3).

**3. HTML/CSS + headless Chrome (recommended).** The browser is the best text-layout engine on the machine, and LLMs write HTML/CSS more fluently than anything else here. Fix `body` to the target pixel size (1080×1350 phone, 1920×1080 slide), lay out with grid/flex, render. Findings from testing:

- **PNG:** `--screenshot` with `--window-size` equal to the body size; `--force-device-scale-factor=2` gives a crisp 2160×2700 retina PNG. About 1.3 s per render.
- **SVG export, the `foreignObject` trap:** wrapping HTML in `<svg><foreignObject>` "works" in Chrome but the SVG is not portable (Figma, Illustrator, Inkscape, rsvg, LinkedIn, many viewers ignore or mangle `foreignObject`), and the text is not real SVG text. Do not use it for shareable SVG.
- **SVG export, what works:** after layout, a small script walks text nodes, uses `Range.getClientRects()` on each break-opportunity token (words, hyphens, slashes) to find where Chrome broke the lines, and writes one `<text>` per line at the measured position with the computed font, size, weight, letter-spacing, colour and `text-transform`; backgrounds and borders become `<rect>`s. Run via `--dump-dom`, extract, done. The re-rendered SVG was visually identical to the HTML screenshot for both test layouts. Text stays selectable and editable in Figma/Illustrator/Inkscape.
- **Self-check for free:** the same script reports any element that overflows its box or falls outside the canvas (tested: shrinking the slide to 700 px tall produced `outside canvas: cols`, `foot`, etc.). That is S2's overflow check.
- **Bug found and fixed in testing:** a hyphenated word broken across lines ("crisis-/driven") was first placed whole on line 1; tokenising on hyphens/dashes/slashes as well as spaces fixed it. Lesson for the skill: always re-render the exported SVG to PNG and look at it, not just the HTML.
- **Limits of the exporter** (fine for this design language, document in the skill): supports text, solid backgrounds, borders/rules, rounded rects; not gradients, shadows, images, CSS transforms, justified text (word spacing is not preserved, so keep text left- or centre-aligned), or inline SVG (connectors would need adding: either draw them as borders, or extend the script to copy inline `<svg>` children through). Fonts are referenced by name, so for sharing the SVG beyond macOS either use widely available fonts, embed an `@font-face` with a base64 font in the SVG's `<style>`, or treat the PNG as the posted artefact and the SVG as the editable master.

**4. Mermaid.** The local `mmdc` is a 2018 build and fails on current syntax. The gstack renderer (below) produced a correct flowchart of the test tree: grey boxes, centred Helvetica-ish text, curved arrows. It is exactly the "reads as system architecture" look the problem rules out (Complication 3), with little control over typography, box widths or spacing.

**5. Graphviz.** Not installed. No automatic text wrapping (manual `\n` or HTML-like table labels), auto layout that resists fixed poster formats, and the same software-diagram look.

**6. D3 d3-hierarchy.** Computes node x/y for trees, which is the trivial part here (3–5 pillars in columns). It does not wrap text; headless use needs jsdom plus a measuring step, i.e. option 2's problems. Only worth it for large radial/organic trees, which are out of scope.

**7. Excalidraw and the gstack `diagram` skill.** `~/.claude/skills/diagram/SKILL.md` symlinks to `~/.claude/skills/gstack/diagram/SKILL.md`. It turns an English description into Mermaid source, then renders a "triplet" fully offline: `<slug>.mmd`, an editable `<slug>.excalidraw` scene (box-by-box editable for flowcharts and sequence diagrams; other Mermaid types become one image element), and `<slug>.svg` + `<slug>.png` (1950 px wide). Rendering runs a self-contained bundle (`~/.claude/skills/gstack/lib/diagram-render/dist/diagram-render.html`) through `bun run ~/.claude/skills/gstack/bin/gstack-render.ts` in Aside or gstack's headless browser, with mermaid passed in base64. It also supports re-rendering an edited `.excalidraw`. Recommends 5–15 short-label nodes. Tested on the 4-node tree here: works first time (`ENGINE=browse`, three `OK` lines). Good for architecture/flow diagrams and quick editable sketches; wrong aesthetic for a posted thesis poster (Mermaid default theme; Excalidraw is hand-drawn). Its architecture (self-contained HTML page driven by a headless browser, outputs read back) is, notably, the same pattern as the recommended route.

**8. Typst.** Strong typesetting with system fonts, native wrapping and hyphenation, `grid`, absolute `place`, `measure` for fit checks, and a single binary already installed. The test card compiled to PNG in 0.28 s and looked as good as Chrome's, with slightly more generous default leading. Outputs: PNG (`--ppi`), PDF (real, selectable text, good for print/use 3), SVG (glyph outlines, 0 `<text>` elements in the test: fails V8 "real text in SVG", and is not editable as text). LaTeX/TikZ: not installed, heavy, slow, worse error messages; no advantage over Typst here.

**9. Others.** Satori is designed for OG images: JSX with a flexbox subset, no grid, text outlined as paths, needs npm packages and font buffers; Chrome does everything it does, better. resvg/rsvg/cairosvg are rasterisers only, none installed; they would be a nice independent "does this SVG render outside Chrome" check, but Chrome rendering the SVG file directly is sufficient for now.

## Tested commands (all worked on this machine)

Scratch directory used: `/private/tmp/claude-502/-Users-rgrp-src-rufuspollock-planning/dabc5269-0a3c-486d-8cb7-c8b1ff92ba40/scratchpad/t` (temporary). Test files: `card.html` (1080×1350, question kicker + claim + 3 numbered pillars + footer, Iowan Old Style + Avenir Next), `slide.html` (1920×1080, claim + 3 pillar columns with 2–3 sub-points each, Charter + Avenir Next).

```bash
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# PNG (1x and 2x). Window size must equal the fixed body size in the HTML.
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1080,1350 --screenshot="$PWD/card.png" "file://$PWD/card.html"
"$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1080,1350 --screenshot="$PWD/card@2x.png" "file://$PWD/card.html"

# SVG with real <text> + overflow report: page includes <script src="html2svg.js"></script> before </body>
"$CH" --headless=new --disable-gpu --window-size=1920,1080 --virtual-time-budget=2000 --dump-dom "file://$PWD/slide.html" 2>/dev/null > dump.html
python3 -c "
import re,html; d=open('dump.html').read()
print(html.unescape(re.search(r'<pre id=\"warnings\">(.*?)</pre>',d,re.S).group(1)))   # 'OK' or overflow list
open('slide.svg','w').write(html.unescape(re.search(r'<pre id=\"svgout\">(.*?)</pre>',d,re.S).group(1)))"

# Re-render the SVG to PNG to check it (then view with the Read tool)
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 --screenshot="$PWD/slide-svg.png" "file://$PWD/slide.svg"

# Typst comparison: PNG and (glyph-outline) SVG
typst compile card.typ card-typst.png --ppi 72
typst compile card.typ card-typst.svg

# gstack diagram renderer (Mermaid -> SVG/PNG/Excalidraw), for comparison
SRC=$(base64 < tree.mmd | tr -d '\n')
bun run ~/.claude/skills/gstack/bin/gstack-render.ts "$PWD/rd/dr.html" --wait-selector '#done' \
  --eval "window.__renderMermaid('diagram-1', atob('$SRC')).then(s => (window.__svg = s))" --out gs-tree.svg \
  --eval "window.__rasterize(window.__svg, 1950)" --out gs-tree.png \
  --eval "window.__mermaidToExcalidraw(atob('$SRC')).then(j => (window.__scene = j))" --out gs-tree.excalidraw
```

Chrome prints harmless `task_policy_set ... invalid argument` lines on stderr; ignore them. The `-c` extraction step could be folded into a tiny `render.sh` in the skill.

### The exporter script (tested, 42 lines)

Candidate for the skill's bundled helper (S3 allows "a small template or layout helper").

```js
// html2svg.js: runs inside the laid-out page; converts text line boxes + rules/backgrounds to an SVG with real <text>, and reports overflow.
(function(){
  const W=document.body.offsetWidth, H=document.body.offsetHeight;
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ctx=document.createElement('canvas').getContext('2d');
  const out=[], warn=[];
  const bg=getComputedStyle(document.body).backgroundColor;
  out.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);
  for(const el of document.body.querySelectorAll('*')){
    const cs=getComputedStyle(el), r=el.getBoundingClientRect();
    if(cs.backgroundColor!=='rgba(0, 0, 0, 0)') out.push(`<rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}" rx="${parseFloat(cs.borderTopLeftRadius)||0}" fill="${cs.backgroundColor}"/>`);
    for(const side of ['Top','Bottom','Left','Right']){const w=parseFloat(cs['border'+side+'Width']); if(w>0&&cs['border'+side+'Style']!=='none'){const c=cs['border'+side+'Color'];
      const g={Top:[r.left,r.top,r.width,w],Bottom:[r.left,r.bottom-w,r.width,w],Left:[r.left,r.top,w,r.height],Right:[r.right-w,r.top,w,r.height]}[side];
      out.push(`<rect x="${g[0]}" y="${g[1]}" width="${g[2]}" height="${g[3]}" fill="${c}"/>`);}}
    if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1) if(cs.overflow!=='visible'||el===document.body) warn.push('overflow: '+el.className);
    if(r.bottom>H+0.5||r.right>W+0.5) warn.push('outside canvas: '+(el.className||el.tagName));
  }
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n; while((n=walker.nextNode())){
    if(!n.data.trim()) continue;
    const cs=getComputedStyle(n.parentElement);
    const font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.font=font;
    const up=cs.textTransform==='uppercase';
    // split into lines using per-token rects (break opportunities: spaces, hyphens, dashes, slashes)
    const re=/[^\s\-–—\/]+[\-–—\/]?|[\-–—\/]/g;
    let m, lines=[], cur=null;
    while((m=re.exec(n.data))){
      const rg=document.createRange(); rg.setStart(n,m.index); rg.setEnd(n,m.index+m[0].length);
      const rr=rg.getClientRects()[0]; if(!rr) continue;
      if(!cur||Math.abs(rr.top-cur.top)>2){cur={top:rr.top,bottom:rr.bottom,x:rr.left,start:m.index,end:m.index+m[0].length}; lines.push(cur);} else cur.end=m.index+m[0].length;
    }
    for(const L of lines){
      let t=n.data.slice(L.start,L.end).replace(/\s+/g,' '); if(up) t=t.toUpperCase();
      const mt=ctx.measureText(t); const base=L.bottom-mt.fontBoundingBoxDescent;
      out.push(`<text x="${L.x.toFixed(1)}" y="${base.toFixed(1)}" font-family='${cs.fontFamily.replace(/'/g,'"')}' font-size="${cs.fontSize}" font-weight="${cs.fontWeight}"${cs.fontStyle!=='normal'?` font-style="${cs.fontStyle}"`:''}${cs.letterSpacing!=='normal'?` letter-spacing="${cs.letterSpacing}"`:''} fill="${cs.color}" xml:space="preserve">${esc(t)}</text>`);
    }
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${out.join('\n')}\n</svg>`;
  const pre=document.createElement('pre'); pre.id='svgout'; pre.textContent=svg;
  const w=document.createElement('pre'); w.id='warnings'; w.textContent=warn.join('\n')||'OK';
  document.body.replaceChildren(pre,w);
})();
```

Known gaps to close when bundling: pass through inline `<svg>` connectors; emit `<title>`/`<desc>` for alt text (V8); optionally embed fonts; skip invisible elements; warn on text below a minimum effective size (V6) by checking computed `font-size` against the format's floor.

## Recommendation

1. **Route:** HTML/CSS template per format (branch poster 1080×1350, slide 1920×1080, overview page), rendered by headless Chrome. PNG is the posted artefact; SVG (real text, via the exporter) is the editable master; optional PDF via Chrome `--print-to-pdf` if print matters.
2. **Bundle in the skill:** one or two HTML templates with CSS tokens (type scale, colours, spacing) per format, `html2svg.js`, and a ~15-line `render.sh` wrapping the commands above (PNG 2x, SVG export, overflow report, SVG re-render).
3. **Skill loop (S2):** write HTML from the Markdown tree, render, check the overflow report is `OK`, `Read` the PNG and critique against V1–V8, re-render the SVG and view it, iterate.
4. **Keep Typst as the fallback** for print/PDF-first outputs, and the gstack `diagram` skill for genuinely diagrammatic needs (flows, architecture), not for thesis posters.
5. **Avoid** hand-authored SVG, Mermaid, Graphviz, D3 and Excalidraw for these visuals; avoid `foreignObject` SVG.
