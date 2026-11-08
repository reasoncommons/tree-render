#!/usr/bin/env python3
"""Build index.html from template.html by inlining ../moodboard/*.jpg as data URIs.

Usage: python3 docs/design/brief-page/build.py
"""
import base64, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
mood = os.path.join(here, '..', 'moodboard')
src = open(os.path.join(here, 'template.html'), encoding='utf-8').read()

def inline(m):
    name = m.group(1)
    path = os.path.join(mood, name)
    if not os.path.exists(path):
        sys.exit(f'missing image: {path}')
    data = base64.b64encode(open(path, 'rb').read()).decode('ascii')
    return f'data:image/jpeg;base64,{data}'

out = re.sub(r'\{\{IMG:([^}]+)\}\}', inline, src)
dest = os.path.join(here, 'index.html')
open(dest, 'w', encoding='utf-8').write(out)
print(f'wrote {dest} ({os.path.getsize(dest) / 1e6:.2f} MB)')
