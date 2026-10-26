"""Read the original CSV independently. No application imports or generated goldens.
Input: JSON list of labelled metric/quality requests on stdin. Output: oracle + source audit.
"""
import calendar,collections,csv,datetime,hashlib,json,re,statistics,sys,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def clean(v):return ' '.join(unicodedata.normalize('NFKC',v or '').split())
ALIASES={'תל אביב':'תל אביב-יפו','תל אביב יפו':'תל אביב-יפו','ת"א':'תל אביב-יפו','ת״א':'תל אביב-יפו','Tel Aviv-Yafo':'תל אביב-יפו','Jerusalem':'ירושלים','באר-שבע':'באר שבע','ב"ש':'באר שבע','ב״ש':'באר שבע','בית-שמש':'בית שמש','מודיעין':'מודיעין מכבים רעות','מודיעין-מכבים-רעות':'מודיעין מכבים רעות'}
def city(v):return ALIASES.get(clean(v),clean(v))
def number(v):
 v=clean(v).removeprefix('₪').strip()
 return float(v.replace(',','')) if re.fullmatch(r'-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?',v) else None
def positive(v):
 n=number(v);return n if n is not None and n>0 else None
def boolean(v):
 v=clean(v).lower();return True if v in ('כן','true','yes','1') else False if v in ('לא','false','no','0') else None
def date(v):
 v=clean(v)
 for pattern in ('%Y-%m-%d','%d/%m/%Y','%d.%m.%Y'):
  try:return datetime.datetime.strptime(v,pattern).date().isoformat(),'day'
  except ValueError:pass
 if re.fullmatch(r'[A-Za-z]{3} \d{4}',v):
  try:return datetime.datetime.strptime(v,'%b %Y').strftime('%Y-%m'),'month'
  except ValueError:pass
 return None,'invalid'
def record(row,index):
 room=positive(row['rooms'])
 if room is None:
  match=re.fullmatch(r'(\d+(?:\.\d+)?) חדרים',clean(row['rooms']))
  if match:room=positive(match[1])
 dt,precision=date(row['deal_date'])
 return dict(id=clean(row['deal_id']),city=city(row['city']),neighborhood=clean(row['neighborhood']),street=clean(row['street']),propertyType=clean(row['property_type']),rooms=room,price=positive(row['price_nis']),area=positive(row['size_sqm']),reported=positive(row['price_per_sqm']),date=dt,precision=precision,floor=number(row['floor']),floors=number(row['total_floors']),year=number(row['year_built']),parking=boolean(row['has_parking']),elevator=boolean(row['has_elevator']),safeRoom=boolean(row['has_safe_room']),balcony=boolean(row['has_balcony']),condition=clean(row['condition']),row=index)
raw=list(csv.DictReader((ROOT/'data/deals.csv').open(encoding='utf-8-sig')))
assert raw==json.loads((ROOT/'data/deals.json').read_text()),'CSV and JSON differ; app source is not a lossless copy'
groups=collections.defaultdict(list)
for i,row in enumerate(raw,2):groups[clean(row['deal_id'])].append(record(row,i))
requests=json.load(sys.stdin);results=[]
for request in requests:
 filters=request.get('filters',{});as_of=request.get('asOf','2026-10-26');metric=request.get('metric','count')
 matched=[];eligible=[];excluded=[];flagged=[];partial=0
 for key,variants in sorted(groups.items()):
  item=variants[0];ratio=item['price']/item['area'] if item['price'] is not None and item['area'] is not None else None
  # Material normalized fields, not source attribution or source row number.
  conflict=any({k:v for k,v in item.items() if k!='row'}!={k:v for k,v in other.items() if k!='row'} for other in variants[1:])
  if any(filters.get(field) is not None and item[field]!=(city(filters[field]) if field=='city' else clean(filters[field]) if field=='neighborhood' else filters[field]) for field in ('city','neighborhood','propertyType','parking','elevator','safeRoom')):continue
  if filters.get('roomsMin') is not None and (item['rooms'] is None or item['rooms']<filters['roomsMin']):continue
  if filters.get('roomsMax') is not None and (item['rooms'] is None or item['rooms']>filters['roomsMax']):continue
  if filters.get('dateFrom') or filters.get('dateTo'):
   if not item['date']:continue
   start=end=item['date']
   if item['precision']=='month':
    year,month=map(int,item['date'].split('-'));start=f'{year:04d}-{month:02d}-01';end=f'{year:04d}-{month:02d}-{calendar.monthrange(year,month)[1]:02d}'
   if (filters.get('dateFrom') and start<filters['dateFrom']) or (filters.get('dateTo') and end>filters['dateTo']):
    if item['precision']=='month':partial+=1
    continue
  matched.append(key)
  future=bool(item['date'] and item['date']>(as_of[:7] if item['precision']=='month' else as_of))
  suspect=(item['area'] is not None and not 15<=item['area']<=1000) or (ratio is not None and not 2000<=ratio<=200000)
  mismatch=ratio is not None and item['reported'] is not None and abs(ratio-item['reported'])>max(1,ratio*.01)
  floor_bad=item['floor'] is not None and item['floors'] is not None and (item['floor']>item['floors'] or item['floor']< -3)
  year_bad=item['year'] is not None and not 1800<=item['year']<=int(as_of[:4])
  if len(variants)>1 or item['price'] is None or item['area'] is None or item['rooms'] is None or not item['date'] or item['precision']=='month' or not item['neighborhood'] or future or suspect or mismatch or floor_bad or year_bad:flagged.append(key)
  valid=metric=='count' or (not conflict and not future and not suspect and item['price'] is not None and (not metric.endswith('ppsm') or ratio is not None))
  if valid:eligible.append((key,ratio if metric.endswith('ppsm') else item['price']))
  else:excluded.append(key)
 values=[v for _,v in eligible]
 value=len(eligible) if metric=='count' else None if not values else statistics.mean(values) if metric.startswith('mean') else statistics.median(values)
 results.append(dict(id=request['id'],value=value,matchedCount=len(matched),includedCount=len(eligible),evidenceIds=[k for k,_ in eligible],excludedIds=excluded,matchedIds=matched,flaggedIds=flagged,excludedPartialDates=partial))
print(json.dumps(dict(sourceRows=len(raw),uniqueDeals=len(groups),csvSha256=hashlib.sha256((ROOT/'data/deals.csv').read_bytes()).hexdigest(),jsonMatchesCsv=True,results=results),ensure_ascii=False))
