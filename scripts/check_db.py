import sqlite3
db = sqlite3.connect('D:/BIS/bis-engine/data/bis.db')
cursor = db.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print('Tables:', tables)
needed = ['workspaces', 'workspace_requirements', 'standard_relationships', 'traceability', 'specification_items', 'officer_actions']
for t in needed:
    if t not in tables:
        print(f'Missing table: {t}')
    else:
        print(f'Exists: {t}')
db.close()
