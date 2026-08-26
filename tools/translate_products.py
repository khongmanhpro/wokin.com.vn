#!/usr/bin/env python3
"""Dịch tên sản phẩm EN → VI chuyên ngành bằng vi-glossary.json (rule-based, có sắp lại trật tự từ).

Thuật toán:
1. Unescape HTML entities (&#8243; → ", &#8217; → ').
2. Tách các "token ngữ nghĩa": số lượng (NPCS), thông số kỹ thuật trong ngoặc (…), mã kích thước (1/2", 20V, 500 N.m).
3. Dịch phần danh từ bằng từ điển cụm DÀI NHẤT TRƯỚC.
4. Sắp xếp trật tự tiếng Việt: [Danh từ chính dịch] + [thông số/kích cỡ] + [số lượng] + [(ngoặc)].

Output: data/products_vi.json — {id, slug, sku, name_en, name_vi}
"""
import json, os, re, html as htmllib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
gloss = json.load(open(os.path.join(ROOT, 'data/vi-glossary.json')))
prods = json.load(open(os.path.join(ROOT, 'data/products.json')))

terms = sorted(gloss['terms'], key=lambda t: -len(t[0]))
TERM_MAP = dict(terms)

# các từ khóa chính (head noun) — khi xuất hiện thì cụm số lượng chen vào sau nó
HEADS = ['bộ dụng cụ', 'bộ tuýp', 'bộ mũi vít', 'tủ dụng cụ bánh xe', 'hộp dụng cụ', 'túi đựng dụng cụ',
         'bộ đồ nghề', 'bộ lục giác', 'bộ dũa', 'bộ đục', 'búa', 'kìm', 'cờ lê', 'tua vít', 'máy', 'súng']

SPEC_RE = re.compile(r'\(([^()]*)\)')
QTY_RE = re.compile(r'^(\d+)\s*(?:PCS|Pcs|pcs|PC)\b\s*')

def translate_chunk(s: str) -> str:
    """Dịch 1 đoạn danh từ: thay cụm dài trước, ngắn sau."""
    for en, vi in terms:
        if en in s:
            s = s.replace(en, vi)
    # dọn chữ hoa còn sót không có nghĩa: nếu token toàn CHỮ HOA chưa dịch và không nằm trong map → giữ nguyên (tên riêng/mã)
    return re.sub(r'\s{2,}', ' ', s).strip()

def translate_name(raw: str) -> str:
    name = htmllib.unescape(raw)          # &#8243; → ″, &#8217; → '
    specs = SPEC_RE.findall(name)          # nội dung ngoặc
    core = SPEC_RE.sub('', name).strip()   # phần ngoài ngoặc

    qty = None
    mq = QTY_RE.match(core)
    if mq:
        qty = f'{mq.group(1)} chi tiết'
        core = core[mq.end():].strip()

    core = translate_chunk(core)

    # dịch nội dung ngoặc nếu là từ điển được (INDUSTRIAL, PREMIUM...), giữ mã kỹ thuật
    spec_map = {'INDUSTRIAL': 'Công nghiệp', 'Industrial': 'Công nghiệp',
                'PREMIUM': 'Cao cấp', 'Premium': 'Cao cấp'}
    vi_specs = []
    for sp in specs:
        sp_t = spec_map.get(sp.strip(), None)
        if sp_t:
            vi_specs.append(sp_t)
        elif re.fullmatch(r'[\d\s./"″°\-–—+A-Za-z.Nm]+', sp):
            vi_specs.append(sp.strip())      # thông số kỹ thuật giữ nguyên
        else:
            vi_specs.append(sp.strip())

    # sắp trật tự VI: head lên trước, qty ngay sau head
    out = core
    if qty:
        placed = False
        low = out.lower()
        for h in sorted(HEADS, key=-len(HEADS[0]).__class__(0).__neg__() if False else lambda x: -len(x)):
            idx = low.find(h)
            if idx != -1:
                end = idx + len(h)
                # nếu head có bổ ngữ "chi tiết/cổ..." phía sau dạng 'bộ tuýp cổ 1/4"' thì chèn sau cả cụm đơn vị
                m = re.match(r'[\wàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũừứựửữỳýỵỷỹđĐ]*(\s+[\d/."″]+)?', out[end:])
                if m and m.group(0):
                    end += m.end()
                out = out[:end].rstrip() + ' ' + qty + out[end:].lstrip(' ,')
                placed = True
                break
        if not placed:
            parts = out.split(' ', 1)
            out = parts[0] + (' ' + qty + (' ' + parts[1] if len(parts) > 1 else ''))

    for sp in vi_specs:
        out += f' ({sp})'

    out = re.sub(r'\s{2,}', ' ', out).strip()
    return out[:1].upper() + out[1:]

out = []
changed = same = 0
for p in prods:
    vi = translate_name(p['name'])
    out.append({'id': p['id'], 'slug': p['slug'], 'sku': p['sku'], 'name_en': p['name'], 'name_vi': vi})
    changed += vi != p['name']
    same += vi == p['name']

json.dump(out, open(os.path.join(ROOT, 'data/products_vi.json'), 'w'), ensure_ascii=False, indent=1)
print(f'dịch: {changed}, giữ nguyên: {same}')

import random
random.seed(11)
print('\n--- MẪU NGẪU NHIÊN ---')
for r in random.sample(out, 15):
    print(f'{r["name_en"]}\n   → {r["name_vi"]}')
