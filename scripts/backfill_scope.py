"""Backfill scope and full_text from chunks in DB."""
import sqlite3, re, sys
sys.stdout.reconfigure(encoding='utf-8')

DB = "data/bis.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

# Get all standards
c.execute("SELECT standard_id, scope, full_text FROM standards")
stds = c.fetchall()
updated_scope = 0
updated_ft = 0

for std_id, existing_scope, existing_ft in stds:
    # Get all chunks ordered by page
    c.execute("SELECT page, section_title, text FROM chunks WHERE standard_id = ? ORDER BY page", (std_id,))
    chunks = c.fetchall()
    if not chunks:
        continue
    
    # Build full_text from chunks
    if not existing_ft or len(existing_ft) < 100:
        full_text = "\n\n".join(f"[p{ch[0]}] {ch[1] or ''}\n{ch[2]}" for ch in chunks)
        if len(full_text) > 100:
            c.execute("UPDATE standards SET full_text = ? WHERE standard_id = ?", (full_text[:50000], std_id))
            updated_ft += 1
    
    # Extract scope from chunks
    if not existing_scope or len(existing_scope) < 10:
        full_text = existing_ft or "\n\n".join(f"{ch[2]}" for ch in chunks)
        # Find "Scope" section text
        # Look for a chunk whose section_title contains "Scope"
        for ch in chunks:
            sec_title = (ch[1] or "").strip()
            if re.match(r"^(?:1\s*\.?\s*)?[Ss]cope$", sec_title):
                scope_text = ch[2]
                if scope_text and len(scope_text) > 10:
                    c.execute("UPDATE standards SET scope = ? WHERE standard_id = ?", (scope_text[:5000], std_id))
                    updated_scope += 1
                    break
        else:
            # Try regex on full text
            m = re.search(r"(?:^|\n)\s*(?:1\s*\.?\s*)?Scope\s*\n(.{20,500}?)(?:\n\s*\d+[\.\s]|\n\s*Normative|\n\s*References|\n\s*Terms)", full_text, re.I | re.S)
            if m:
                c.execute("UPDATE standards SET scope = ? WHERE standard_id = ?", (m.group(1).strip()[:5000], std_id))
                updated_scope += 1

conn.commit()
print(f"Updated scope: {updated_scope}, full_text: {updated_ft}")

c.execute("SELECT COUNT(*) FROM standards WHERE scope IS NOT NULL AND length(scope) > 10")
with_scope = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM standards")
total = c.fetchone()[0]
print(f"Standards with scope: {with_scope}/{total}")

# Show sample
c.execute("SELECT standard_id, substr(scope, 1, 150) FROM standards WHERE scope IS NOT NULL AND length(scope) > 10 LIMIT 3")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}")

conn.close()
