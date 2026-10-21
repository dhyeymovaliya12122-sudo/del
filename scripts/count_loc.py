import os
from collections import defaultdict

EXCLUDE_DIRS = {
    'node_modules', 'dist', '.git', '.vscode', 'data', 'scratch', 
    '.gemini', '.system_generated', '__pycache__', '.next', 'build'
}

EXCLUDE_EXTS = {
    '.sqlite', '.db', '.png', '.jpg', '.jpeg', '.webp', '.gif', 
    '.mp4', '.mp3', '.ogg', '.pdf', '.docx', '.xlsx', '.bin', '.ico',
    '.tsbuildinfo', '.lock', '.svg'
}

EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
}

def analyze():
    stats_by_ext = defaultdict(lambda: {'files': 0, 'lines': 0, 'code': 0, 'blank': 0})
    stats_by_dir = defaultdict(lambda: {'files': 0, 'lines': 0, 'code': 0, 'blank': 0})
    
    # Detailed breakdown for core code vs docs
    core_code_extensions = {'.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.html', '.sql'}

    total_files = 0
    total_lines = 0
    total_blank = 0
    total_code = 0

    core_lines = 0
    core_code_lines = 0
    core_files = 0

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]

        for f in files:
            if f in EXCLUDE_FILES or f.endswith('.lock'):
                continue
            ext = os.path.splitext(f)[1].lower()
            if not ext or ext in EXCLUDE_EXTS:
                continue

            full_path = os.path.join(root, f)
            norm = os.path.normpath(full_path).replace('\\', '/')

            if norm.startswith('src/'):
                dir_cat = 'Backend (NestJS / TypeScript)'
            elif norm.startswith('frontend/src/'):
                dir_cat = 'Frontend (React / Vite)'
            elif norm.startswith('frontend/'):
                dir_cat = 'Frontend (Config & Assets)'
            elif norm.startswith('scripts/'):
                dir_cat = 'Scripts & Tooling (Python/JS)'
            elif norm.endswith('.md'):
                dir_cat = 'Documentation (.md)'
            else:
                dir_cat = 'Root & Configuration'

            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = fp.readlines()
                    line_count = len(lines)
                    blank_count = sum(1 for line in lines if not line.strip())
                    code_count = line_count - blank_count
            except Exception:
                continue

            total_files += 1
            total_lines += line_count
            total_blank += blank_count
            total_code += code_count

            if ext in core_code_extensions and not norm.endswith('.md'):
                core_files += 1
                core_lines += line_count
                core_code_lines += code_count

            stats_by_dir[dir_cat]['files'] += 1
            stats_by_dir[dir_cat]['lines'] += line_count
            stats_by_dir[dir_cat]['code'] += code_count
            stats_by_dir[dir_cat]['blank'] += blank_count

            stats_by_ext[ext]['files'] += 1
            stats_by_ext[ext]['lines'] += line_count
            stats_by_ext[ext]['code'] += code_count
            stats_by_ext[ext]['blank'] += blank_count

    print("=================================================================")
    print("                PROJECT CODEBASE LINE COUNTER                    ")
    print("=================================================================")
    print(f"Total Source Code (TS/TSX/JS/PY/CSS):  {core_lines:,} lines ({core_code_lines:,} non-blank) in {core_files} files")
    print(f"Grand Total (incl. Configs & Docs):    {total_lines:,} lines ({total_code:,} non-blank) in {total_files} files")
    print(f"Total Blank / Formatting Lines:        {total_blank:,} lines")
    print("=================================================================")

    print("\n--- BREAKDOWN BY SECTION ---")
    for d, s in sorted(stats_by_dir.items(), key=lambda x: x[1]['lines'], reverse=True):
        pct = (s['lines'] / total_lines * 100) if total_lines else 0
        print(f"• {d:<32}: {s['lines']:>7,} lines  ({s['code']:>7,} code, {s['files']:>3} files) [{pct:>5.1f}%]")

    print("\n--- BREAKDOWN BY FILE TYPE ---")
    for ext, s in sorted(stats_by_ext.items(), key=lambda x: x[1]['lines'], reverse=True):
        pct = (s['lines'] / total_lines * 100) if total_lines else 0
        print(f"• {ext:<10}: {s['lines']:>7,} lines  ({s['code']:>7,} code in {s['files']:>3} files) [{pct:>5.1f}%]")

if __name__ == '__main__':
    analyze()
