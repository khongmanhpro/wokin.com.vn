import json, re, html as H
from collections import Counter

prods = json.load(open('/Volumes/data AI/wokin.com.vn/data/products.json'))

def templ(name):
    s = H.unescape(name)
    s = re.sub(r'\(([^()]*)\)', '(SPEC)', s)
    s = re.sub(r'\b\d+(?:\.\d+)?\s*(?:V|A|W|CC|Ah|L|mL|ML|KG|T|PSI|HP|rpm|RPM|min)\b', '#UNIT', s)
    s = re.sub(r'\b\d+\s*(?:N\.m|Nm)\b', '#NM', s)
    s = re.sub(r'\d+(?:\.\d+)?(?:/|-)?\d*(?:"|\u2033)?', 'N', s)
    s = re.sub(r'N(PCS|PC)\b', 'N#', s)
    return s.strip()

cnt = Counter(templ(p['name']) for p in prods)
print('TOTAL:', len(prods), '| TEMPLATES:', len(cnt))
top = cnt.most_common(60)
cov = sum(c for _, c in top)
pct = cov * 100.0 / len(prods)
print('TOP-60 coverage: %d/%d = %.0f%%' % (cov, len(prods), pct))
for t, c in top:
    print(c, '\t', t)
