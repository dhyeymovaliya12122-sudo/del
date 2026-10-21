# ─────────────────────────────────────────────────────────────────────────────
#  scripts/prepare_deploy.ps1
#  Packages clean frontend static build and backend Docker production files
#  Target: workspace/whatsapp deploy
# ─────────────────────────────────────────────────────────────────────────────

$source = "c:\Users\dhyey\OneDrive\Desktop\whatsapp - Copy"
$dest = "$source\whatsapp deploy"

Write-Host "Creating clean deployment directories..."
if (Test-Path "$dest") {
    Remove-Item -Path "$dest" -Recurse -Force
}
New-Item -ItemType Directory -Path "$dest" -Force | Out-Null
New-Item -ItemType Directory -Path "$dest\frontend" -Force | Out-Null
New-Item -ItemType Directory -Path "$dest\frontend-static" -Force | Out-Null

Write-Host "Copying backend src..."
robocopy "$source\src" "$dest\src" /E /NFL /NDL /NJH /NJS

Write-Host "Copying backend infra..."
robocopy "$source\infra" "$dest\infra" /E /NFL /NDL /NJH /NJS

Write-Host "Copying frontend dist for static site hosting (cPanel / S3 / Netlify)..."
robocopy "$source\frontend\dist" "$dest\frontend-static" /E /NFL /NDL /NJH /NJS
robocopy "$source\frontend\dist" "$dest\frontend\dist" /E /NFL /NDL /NJH /NJS

Write-Host "Copying configuration files..."
Copy-Item "$source\package.json" "$dest\package.json" -Force
Copy-Item "$source\package-lock.json" "$dest\package-lock.json" -Force
Copy-Item "$source\tsconfig.json" "$dest\tsconfig.json" -Force
Copy-Item "$source\nest-cli.json" "$dest\nest-cli.json" -Force
Copy-Item "$source\Dockerfile" "$dest\Dockerfile" -Force
Copy-Item "$source\docker-compose.yml" "$dest\docker-compose.yml" -Force
Copy-Item "$source\.env.example" "$dest\.env.example" -Force
Copy-Item "$source\.dockerignore" "$dest\.dockerignore" -Force

Copy-Item "$source\frontend\Dockerfile.frontend" "$dest\frontend\Dockerfile.frontend" -Force
Copy-Item "$source\frontend\nginx.conf" "$dest\frontend\nginx.conf" -Force
Copy-Item "$source\frontend\.dockerignore" "$dest\frontend\.dockerignore" -Force

Write-Host "DEPLOY_PACKAGE_CREATED_SUCCESSFULLY"
