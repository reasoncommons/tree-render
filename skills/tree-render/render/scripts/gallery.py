#!/usr/bin/env python3
"""Regenerate the gallery images (docs/images/gallery/), the README hero and the styles strip.

Run from anywhere: python3 skills/tree-render/render/scripts/gallery.py  (needs Node, Chrome and Pillow).
Each image is the renderer's 2x PNG, scaled to at most 1400 px wide and saved as a 256-colour PNG
(well under 250 KB). The commands are the ones docs/gallery.md shows under each image.
"""
import os
import shlex
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

RENDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ROOT = os.path.abspath(os.path.join(RENDER, '..', '..', '..'))
IMAGES = os.path.join(ROOT, 'docs', 'images')
GALLERY = os.path.join(IMAGES, 'gallery')
LABEL_FONT = os.path.join(ROOT, 'skills', 'tree-render', 'fonts', 'IBMPlexSans-Regular.woff')
TREE = '../../../examples/speed-of-wisdom.md'
FOUR = '../../../examples/four-questions.md'
WIDTH = 1400

# name -> the options after the tree (the gallery shows `node bin/render.js <tree> <options> --out out`).
SHOTS = {
    'ribbon': (TREE, ''),
    'ribbon-wise-ink': (TREE, '--palette wise-ink --font bricolage'),
    'ribbon-root-dot': (TREE, '--root-style dot'),
    'ribbon-root-centre': (TREE, '--root-style centre'),
    'ribbon-root-box': (TREE, '--root-style box'),
    'ribbon-root-outline': (TREE, '--root-style outline'),
    'ribbon-curve-coggle': (TREE, '--curve coggle'),
    'ribbon-one-level': (FOUR, '--root-style centre'),
    'coggle-exact': (TREE, '--style coggle-exact'),
    'coggle-exact-wise-print': (TREE, '--style coggle-exact --palette wise-print --font bricolage'),
    'coggle-exact-bricolage': (TREE, '--style coggle-exact --font bricolage'),
    'coggle-exact-root-run': (TREE, '--style coggle-exact --root-run coggle'),
    'coggle-thin': (TREE, '--style coggle-thin'),
    'coggle-thin-wise-ink': (TREE, '--style coggle-thin --palette wise-ink'),
    'dendrogram': (TREE, '--style dendrogram'),
    'dendrogram-curve-coggle': (TREE, '--style dendrogram --curve coggle'),
    'lanes': (TREE, '--style lanes'),
    'coggle-exact-sizes': (TREE, '--style coggle-exact --sizes 24,18,15,15'),
    'coggle-exact-depth': (TREE, '--style coggle-exact --depth 1'),
}
# Shown as one image: the four root styles side by side, cropped to the root and its branches.
ROOT_STYLES = ['ribbon-root-dot', 'ribbon-root-centre', 'ribbon-root-box', 'ribbon-root-outline']
STRIP = [('ribbon', 'ribbon (default)'), ('coggle-exact', 'coggle-exact'), ('coggle-thin', 'coggle-thin'), ('dendrogram', 'dendrogram'), ('lanes', 'lanes')]


def render(tmp, name, tree, opts):
    cmd = ['node', 'bin/render.js', tree, *shlex.split(opts), '--out', tmp, '--name', name]
    r = subprocess.run(cmd, cwd=RENDER, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'{" ".join(cmd)} failed:\n{r.stdout}{r.stderr}')
    return Image.open(os.path.join(tmp, name + '.png')).convert('RGB')


def fit(im, width):
    return im if im.width <= width else im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def save(im, path):
    im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    print(f'{os.path.relpath(path, ROOT)}  {im.width}x{im.height}  {os.path.getsize(path) // 1024} KB')


def label(draw, text, cx, y, size):
    font = ImageFont.truetype(LABEL_FONT, size)
    w = draw.textlength(text, font=font)
    draw.text((cx - w / 2, y), text, fill='#333333', font=font)


def main():
    os.makedirs(GALLERY, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        ims = {name: render(tmp, name, *spec) for name, spec in SHOTS.items()}

    for name, im in ims.items():
        if name not in ROOT_STYLES:
            save(fit(im, WIDTH), os.path.join(GALLERY, name + '.png'))

    # Root styles: the left part of each render (the root and where its branches leave it), side by side.
    panel_w, gap, label_h = 320, 40, 64
    crops = []
    for name in ROOT_STYLES:
        im = ims[name]
        w = round(im.width * 0.385)  # up to where the level-1 text starts
        h = round(w * 0.8)
        top = max(0, im.height // 2 - h // 2)
        crops.append(fit(im.crop((0, top, w, min(im.height, top + h))), panel_w))
    ph = max(c.height for c in crops)
    sheet = Image.new('RGB', (len(crops) * panel_w + (len(crops) - 1) * gap, ph + label_h), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (c, name) in enumerate(zip(crops, ROOT_STYLES)):
        x = i * (panel_w + gap)
        sheet.paste(c, (x, (ph - c.height) // 2))
        label(d, '--root-style ' + name.rsplit('-', 1)[1] + (' (default)' if name.endswith('dot') else ''), x + panel_w / 2, ph + 16, 24)
    save(sheet, os.path.join(GALLERY, 'ribbon-root-styles.png'))

    # README hero and the five-style strip.
    save(fit(ims['ribbon'], WIDTH), os.path.join(IMAGES, 'hero-ribbon.png'))
    panel_w, panel_h, label_h = 510, 380, 92
    strip = Image.new('RGB', (panel_w * len(STRIP), panel_h + label_h), 'white')
    d = ImageDraw.Draw(strip)
    for i, (name, text) in enumerate(STRIP):
        im = ims[name]
        s = min((panel_w - 30) / im.width, (panel_h - 20) / im.height)
        t = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        strip.paste(t, (i * panel_w + (panel_w - t.width) // 2, (panel_h - t.height) // 2 + 10))
        label(d, text, i * panel_w + panel_w / 2, panel_h + 20, 34)
    save(strip, os.path.join(IMAGES, 'styles-strip.png'))


if __name__ == '__main__':
    main()
