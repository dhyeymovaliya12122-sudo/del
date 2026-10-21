import os
import zipfile
import sys

def create_docker_package():
    workspace_dir = os.path.abspath(os.getcwd())
    output_filename = os.path.join(workspace_dir, 'whatsapp-docker-bundle.zip')
    
    # Directories to exclude anywhere in tree
    EXCLUDE_DIRS = {
        'node_modules',
        'dist',
        '.git',
        '.vscode',
        'scratch',
        '__pycache__',
        '.system_generated',
        '.tempmediaStorage',
        '.user_uploaded',
        'browser'
    }
    
    # Specific relative paths to exclude (e.g. heavy personal media/backups)
    EXCLUDE_REL_PATHS = {
        os.path.normpath('data/media'),
        os.path.normpath('data/backups')
    }
    
    EXCLUDE_EXTS = {
        '.tsbuildinfo',
        '.log',
        '.bak',
        '.db-wal',
        '.db-shm'
    }
    
    print("Packing clean WhatsApp Docker codebase bundle...")
    print("Excluding: node_modules, dist, temp files, and heavy personal media/backups...")
    
    total_files = 0
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(workspace_dir):
            rel_root = os.path.relpath(root, workspace_dir)
            norm_rel_root = os.path.normpath(rel_root)
            
            # Prune directories
            dirs[:] = [
                d for d in dirs 
                if d not in EXCLUDE_DIRS 
                and not d.startswith('.')
                and os.path.normpath(os.path.join(rel_root, d)) not in EXCLUDE_REL_PATHS
            ]
            
            # If in data/media or data/backups, skip all contents
            if any(norm_rel_root.startswith(ex) for ex in EXCLUDE_REL_PATHS):
                continue
                
            for file in files:
                if file in ('whatsapp-docker-bundle.zip', '.DS_Store', 'Thumbs.db'):
                    continue
                _, ext = os.path.splitext(file)
                if ext.lower() in EXCLUDE_EXTS:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, workspace_dir)
                zipf.write(full_path, rel_path)
                total_files += 1

        # Ensure empty placeholder directories exist for data mounts
        for req_dir in ['data/media', 'data/sessions', 'data/backups']:
            keep_file = f"{req_dir}/.gitkeep"
            if keep_file not in zipf.namelist():
                zipf.writestr(keep_file, "")
                total_files += 1
                
    size_mb = os.path.getsize(output_filename) / (1024 * 1024)
    print(f"\n[SUCCESS] Generated: whatsapp-docker-bundle.zip")
    print(f"Total files included: {total_files}")
    print(f"Total bundle size: {size_mb:.2f} MB")
    print("\nThis clean zip file is ready to send to anyone via WhatsApp, Drive, WeTransfer, Telegram, or Email.")

if __name__ == '__main__':
    create_docker_package()

