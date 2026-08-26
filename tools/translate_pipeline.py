#!/usr/bin/env python3
"""Tách danh sách tên SP thành 3 batch JSON để dịch song song + gộp kết quả + sinh slug VI."""
import json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def split():
    prods = json.load(open(os.path.join(DATA, 'products.json')))
    n = len(prods)
    size = (n + 2) // 3
    for i in range(3):
        batch = [{'id': p['id'], 'sku': p['sku'], 'name_en': p['name']} for p in prods[i*size:(i+1)*size]]
        json.dump(batch, open(os.path.join(DATA, f'translate_batch_{i+1}.json'), 'w'), ensure_ascii=False, indent=1)
        print(f'batch {i+1}: {len(batch)} items')

def vi_slug(name_vi: str) -> str:
    """Slug không dấu chuẩn SEO: bỏ dấu tiếng Việt, lowercase, gạch ngang."""
    s = unicodedata.normalize('NFD', name_vi)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('đ', 'd').replace('Đ', 'D')
    s = re.sub(r'[^a-zA-Z0-9\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s.strip().lower())
    s = re.sub(r'-{2,}', '-', s).strip('-')
    return s

def merge():
    merged = {}
    for i in range(3):
        path = os.path.join(DATA, f'translate_result_{i+1}.json')
        if not os.path.exists(path):
            print(f'THIEU translate_result_{i+1}.json'); sys.exit(1)
        for r in json.load(open(path)):
            merged[str(r['id'])] = r
    prods = json.load(open(os.path.join(DATA, 'products.json')))
    final = []
    missing = []
    for p in prods:
        r = merged.get(str(p['id']))
        if not r or not r.get('name_vi', '').strip():
            missing.append(p['id']); continue
        slug_vi = vi_slug(r['name_vi'])
        final.append({'id': p['id'], 'sku': p['sku'], 'name_en': p['name'],
                      'name_vi': r['name_vi'], 'slug_vi': slug_vi})
    # xử lý trùng slug VI
    seen = {}
    for f in final:
        s = f['slug_vi'] or 'san-pham'
        if s in seen:
            seen[s] += 1
            f['slug_vi'] = f'{s}-{f["sku"]}'
        else:
            seen[s] = 1
    json.dump(final, open(os.path.join(DATA, 'products_vi.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'merged: {len(final)} | missing: {missing}')
    dup = {k: v for k, v in seen.items() if v > 1}
    print(f'slug bi trung (da them sku): {len(dup)}')
    import random; random.seed(3)
    for r in random.sample(final, 10):
        print(f'→ {r["name_vi"]}  [{r["slug_vi"]}]')

if __name__ == '__main__':
    {'split': split, 'merge': merge}[sys.argv[1]]()
