#!/usr/bin/env python3
"""Extract full product data from wokintools.com WP REST API -> JSON + CSV."""
import json, os, time, urllib.request, csv, sys

BASE = 'https://www.wokintools.com'
OUT = os.path.expanduser('~/wokin-research/data')
os.makedirs(OUT, exist_ok=True)

def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (research)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print(f'retry {i+1} {url}: {e}', file=sys.stderr)
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'failed: {url}')

# 1. Pull all products via WooCommerce Store API
products = []
page = 1
while True:
    items = fetch(f'{BASE}/wp-json/wc/store/v1/products?per_page=100&page={page}')
    if not items:
        break
    products.extend(items)
    print(f'products page {page}: {len(items)} (total {len(products)})')
    if len(items) < 100:
        break
    page += 1
    time.sleep(0.4)

slim = []
for p in products:
    slim.append({
        'id': p['id'], 'name': p['name'], 'slug': p['slug'], 'sku': p['sku'],
        'type': p['type'],
        'categories': [{'name': c['name'], 'slug': c['slug']} for c in p.get('categories', [])],
        'images': [{'src': i['src'], 'alt': i.get('alt', '')} for i in p.get('images', [])],
        'short_description': p.get('short_description', ''),
        'description': p.get('description', ''),
        'attributes': [{'name': a.get('name'), 'values': a.get('values'), 'visible': a.get('visible')} for a in p.get('attributes', [])],
    })

with open(f'{OUT}/products.json', 'w') as f:
    json.dump(slim, f, ensure_ascii=False)

# CSV rút gọn cho review nhanh
with open(f'{OUT}/products.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['sku', 'name', 'category_slugs', 'main_image'])
    for s in slim:
        w.writerow([s['sku'], s['name'], '|'.join(c['slug'] for c in s['categories']),
                    s['images'][0]['src'] if s['images'] else ''])

# 2. Categories
cats = fetch(f'{BASE}/wp-json/wp/v2/product_cat?per_page=100&hide_empty=true')
cat_slim = [{'id': c['id'], 'name': c['name'], 'slug': c['slug'], 'count': c['count'], 'parent': c['parent']} for c in cats]
with open(f'{OUT}/categories.json', 'w') as f:
    json.dump(cat_slim, f, ensure_ascii=False, indent=1)

# 3. Dates cho feature "NEW PRODUCTS" (wp/v2 products, fields tối thiểu)
dated = []
page = 1
while True:
    items = fetch(f'{BASE}/wp-json/wp/v2/product?per_page=100&page={page}&_fields=id,date,slug&_locale=user')
    if not items:
        break
    dated.extend(items)
    if len(items) < 100:
        break
    page += 1
    time.sleep(0.3)
with open(f'{OUT}/product_dates.json', 'w') as f:
    json.dump(dated, f, ensure_ascii=False)

print('DONE products:', len(slim), '| categories:', len(cat_slim), '| dated:', len(dated))
