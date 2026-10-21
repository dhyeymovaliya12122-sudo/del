import os
import sys
import json
import sqlite3
import subprocess

def run():
    report = {}
    
    # ── 1. Process Memory (RAM) Audit ──────────────────────────────────────────
    # Check running node processes via PowerShell Get-Process
    ps_cmd = 'Get-Process node | Select-Object Id, ProcessName, WorkingSet64, PrivateMemorySize64 | ConvertTo-Json'
    try:
        proc_output = subprocess.check_output(['powershell', '-Command', ps_cmd], text=True)
        procs = json.loads(proc_output)
        if isinstance(procs, dict):
            procs = [procs]
        
        proc_list = []
        total_ram_bytes = 0
        for p in procs:
            ws_mb = round(p.get('WorkingSet64', 0) / (1024 * 1024), 2)
            pm_mb = round(p.get('PrivateMemorySize64', 0) / (1024 * 1024), 2)
            total_ram_bytes += p.get('WorkingSet64', 0)
            proc_list.append({
                'pid': p.get('Id'),
                'working_set_ram_mb': ws_mb,
                'private_memory_mb': pm_mb
            })
        report['process_ram'] = {
            'running_node_processes': proc_list,
            'total_ram_mb': round(total_ram_bytes / (1024 * 1024), 2)
        }
    except Exception as e:
        report['process_ram'] = {'error': str(e)}

    # ── 2. Database Storage (ROM / Disk) Audit ──────────────────────────────────
    db_path = os.path.join(os.getcwd(), 'data', 'whatsapp.db')
    if os.path.exists(db_path):
        db_file_size = os.path.getsize(db_path)
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Get page size
        page_size = c.execute('PRAGMA page_size').fetchone()[0]
        page_count = c.execute('PRAGMA page_count').fetchone()[0]
        
        # Table stats
        tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
        
        tables_audit = {}
        for t in tables:
            try:
                count = c.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
                # Sample up to 200 rows for average row size
                rows = c.execute(f'SELECT * FROM "{t}" LIMIT 200').fetchall()
                sample_bytes = 0
                for row in rows:
                    for val in row:
                        if val is None:
                            continue
                        if isinstance(val, (bytes, bytearray)):
                            sample_bytes += len(val)
                        else:
                            sample_bytes += len(str(val).encode('utf-8'))
                
                avg_row_bytes = (sample_bytes / len(rows)) if rows else 0
                total_est_data_bytes = avg_row_bytes * count
                
                tables_audit[t] = {
                    'row_count': count,
                    'avg_row_bytes': round(avg_row_bytes, 1),
                    'total_est_kb': round(total_est_data_bytes / 1024, 2),
                }
            except Exception as ex:
                tables_audit[t] = {'error': str(ex)}
                
        # Specifically examine session_auth_store (Baileys credentials per account)
        auth_store_stats = {}
        try:
            auth_rows = c.execute("SELECT id, length(data) FROM session_auth_store").fetchall()
            total_auth_bytes = sum(r[1] for r in auth_rows if r[1] is not None)
            auth_count = len(auth_rows)
            auth_store_stats = {
                'total_keys_stored': auth_count,
                'total_auth_bytes': total_auth_bytes,
                'total_auth_kb': round(total_auth_bytes / 1024, 2),
                'avg_key_bytes': round(total_auth_bytes / auth_count, 1) if auth_count else 0
            }
        except Exception as e:
            auth_store_stats = {'error': str(e)}
            
        report['database_storage'] = {
            'db_file_path': db_path,
            'db_total_size_mb': round(db_file_size / (1024 * 1024), 2),
            'db_total_size_bytes': db_file_size,
            'sqlite_page_size_bytes': page_size,
            'sqlite_page_count': page_count,
            'tables': tables_audit,
            'session_auth_store_details': auth_store_stats
        }
        conn.close()
    else:
        report['database_storage'] = {'error': f'Database file not found at {db_path}'}
        
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    run()
