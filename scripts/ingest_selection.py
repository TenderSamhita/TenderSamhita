import pathlib, sys
sys.path.insert(0, r'D:\BIS\bis-engine')
import yaml
from src.ingestion.pipeline import process_single_pdf
from src.storage.database import init_db
from pathlib import Path

cfg = yaml.safe_load(open(r'D:\BIS\bis-engine\config\config.yaml', encoding='utf-8'))
selection = Path(r'D:\BIS\bis-engine\data\selection.txt').read_text().splitlines()
db_path = Path(r'D:\BIS\bis-engine\data\bis.db')
from src.storage.database import get_engine
from src.storage.models import Base
engine = get_engine(db_path)
try:
    Base.metadata.drop_all(engine)
except Exception as e:
    print(f"drop failed: {e}")
init_db(db_path)
json_dir = Path(r'D:\BIS\bis-engine\data\processed\json')
fig_dir = Path(r'D:\BIS\bis-engine\data\processed\figures')
json_dir.mkdir(parents=True, exist_ok=True)
fig_dir.mkdir(parents=True, exist_ok=True)
for f in json_dir.glob('*.json'):
    f.unlink()
for f in fig_dir.glob('*'):
    try:
        f.unlink()
    except:
        pass
print('DB cleaned, starting selection ingest', flush=True)
for i, p in enumerate(selection):
    path = pathlib.Path(p)
    print(f"[{i+1}/{len(selection)}] {path.name}", flush=True)
    res = process_single_pdf(path, json_out_dir=json_dir, figures_out_dir=fig_dir, config=cfg, use_db=True, db_path=db_path)
    figs = res.get('figures', [])
    conf = len([f for f in figs if f.get('is_confirmed')])
    print(f" -> {res.get('_status')} chunks={len(res.get('chunks',[]))} tables={len(res.get('tables',[]))} figs={conf}/{len(figs)}", flush=True)
print('Done selection ingest', flush=True)
