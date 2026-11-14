#!/usr/bin/env python3
"""Regenerate the README's before/after image (docs/images/hero-before-after.png).

Run from anywhere: python3 skills/tree-render/render/scripts/hero.py  (needs Node, Chrome and Pillow).
Left: a nested bullet list as people write it (wordy notes). Right: tree-render's default (ribbon) render
of TREE, one level below the root (the README's full-tree image is the next one down). The page is laid out at README width (WIDTH CSS px), shot at 2x with scripts/png.js and saved as a
256-colour PNG.
"""
import html
import os
import re
import subprocess
import sys
import tempfile

from gallery import IMAGES, RENDER, ROOT, save
from PIL import Image

TREE = os.path.join(ROOT, 'examples', 'speed-of-wisdom.md')
OUT = os.path.join(IMAGES, 'hero-before-after.png')
WIDTH, HEIGHT, SCALE = 900, 470, 2
LIST_W, GAP_W = 272, 100  # the notes panel and the arrow between; the tree gets the rest

# The "before": the same argument as raw notes, the way it might sit in a document. (level, text)
NOTES = [
    (0, 'How fast should we be developing AI? Given the existential risk, and the real chance that alignment fails, what should we actually do, and what do wisdom traditions suggest?'),
    (1, 'The risks are real but contested, and I think the uncertainty is itself a reason for caution'),
    (2, 'four families of catastrophic risk: loss of control, misuse, concentration of power, gradual disempowerment (the last two remain even if alignment works!)'),
    (2, 'experts disagree hugely on the odds (10% on one panel, 0.38% for superforecasters) but we have to decide anyway'),
    (1, 'Why does everyone race? Basically a collective action trap: commercial competition, US–China rivalry, each lab sure it is the safer pair of hands ("if we don\'t, others will")'),
    (1, 'So we should slow and steer: slower at the frontier, faster on safety, and the choice should not be left to a few CEOs and two governments'),
    (2, 'restraint has worked before (few actors, chokepoints, verification) but AI is the hardest case, so start narrow'),
    (1, 'Wisdom traditions: clear that we should slow down, much less on how; strongest on will and process'),
    (1, 'Conclusion: everyone (labs, states, communities, individuals) pushes towards the speed of wisdom with their own lever'),
]


def tree_svg(tmp):
    # One level below the root: at README width the points stay readable (the full tree is the next image).
    tree = os.path.join(tmp, 'tree.md')
    with open(TREE, encoding='utf8') as f, open(tree, 'w', encoding='utf8') as g:
        g.writelines(line for line in f if not line.startswith('    -'))
    r = subprocess.run(['node', 'bin/render.js', tree, '--no-png', '--out', tmp, '--name', 'tree'], cwd=RENDER, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'render failed:\n{r.stdout}{r.stderr}')
    svg = open(os.path.join(tmp, 'tree.svg'), encoding='utf8').read()
    # Scale to the space it gets: drop the fixed size, keep the viewBox.
    return re.sub(r'(<svg\b[^>]*?)\swidth="[\d.]+"\sheight="[\d.]+"', r'\1', svg, count=1)


def page(svg):
    items = ''.join(f'<li class="l{lvl}">{html.escape(t)}</li>' for lvl, t in NOTES)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;padding:0;background:#fff;overflow:hidden}}
.wrap{{display:flex;align-items:center;width:{WIDTH}px;height:{HEIGHT}px;box-sizing:border-box;padding:16px 8px}}
.notes{{flex:0 0 {LIST_W}px;height:100%;box-sizing:border-box;padding:16px 16px 0;background:#f6f7f9;border:1px solid #dfe2e6;border-radius:8px;overflow:hidden;position:relative;
  font:11.5px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#3a3f45}}
.notes h3{{margin:0 0 8px;font-size:13px;font-weight:600;color:#24292f}}
.notes ul{{margin:0;padding:0;list-style:none}}
.notes li{{position:relative;margin:0 0 4px}}
.notes li::before{{position:absolute;left:-11px}}
.l0{{margin-left:11px!important}} .l0::before{{content:"•"}}
.l1{{margin-left:22px!important}} .l1::before{{content:"◦"}}
.l2{{margin-left:33px!important}} .l2::before{{content:"▪";font-size:8px;top:2px}}
.notes::after{{content:"";position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(rgba(246,247,249,0),#f6f7f9)}}
.arrow{{flex:0 0 {GAP_W}px;text-align:center;color:#8a9099;font:11px/1.2 ui-monospace,Menlo,monospace;white-space:nowrap}}
.arrow b{{display:block;font:300 34px/1 -apple-system,Helvetica,sans-serif;color:#6b7178;margin-bottom:4px}}
.tree{{flex:1 1 auto;min-width:0;height:100%;display:flex;align-items:center}}
.tree svg{{display:block;width:100%;height:auto;max-height:100%}}
</style></head><body><div class="wrap">
<div class="notes"><h3>AI: how fast? (notes)</h3><ul>{items}</ul></div>
<div class="arrow"><b>→</b>tree-render</div>
<div class="tree">{svg}</div>
</div></body></html>'''


def main():
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, 'hero.html')
        open(p, 'w', encoding='utf8').write(page(tree_svg(tmp)))
        shot = os.path.join(tmp, 'hero.png')
        r = subprocess.run(['node', 'scripts/png.js', p, '--width', str(WIDTH), '--height', str(HEIGHT), '--scale', str(SCALE), '--out', shot], cwd=RENDER, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f'png.js failed:\n{r.stdout}{r.stderr}')
        save(Image.open(shot).convert('RGB'), OUT)


if __name__ == '__main__':
    main()
