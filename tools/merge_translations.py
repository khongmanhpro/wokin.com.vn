#!/usr/bin/env python3
"""Ghép bản dịch tay (data/name_translations.json: {idx: "tên VI"}) thành products_vi.json."""
import json, os, re, unicodedata, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def vi_slug(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('đ','d').replace('Đ','D')
    s = re.sub(r'[^a-zA-Z0-9\s-]','', s)
    s = re.sub(r'[\s_]+','-', s.strip().lower())
    return re.sub(r'-{2,}','-', s).strip('-')

trans = json.load(open(os.path.join(DATA,'name_translations.json')))
prods = json.load(open(os.path.join(DATA,'products.json')))
final=[]; seen={}; missing=[]
for i,p in enumerate(prods):
    vi = trans.get(str(i), '').strip()
    if not vi:
        missing.append(i)
        vi = p['name']  # fallback EN
    sv = vi_slug(vi) or 'san-pham'
    if sv in seen:
        seen[sv]+=1; sv=f'{sv}-{p["sku"]}'
    else:
        seen[sv]=1
    final.append({'id':p['id'],'sku':p['sku'],'name_en':p['name'],'name_vi':vi,'slug_vi':sv})
json.dump(final, open(os.path.join(DATA,'products_vi.json'),'w'), ensure_ascii=False, indent=1)
print('TOTAL:', len(final), '| MISSING:', len(missing), missing[:20])
