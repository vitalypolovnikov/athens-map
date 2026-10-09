#!/usr/bin/env python3
"""Build a source-only snapshot of the Attica regular-market official map.
Never geocode or infer missing coordinates. No writes outside the review branch.
"""
import datetime, json, re, urllib.parse, urllib.request
from pathlib import Path

BASE="https://www.foreaslaikon.gov.gr/markets-map/"
DAYS={"Δευτέρα":"Monday","Τρίτη":"Tuesday","Τετάρτη":"Wednesday","Πέμπτη":"Thursday","Παρασκευή":"Friday","Σάββατο":"Saturday"}
MONTHS={"Ιανουαρίου":1,"Φεβρουαρίου":2,"Μαρτίου":3,"Απριλίου":4,"Μαΐου":5,"Ιουνίου":6,"Ιουλίου":7,"Αυγούστου":8,"Σεπτεμβρίου":9,"Οκτωβρίου":10,"Νοεμβρίου":11,"Δεκεμβρίου":12}
Q=r'"((?:\\.|[^"\\])*)"'
NUM=r'(-?\d+(?:\.\d+)?)'
PAT=re.compile(r'addMarker\(\s*'+NUM+r'\s*,\s*'+NUM+r'\s*,\s*(\d+)\s*,\s*'+r'\s*,\s*'.join([Q]*7)+r'\s*\)',re.S)
def decode(s):
    try:return json.loads('"'+s+'"')
    except json.JSONDecodeError:return s.replace("\\'","'").replace('\\"','"')
def to_iso(s):
    if not s:return None
    m=re.search(r'(\d{1,2})\s+([\wΆ-ώ]+)\s+(20\d\d)',s)
    if not m or m.group(2) not in MONTHS:raise ValueError('Unrecognized official Greek date: '+repr(s))
    return datetime.date(int(m.group(3)),MONTHS[m.group(2)],int(m.group(1))).isoformat()
all_rows=[]
days=[]
for gr,en in DAYS.items():
    url=BASE+'?'+urllib.parse.urlencode({'county':'','cpage':1,'day':gr,'view':'map','municipality':'','region':'','type':''})
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (AthensMap open-source source-verification)'})
    with urllib.request.urlopen(req,timeout=50) as response:
        assert response.status==200
        html=response.read(3000000).decode('utf8','replace')
    matches=list(PAT.finditer(html))
    listed=re.search(r'Βρέθηκαν\s+(\d+)\s+λαϊκές',html)
    declared=int(listed.group(1)) if listed else None
    if not (20<=len(matches)<=80):raise ValueError('Unexpected count '+en+': '+str(len(matches))+'; listed='+str(declared))
    if declared is not None and abs(declared-len(matches))>2:raise ValueError('List/map divergence '+en+': '+str(declared)+'/'+str(len(matches)))
    unique=set()
    for match in matches:
        longitude=float(match.group(1));latitude=float(match.group(2))
        id_number=int(match.group(3))
        type_name,day,area,street,start_raw,end_raw,thumb=map(decode,match.groups()[3:])
        if not (36.5<latitude<39 and 22<longitude<26):raise ValueError('Coordinate outside Attica: '+str((longitude,latitude,id_number)))
        if day!=gr:raise ValueError('Wrong day for market '+str(id_number)+': '+str(day))
        if not street.strip():raise ValueError('Empty street for id '+str(id_number))
        start=to_iso(start_raw);end=to_iso(end_raw)
        if start and end and end<start:raise ValueError('Invalid period for '+str(id_number))
        row={'id':id_number,'weekday':en,'area':area.strip(),'street':street.strip(),'type':type_name,
             'lat':latitude,'lon':longitude,'start':start,'end':end,
             'source':'https://www.foreaslaikon.gov.gr/index.php/my-market?id='+str(id_number)}
        if id_number in unique:raise ValueError('Duplicate id within day: '+str(id_number))
        unique.add(id_number);all_rows.append(row)
    days.append({'weekday':en,'source_url':url,'map_markers':len(matches),'displayed_count':declared})
if len(all_rows)<225:raise ValueError('Too few official markers: '+str(len(all_rows)))
snapshot={'source':'Official Attica regular-market operator — maptilersdk addMarker entries','retrieved_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'selling_hours':'07:30–15:30 (general, exceptions possible)','days':days,'markets':all_rows}
path=Path('data/attica_regular_markets_official.json');path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(json.dumps({'status':'ok','total':len(all_rows),'days':days},ensure_ascii=False))
