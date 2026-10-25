"""Independent CSV oracle. No application code imported. Explicit policy implementation."""
import csv,json,re,statistics,datetime,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
ALIASES={'תל אביב':'תל אביב-יפו','תל אביב יפו':'תל אביב-יפו','ת"א':'תל אביב-יפו','ת״א':'תל אביב-יפו','Tel Aviv-Yafo':'תל אביב-יפו','Jerusalem':'ירושלים','באר-שבע':'באר שבע','ב"ש':'באר שבע','בית-שמש':'בית שמש','מודיעין':'מודיעין מכבים רעות','מודיעין-מכבים-רעות':'מודיעין מכבים רעות'}
def clean(s):return ' '.join(s.split())
def num(s):
 s=clean(s).removeprefix('₪').strip()
 if not re.fullmatch(r'-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?',s):return None
 return float(s.replace(',',''))
def positive(s):
 n=num(s);return n if n is not None and n>0 else None
def city(s):s=clean(s);return ALIASES.get(s,s)
def date(s):
 for f in ['%Y-%m-%d','%d/%m/%Y','%d.%m.%Y','%b %Y']:
  try:return datetime.datetime.strptime(s,f).date()
  except ValueError:pass
 return None
with open(ROOT/'data/deals.csv',encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
groups={}
for r in rows:groups.setdefault(r['deal_id'],[]).append(r)
output=[]
for location in ['',*sorted({city(r['city']) for r in rows}),'אילת']:
 matched=[rs for rs in groups.values() if not location or city(rs[0]['city'])==location]
 for metric in ['count','median_price','median_ppsm']:
  values=[]
  for rs in matched:
   r=rs[0];p=positive(r['price_nis']);a=positive(r['size_sqm']);ratio=p/a if p is not None and a is not None else None
   conflict=len({(positive(x['price_nis']),positive(x['size_sqm'])) for x in rs})>1
   suspicious=(a is not None and (a<15 or a>1000)) or (ratio is not None and (ratio<2000 or ratio>200000))
   future=date(r['deal_date']) is not None and date(r['deal_date'])>datetime.date(2026,10,25)
   if metric=='count':values.append(1)
   elif not conflict and not suspicious and not future and p is not None:
    if metric=='median_price':values.append(p)
    elif ratio is not None:values.append(ratio)
  output.append({'city':location,'metric':metric,'value':len(values) if metric=='count' else statistics.median(values) if values else None,'includedCount':len(values)})
(ROOT/'evals/golden.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(f'{len(output)} independent numerical reference cases generated from CSV')
