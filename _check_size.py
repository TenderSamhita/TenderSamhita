import os, sys
sys.stdout.reconfigure(encoding='utf-8')

items = {
    "data/bis.db": "SQLite DB",
    "data/indexes/faiss.index": "FAISS index",
    "data/indexes/faiss_mapping.json": "FAISS mapping",
    "data/indexes/bm25.pkl": "BM25 index",
}

total = 0
for path, desc in items.items():
    if os.path.exists(path):
        size = os.path.getsize(path)
        total += size
        print(f"  {desc}: {size/1024/1024:.1f} MB")
    else:
        print(f"  {desc}: MISSING")

# Check processed/json
json_dir = "data/processed/json"
if os.path.exists(json_dir):
    json_size = sum(os.path.getsize(os.path.join(json_dir, f)) for f in os.listdir(json_dir))
    total += json_size
    print(f"  JSON files: {json_size/1024/1024:.1f} MB ({len(os.listdir(json_dir))} files)")

# Check figures
fig_dir = "data/processed/figures"
if os.path.exists(fig_dir):
    fig_size = sum(os.path.getsize(os.path.join(fig_dir, f)) for f in os.listdir(fig_dir))
    total += fig_size
    print(f"  Figures: {fig_size/1024/1024:.1f} MB ({len(os.listdir(fig_dir))} files)")

print(f"\nTotal: {total/1024/1024:.1f} MB")
