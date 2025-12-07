# Firebase Deployment Script for Windows PowerShell
# This script handles Firebase CLI installation and deployment

Write-Host "🚀 Arabic Vocab Trainer - Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check if firebase CLI is available
$firebaseAvailable = $null
try {
    $firebaseAvailable = Get-Command firebase -ErrorAction Stop
} catch {
    $firebaseAvailable = $null
}

if (-not $firebaseAvailable) {
    Write-Host "📦 Firebase CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if npm is available
    $npmAvailable = $null
    try {
        $npmAvailable = Get-Command npm -ErrorAction Stop
    } catch {
        Write-Host "❌ Error: npm is not installed. Please install Node.js first." -ForegroundColor Red
        Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Installing firebase-tools globally..." -ForegroundColor Yellow
    npm install -g firebase-tools
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Installation failed. Please try manually: npm install -g firebase-tools" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Firebase CLI installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You may need to refresh your PATH or restart PowerShell." -ForegroundColor Yellow
    Write-Host "   Try closing and reopening PowerShell, or run:" -ForegroundColor Yellow
    Write-Host "   refreshenv" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Alternatively, use npx: npx firebase-tools login" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to refresh PATH in current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Check again after refreshing PATH
    $firebaseAvailable = $null
    try {
        $firebaseAvailable = Get-Command firebase -ErrorAction Stop
    } catch {
        Write-Host "⚠️  Firebase CLI installed but not in PATH. Using npx..." -ForegroundColor Yellow
        Write-Host ""
    }
}

# Use firebase directly if available, otherwise use npx
if ($firebaseAvailable) {
    Write-Host "✅ Firebase CLI found!" -ForegroundColor Green
    Write-Host ""
    
    # Check if logged in
    Write-Host "Checking Firebase login status..." -ForegroundColor Cyan
    firebase login:list
    
    Write-Host ""
    Write-Host "Ready to deploy!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Run one of these commands:" -ForegroundColor Cyan
    Write-Host "  firebase login          - Login to Firebase" -ForegroundColor White
    Write-Host "  firebase deploy         - Deploy your app" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Using npx (no installation needed)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run one of these commands:" -ForegroundColor Cyan
    Write-Host "  npx firebase-tools login          - Login to Firebase" -ForegroundColor White
    Write-Host "  npx firebase-tools deploy         - Deploy your app" -ForegroundColor White
    Write-Host ""
}
