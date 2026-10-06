$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$managePy = Join-Path $backendPath "manage.py"
$frontendPackageJson = Join-Path $frontendPath "package.json"
$frontendNodeModules = Join-Path $frontendPath "node_modules"

if (-not (Test-Path $managePy)) {
    throw "Backend Django introuvable : $managePy"
}

if (-not (Test-Path $frontendPackageJson)) {
    throw "Frontend introuvable : $frontendPackageJson"
}

if (-not (Test-Path $frontendNodeModules)) {
    throw "Dependances frontend absentes. Executez 'npm install' dans le dossier frontend."
}

$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonPath = $venvPython
}
else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python introuvable. Creez .venv ou installez Python et ajoutez-le au PATH."
    }
    $pythonPath = $pythonCommand.Source
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npmPath = if ($npmCommand) { $npmCommand.Source } else {
    Join-Path $env:ProgramFiles "nodejs\npm.cmd"
}
if (-not (Test-Path $npmPath)) {
    throw "npm introuvable. Installez Node.js et ajoutez-le au PATH."
}

$env:Path = "$(Split-Path -Parent $npmPath);$env:Path"

Write-Host "Application des migrations Django..."
Push-Location $backendPath
try {
    & $pythonPath manage.py migrate
    if ($LASTEXITCODE -ne 0) {
        throw "Les migrations Django ont echoue (code $LASTEXITCODE)."
    }
}
finally {
    Pop-Location
}

Write-Host "Demarrage du backend sur http://127.0.0.1:8000 ..."
Start-Process -FilePath $pythonPath -ArgumentList @("manage.py", "runserver") -WorkingDirectory $backendPath

Write-Host "Demarrage du frontend sur http://localhost:5173 ..."
$frontendCommand = '"{0}" run dev' -f $npmPath
Start-Process -FilePath $env:ComSpec -ArgumentList @("/k", $frontendCommand) -WorkingDirectory $frontendPath

Write-Host "Backend et frontend demarres dans des fenetres distinctes."
