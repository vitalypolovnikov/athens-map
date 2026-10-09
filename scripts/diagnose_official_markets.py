#!/usr/bin/env python3
import json,re,urllib.request,urllib.parse,datetime
from pathlib import Path
DAYS=['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή']
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'days':[]}
for day in DAYS:
 url='https://www.foreaslaikon.gov.gr/markets-map/?'+urllib.parse.urlencode({'county':'','cpage':1,'day':day,'view':'list','region':'','municipality':'','type':'','order_by':'place'})
 row={'day':day,'url':url}
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (AthensMarkets; public source audit)'})
  with urllib.request.urlopen(req,timeout=30) as r: doc=r.read(2000000).decode('utf8','replace');row['status']=r.status
  row['length']=len(doc)
  row['counts']=re.findall('Βρέθηκαν.{0,40}λαϊκές',doc)[:2]
  row['terms']={v:doc.count(v) for v in ['Περιοχή:','Οδός','Μόνιμη','latitude','longitude','google.maps','L.marker','wp-json','geojson']}
  row['script_sources']=[x[:160] for x in re.findall(r'<script[^>]+src=["\']([^"\']+)',doc,re.I) if any(y in x.lower() for y in ('map','market','leaflet'))][:20]
  row['coord_samples']=[doc[max(0,m.start()-70):m.start()+160] for m in list(re.finditer(r'(?:latitude|longitude|["\']lat["\']|["\']lng["\'])\s*[:=]',doc,re.I))[:3]]
  row['links']=[doc[max(0,m.start()-50):m.start()+110] for m in list(re.finditer(r'view=map|google\.maps|market-map',doc,re.I))[:4]]
 except Exception as exc:row['error']=str(exc)[:300]
 result['days'].append(row)
p=Path('data/official_source_diagnostic.json');p.parent.mkdir(parents=True,exist_ok=True)
p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print([(v['day'],v.get('status'),v.get('length'),v.get('error')) for v in result['days']])
