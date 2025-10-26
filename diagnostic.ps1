# ============================================
# Claude Desktop & SuperClaude Diagnostic
# ============================================

Write-Host "`n=== CLAUDE DESKTOP CONFIG ===" -ForegroundColor Cyan

# Check Claude Desktop config location
$claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
if (Test-Path $claudeConfigPath) {
    Write-Host "✓ Config found at: $claudeConfigPath" -ForegroundColor Green
    Write-Host "`nFile size: $((Get-Item $claudeConfigPath).Length) bytes"
    Write-Host "Last modified: $((Get-Item $claudeConfigPath).LastWriteTime)"
    
    # Check encoding
    $bytes = [System.IO.File]::ReadAllBytes($claudeConfigPath)
    Write-Host "First bytes (hex): $($bytes[0..10] | ForEach-Object { $_.ToString('X2') })"
    
    # Try to read content safely
    Write-Host "`n--- Config Content Preview ---" -ForegroundColor Yellow
    try {
        $content = Get-Content $claudeConfigPath -Raw -Encoding UTF8
        Write-Host $content.Substring(0, [Math]::Min(500, $content.Length))
    } catch {
        Write-Host "ERROR reading config: $_" -ForegroundColor Red
        Write-Host "Trying with default encoding..."
        try {
            $content = Get-Content $claudeConfigPath -Raw
            Write-Host $content.Substring(0, [Math]::Min(500, $content.Length))
        } catch {
            Write-Host "Still failed: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ Config not found at: $claudeConfigPath" -ForegroundColor Red
}

Write-Host "`n=== SUPERCLAUDE INSTALLATION ===" -ForegroundColor Cyan

# Check SuperClaude directory
$superClaudePath = "$env:USERPROFILE\.claude"
if (Test-Path $superClaudePath) {
    Write-Host "✓ SuperClaude directory: $superClaudePath" -ForegroundColor Green
    Write-Host "`nInstalled components:"
    Get-ChildItem $superClaudePath -Directory | ForEach-Object {
        Write-Host "  - $($_.Name) ($(Get-ChildItem $_.FullName -Recurse | Measure-Object).Count files)"
    }
    
    # Check metadata
    if (Test-Path "$superClaudePath\.superclaude\metadata.json") {
        Write-Host "`n--- SuperClaude Metadata ---" -ForegroundColor Yellow
        Get-Content "$superClaudePath\.superclaude\metadata.json" | ConvertFrom-Json | ConvertTo-Json -Depth 3
    }
} else {
    Write-Host "✗ SuperClaude directory not found" -ForegroundColor Red
}

Write-Host "`n=== MCP SERVERS ===" -ForegroundColor Cyan

# Check for Node.js MCP servers
$nodeModules = "$env:APPDATA\npm\node_modules"
if (Test-Path $nodeModules) {
    Write-Host "`nGlobal NPM packages (MCP servers):"
    Get-ChildItem $nodeModules -Directory | Where-Object {
        $_.Name -like "*mcp*" -or $_.Name -like "*claude*" -or 
        $_.Name -in @('playwright', 'sequential-thinking', 'context7', 'tavily', 'magic', 'serena')
    } | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Green
    }
}

# Check UV tool installations (Python MCP servers)
$uvToolsPath = "$env:LOCALAPPDATA\uv\tools"
if (Test-Path $uvToolsPath) {
    Write-Host "`nUV Tools (Python MCP servers):"
    Get-ChildItem $uvToolsPath -Directory | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`n=== PYTHON ENVIRONMENT ===" -ForegroundColor Cyan

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
    
    # Check for superclaude package
    Write-Host "`nChecking for SuperClaude package:"
    pip show superclaude 2>&1 | Write-Host
} catch {
    Write-Host "Python not found in PATH" -ForegroundColor Red
}

Write-Host "`n=== RUNNING PROCESSES ===" -ForegroundColor Cyan

# Check for Claude-related processes
Get-Process | Where-Object {
    $_.ProcessName -like "*claude*" -or 
    $_.ProcessName -like "*mcp*" -or
    $_.ProcessName -like "*node*"
} | Select-Object ProcessName, Id, Path | Format-Table -AutoSize

Write-Host "`n=== ENVIRONMENT VARIABLES ===" -ForegroundColor Cyan

# Check relevant environment variables
$env:PSModulePath, $env:Path -split ';' | Where-Object { 
    $_ -like "*claude*" -or $_ -like "*mcp*" 
} | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Yellow
}

Write-Host "`n=== SYSTEM INFO ===" -ForegroundColor Cyan
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "Culture: $([System.Globalization.CultureInfo]::CurrentCulture.Name)"
Write-Host "Default Encoding: $([System.Text.Encoding]::Default.EncodingName)"

Write-Host "`n=== DIAGNOSTIC COMPLETE ===" -ForegroundColor Cyan