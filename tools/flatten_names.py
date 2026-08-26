import json
prods = json.load(open('/Volumes/data AI/wokin.com.vn/data/products.json'))
# xuất tên dạng "idx|sku|name" dễ đọc để dịch tay theo lô
lines = []
for i, p in enumerate(prods):
    import html as H
    lines.append(f"{i}|{p['sku']}|{H.unescape(p['name'])}")
open('/Volumes/data AI/wokin.com.vn/data/names_flat.txt', 'w').write('\n'.join(lines))
print('written', len(lines))
