import subprocess
import re

out = subprocess.check_output('tasklist', shell=True, text=True)
for line in out.splitlines():
    if 'node' in line.lower() or 'python' in line.lower():
        print(line)
