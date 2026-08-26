#!/usr/bin/env python3
"""Tải toàn bộ ảnh product wokintools.com về public/images/products/<sku>/.
Chạy 1 lần trước khi build Next.js. Output kèm manifest.json map slug -> local paths."""
import json, os, sys, urllib.request, concurrent.futures as cf

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
DEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public/images/products')
MANIFEST = os.path.join(ROOT, 'image_manifest.json')

def dl(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return True
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f:
                f.write(r.read())
            return True
        except Exception as e:
            print(f'retry {i+1}: {url} {e}', file=sys.stderr)
    return False

def ext_of(url):
    e = os.path.splitext(url.split('?')[0])[1].lower()
    return e if e in ('.jpg', '.jpeg', '.png', '.webp') else '.jpg'

def main(limit=None):
    os.makedirs(DEST, exist_ok=True)
    prods = json.load(open(os.path.join(ROOT, 'products.json')))
    if limit:
        prods = prods[:limit]
    jobs = []  # (url, path, slug)
    manifest = {}
    for p in prods:
        sku = p['sku'] or p['slug']
        d = os.path.join(DEST, sku)
        paths = []
        for n, img in enumerate(p['images']):
            fn = f'{n}{ext_of(img["src"])}'
            jobs.append((img['src'], os.path.join(d, fn), p['slug']))
            paths.append(f'images/products/{sku}/{fn}')
        manifest[p['slug']] = {'sku': sku, 'images': paths}
    print(f'{len(jobs)} anh can tai')
    ok = fail = 0
    with cf.ThreadPoolExecutor(8) as ex:
        for i, (u, path, _) in enumerate(ex.map(lambda j: j, jobs)):
            pass  # placeholder; loop below does real work
    # thực tải tuần tự theo thread pool
    def work(j):
        u, path, _ = j
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return dl(u, path)
    with cf.ThreadPoolExecutor(8) as ex:
        for r in ex.map(work, jobs):
            ok += r; fail += not r
            if (ok + fail) % 200 == 0:
                print(f'progress {ok+fail}/{len(jobs)} ok={ok} fail={fail}')
    json.dump(manifest, open(MANIFEST, 'w'), ensure_ascii=False, indent=1)
    print(f'DONE ok={ok} fail={fail} -> {MANIFEST}')

if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
