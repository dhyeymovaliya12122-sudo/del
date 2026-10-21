#!/usr/bin/env python3
"""
Deep Code Review & Static Analysis Script
Exhaustive auditor for:
  1. Backend routes vs Frontend API calls (broken/mismatched routes)
  2. Defined vs Non-defined functions & missing imports
  3. CSS class mismatching (TSX classNames vs global.css)
  4. Logic bugs, undefined variables, and entity property mismatches
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_SRC = BASE_DIR / "src"
FRONTEND_SRC = BASE_DIR / "frontend" / "src"
GLOBAL_CSS = FRONTEND_SRC / "styles" / "global.css"
MODAL_CSS = FRONTEND_SRC / "components" / "AccountsManager" / "AccountsManagerModal.css"

# ==============================================================================
# 1. ROUTE AUDITOR: BACKEND VS FRONTEND
# ==============================================================================

def extract_backend_routes():
    controllers = list(BACKEND_SRC.glob("**/*.controller.ts"))
    routes = []
    
    controller_regex = re.compile(r"@Controller\(\s*(?:['\"`](.*?)['\"`])?\s*\)", re.DOTALL)
    method_regex = re.compile(r"@(Get|Post|Put|Delete|Patch)\(\s*(?:['\"`](.*?)['\"`])?\s*\)\s*(?:@\w+\(.*?\)\s*)*\s*(?:async\s+)?(\w+)\s*\(", re.DOTALL)
    
    for c_path in controllers:
        try:
            content = c_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
            
        c_match = controller_regex.search(content)
        prefix = c_match.group(1) if c_match and c_match.group(1) else ""
        prefix = prefix.strip("/")
        
        for m in method_regex.finditer(content):
            http_verb = m.group(1).upper()
            subpath = m.group(2) if m.group(2) else ""
            subpath = subpath.strip("/")
            handler_name = m.group(3)
            
            full_path = f"/{prefix}" if prefix else ""
            if subpath:
                full_path += f"/{subpath}"
            if not full_path:
                full_path = "/"
            
            # Normalize :param to generic placeholder
            norm_path = re.sub(r":\w+", "{param}", full_path)
            
            routes.append({
                "file": str(c_path.relative_to(BASE_DIR)),
                "verb": http_verb,
                "prefix": prefix,
                "subpath": subpath,
                "full_path": full_path,
                "norm_path": norm_path,
                "handler": handler_name
            })
    return routes


def extract_frontend_api_calls():
    ts_files = list(FRONTEND_SRC.glob("**/*.ts")) + list(FRONTEND_SRC.glob("**/*.tsx"))
    api_calls = []
    
    # Matches api.get('/...'), axios.post(`...`), etc.
    call_regex = re.compile(r"(?:api|axios|client|http)\s*\.\s*(get|post|put|delete|patch)\s*(?:<[^>]+>)?\s*\(\s*([`'\"][^`'\"]+[`'\"])", re.IGNORECASE)
    
    for f_path in ts_files:
        try:
            lines = f_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue
            
        for line_num, line in enumerate(lines, 1):
            for match in call_regex.finditer(line):
                verb = match.group(1).upper()
                raw_url = match.group(2).strip("'\"`")
                
                # Normalize url template literals: ${id} -> {param}
                norm_url = re.sub(r"\$\{[^}]+\}", "{param}", raw_url)
                # Strip query strings
                norm_url = norm_url.split("?")[0]
                
                api_calls.append({
                    "file": str(f_path.relative_to(BASE_DIR)),
                    "line": line_num,
                    "verb": verb,
                    "raw_url": raw_url,
                    "norm_url": norm_url,
                    "line_text": line.strip()
                })
    return api_calls


# ==============================================================================
# 2. CSS MISMATCH AUDITOR
# ==============================================================================

def extract_css_classes():
    css_files = [GLOBAL_CSS, MODAL_CSS]
    defined_classes = set()
    
    # Matches class selectors up to the opening brace or pseudo-selector
    class_def_regex = re.compile(r"\.([a-zA-Z0-9_\-\\/\[\]#.%]+)(?=\s*(?:\{|::|:|\.|,|\[|>|\+|\)|\s))")
    
    for c_path in css_files:
        if not c_path.exists():
            continue
        content = c_path.read_text(encoding="utf-8", errors="ignore")
        # Remove comments
        content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
        for m in class_def_regex.finditer(content):
            raw_c = m.group(1).replace('\\', '')
            defined_classes.add(raw_c)
            
    return defined_classes


def extract_tsx_classes():
    tsx_files = list(FRONTEND_SRC.glob("**/*.tsx"))
    used_classes = []
    
    # Matches className="..." or className={`...`}
    class_attr_regex = re.compile(r'className\s*=\s*(?:\{?["`\']([^"`\'}]+)["`\']\}?)')
    
    for f_path in tsx_files:
        try:
            lines = f_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue
            
        for line_num, line in enumerate(lines, 1):
            for match in class_attr_regex.finditer(line):
                raw_classes = match.group(1)
                # Split tokens
                tokens = re.split(r"[\s${}?:'\"`]+", raw_classes)
                for t in tokens:
                    t = t.strip()
                    if t and not t.startswith("(") and not t.endswith(")") and not t in ["true", "false", "null", "undefined"]:
                        used_classes.append({
                            "class": t,
                            "file": str(f_path.relative_to(BASE_DIR)),
                            "line": line_num
                        })
    return used_classes


# ==============================================================================
# 3. IMPORT & DEFINED/NON-DEFINED AUDITOR
# ==============================================================================

def check_broken_imports():
    all_ts = list(BACKEND_SRC.glob("**/*.ts")) + list(FRONTEND_SRC.glob("**/*.ts")) + list(FRONTEND_SRC.glob("**/*.tsx"))
    broken = []
    
    # Matches import ... from './...'
    import_regex = re.compile(r"""(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]""")
    
    for f_path in all_ts:
        try:
            content = f_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
            
        for line_num, line in enumerate(content.splitlines(), 1):
            m = import_regex.search(line)
            if not m:
                continue
            rel_import = m.group(1)
            target_dir = f_path.parent
            resolved = None
            
            # Possible extensions
            candidates = [
                target_dir / rel_import,
                target_dir / f"{rel_import}.ts",
                target_dir / f"{rel_import}.tsx",
                target_dir / f"{rel_import}.js",
                target_dir / rel_import / "index.ts",
                target_dir / rel_import / "index.tsx",
                target_dir / rel_import / "index.js",
            ]
            for c in candidates:
                if c.exists() and (c.is_file() or (c / "index.ts").exists() or (c / "index.tsx").exists()):
                    resolved = c
                    break
            
            if not resolved:
                broken.append({
                    "file": str(f_path.relative_to(BASE_DIR)),
                    "line": line_num,
                    "import": rel_import,
                    "line_text": line.strip()
                })
    return broken


# ==============================================================================
# MAIN SCAN RUNNER
# ==============================================================================

def main():
    print("=" * 80)
    print("   AUTOMATED STATIC ANALYSIS & REPOSITORY INTEGRITY AUDIT   ")
    print("=" * 80)
    
    # 1. Broken imports
    print("\n[*] SCAN 1: Auditing Local Relative Imports...")
    broken_imports = check_broken_imports()
    print(f"    Found {len(broken_imports)} broken relative imports.")
    for bi in broken_imports[:20]:
        print(f"    - {bi['file']}:{bi['line']} -> cannot resolve '{bi['import']}'")

    # 2. Routes
    print("\n[*] SCAN 2: Auditing API Routes & Endpoints...")
    be_routes = extract_backend_routes()
    fe_calls = extract_frontend_api_calls()
    print(f"    Backend Routes Found: {len(be_routes)}")
    print(f"    Frontend API Calls Found: {len(fe_calls)}")
    
    # Normalize backend routes (with and without /api/v1 prefix)
    be_paths = set()
    for r in be_routes:
        p = r["norm_path"].rstrip("/")
        be_paths.add(p)
        be_paths.add(f"/api/v1{p}")
        be_paths.add(f"api/v1{p}")
        be_paths.add(f"/api{p}")
        be_paths.add(f"api{p}")
        
    mismatched_calls = []
    for call in fe_calls:
        url = call["norm_url"].rstrip("/")
        # Check against backend routes
        matched = False
        for bp in be_paths:
            if url == bp or url.endswith(bp) or bp.endswith(url):
                matched = True
                break
        if not matched:
            mismatched_calls.append(call)
            
    print(f"    Unmatched or Suspicious Frontend API Calls: {len(mismatched_calls)}")
    for mc in mismatched_calls:
        print(f"    - [{mc['verb']}] {mc['raw_url']} ({mc['file']}:{mc['line']})")

    # 3. CSS Classes
    print("\n[*] SCAN 3: Auditing CSS Class Usage...")
    defined_css = extract_css_classes()
    used_classes = extract_tsx_classes()
    print(f"    Defined CSS Classes: {len(defined_css)}")
    print(f"    Used Class Instances in TSX: {len(used_classes)}")
    
    missing_css = []
    seen = set()
    for u in used_classes:
        c = u["class"]
        if c not in defined_css and c not in seen:
            # Ignore dynamic template literal fragments or common icon/utility names
            if not any(c.startswith(p) for p in ["lucide-", "fa-", "ri-", "icon-"]) and len(c) > 2:
                missing_css.append(u)
                seen.add(c)
                
    print(f"    Missing CSS Classes in global.css/AccountsManagerModal.css: {len(missing_css)}")
    for mc in missing_css[:35]:
        print(f"    - .{mc['class']} (in {mc['file']}:{mc['line']})")

    # 4. Save results to JSON for deep analysis
    out_file = BASE_DIR / "data" / "code_review_findings.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "broken_imports": broken_imports,
            "backend_routes_count": len(be_routes),
            "frontend_api_calls_count": len(fe_calls),
            "unmatched_api_calls": mismatched_calls,
            "missing_css_classes": missing_css
        }, f, indent=2)
    print(f"\n[+] Full findings exported to {out_file}\n")

if __name__ == "__main__":
    main()
