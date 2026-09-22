import pathlib, sys
sys.path.insert(0, r'D:\BIS\bis-engine')
import yaml, hashlib
from src.ingestion.pipeline import process_single_pdf
from src.storage.database import get_session_factory
from pathlib import Path

cfg = yaml.safe_load(open(r'D:\BIS\bis-engine\config\config.yaml', encoding='utf-8'))
selection = Path(r'D:\BIS\bis-engine\data\selection.txt').read_text().splitlines()
db_path = Path(r'D:\BIS\bis-engine\data\bis.db')
factory = get_session_factory(db_path)
session = factory()
from src.storage.models import Document
existing = {r[0] for r in session.query(Document.hash).all() if r[0]}
session.close()
print(f"Existing hashes: {len(existing)}")
json_dir = Path(r'D:\BIS\bis-engine\data\processed\json')
fig_dir = Path(r'D:\BIS\bis-engine\data\processed\figures')

def hash_file(p):
    import hashlib
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for chunk in iter(lambda: f.read(1<<20), b''):
            h.update(chunk)
    return h.hexdigest()

remaining = []
for p in selection:
    pp = pathlib.Path(p)
    h = hash_file(pp)
    if h in existing:
        print(f"SKIP {pp.name}")
    else:
        remaining.append(pp)
print(f"Remaining: {len(remaining)}")
for i, path in enumerate(remaining):
    print(f"[{i+1}/{len(remaining)}] {path.name}", flush=True)
    res = process_single_pdf(path, json_out_dir=json_dir, figures_out_dir=fig_dir, config=cfg, use_db=True, db_path=db_path)
    figs = res.get('figures', [])
    conf = len([f for f in figs if f.get('is_confirmed')])
    print(f" -> {res.get('_status')} chunks={len(res.get('chunks',[]))} tables={len(res.get('tables',[]))} figs={conf}/{len(figs)}", flush=True)
print('Resume done')
