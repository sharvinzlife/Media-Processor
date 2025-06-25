# Media Processor - Windows Setup Script (PowerShell)
# This script sets up Media Processor on Windows using Chocolatey

param(
    [switch]$UseWSL,
    [switch]$NativeWindows
)

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Status($message) {
    Write-ColorOutput Blue "[INFO] $message"
}

function Write-Success($message) {
    Write-ColorOutput Green "[SUCCESS] $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[WARNING] $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[ERROR] $message"
}

Write-Host "🪟 Media Processor - Windows Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Determine installation method
if (-not $UseWSL -and -not $NativeWindows) {
    Write-Host "Choose installation method:" -ForegroundColor Yellow
    Write-Host "1. WSL2 (Ubuntu) - Recommended" -ForegroundColor Green
    Write-Host "2. Native Windows" -ForegroundColor Cyan
    Write-Host ""
    
    do {
        $choice = Read-Host "Enter choice (1 or 2)"
    } while ($choice -notin @("1", "2"))
    
    if ($choice -eq "1") {
        $UseWSL = $true
    } else {
        $NativeWindows = $true
    }
}

if ($UseWSL) {
    Write-Status "Setting up Media Processor using WSL2..."
    
    # Check if WSL is installed
    try {
        $wslStatus = wsl --status 2>$null
        Write-Success "WSL is already installed"
    }
    catch {
        Write-Status "Installing WSL2..."
        if (-not (Test-Administrator)) {
            Write-Error "Administrator privileges required for WSL installation!"
            Write-Host "Please run this script as Administrator or install WSL manually:" -ForegroundColor Red
            Write-Host "wsl --install -d Ubuntu" -ForegroundColor White
            exit 1
        }
        
        # Install WSL2
        wsl --install -d Ubuntu
        Write-Warning "WSL installation initiated. Please restart your computer and run this script again."
        Read-Host "Press Enter to continue after restart..."
        exit 0
    }
    
    # Check if Ubuntu is installed
    $ubuntuInstalled = wsl -l -v | Select-String "Ubuntu"
    if (-not $ubuntuInstalled) {
        Write-Status "Installing Ubuntu..."
        wsl --install -d Ubuntu
        Write-Warning "Please complete Ubuntu setup and then run this script again."
        exit 0
    }
    
    Write-Success "Ubuntu WSL is available"
    
    # Create setup script for WSL
    $wslSetupScript = @'
#!/bin/bash
echo "🐧 Setting up Media Processor in WSL2..."

# Update package list
sudo apt update

# Install dependencies
sudo apt install -y git nodejs npm python3 python3-pip python3-venv \
    ffmpeg mediainfo smbclient mkvtoolnix curl

# Clone repository if not already present
if [ ! -d "/mnt/c/Media-Processor" ]; then
    echo "Cloning repository..."
    git clone https://github.com/sharvinzlife/Media-Processor.git /mnt/c/Media-Processor
fi

cd /mnt/c/Media-Processor

# Make scripts executable
chmod +x bin/*.sh python_core/*.sh *.sh 2>/dev/null || true

# Setup Python environment
cd python_core
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "install_dependencies.sh" ]; then
    ./install_dependencies.sh
else
    pip install flask flask-cors requests pymediainfo pysmb tqdm
fi

cd ../web-app
npm install

cd ..

echo "✅ Setup complete!"
echo "📋 Next steps:"
echo "1. Edit configuration: nano lib/config.sh"
echo "2. Configure SMB settings"
echo "3. Run: cd python_core && source venv/bin/activate && python3 media_processor.py"
echo "4. In another terminal: cd web-app && npm start"
echo "5. Access web interface: http://localhost:3005"
'@
    
    # Save WSL setup script to temp file
    $wslSetupScript | Out-File -FilePath "$env:TEMP\wsl-setup.sh" -Encoding UTF8
    
    # Copy and execute setup script in WSL
    Write-Status "Executing setup in WSL..."
    wsl cp /mnt/c/Users/$env:USERNAME/AppData/Local/Temp/wsl-setup.sh /tmp/wsl-setup.sh
    wsl chmod +x /tmp/wsl-setup.sh
    wsl /tmp/wsl-setup.sh
    
    Write-Success "🎉 WSL setup complete!"
    Write-Host ""
    Write-Host "📋 To use Media Processor:" -ForegroundColor Yellow
    Write-Host "1. Open WSL: wsl" -ForegroundColor White
    Write-Host "2. Navigate to: cd /mnt/c/Media-Processor" -ForegroundColor White
    Write-Host "3. Edit config: nano lib/config.sh" -ForegroundColor White
    Write-Host "4. Start services as shown in the WSL terminal above" -ForegroundColor White
    
} elseif ($NativeWindows) {
    Write-Status "Setting up Media Processor natively on Windows..."
    
    if (-not (Test-Administrator)) {
        Write-Error "Administrator privileges required for native Windows installation!"
        Write-Host "Please run PowerShell as Administrator" -ForegroundColor Red
        exit 1
    }
    
    # Check if Chocolatey is installed
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Status "Installing Chocolatey..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        refreshenv
    } else {
        Write-Success "Chocolatey is already installed"
    }
    
    # Install dependencies
    Write-Status "Installing dependencies via Chocolatey..."
    $packages = @("git", "nodejs", "python", "ffmpeg", "mediainfo-cli", "mkvtoolnix")
    
    foreach ($package in $packages) {
        Write-Status "Installing $package..."
        choco install -y $package
    }
    
    # Refresh environment variables
    refreshenv
    
    # Verify installations
    Write-Status "Verifying installations..."
    
    function Test-Command($command) {
        try {
            $version = & $command --version 2>$null
            Write-Success "$command is installed"
            return $true
        }
        catch {
            Write-Error "$command is not available"
            return $false
        }
    }
    
    Test-Command "git"
    Test-Command "node"
    Test-Command "python"
    Test-Command "ffmpeg"
    
    # Clone repository if not present
    if (-not (Test-Path "C:\Media-Processor")) {
        Write-Status "Cloning repository..."
        Set-Location C:\
        git clone https://github.com/sharvinzlife/Media-Processor.git
    } else {
        Write-Success "Repository already exists"
    }
    
    Set-Location C:\Media-Processor
    
    # Setup Python virtual environment
    Write-Status "Setting up Python environment..."
    Set-Location python_core
    
    if (Test-Path "venv") {
        Write-Warning "Removing existing virtual environment..."
        Remove-Item -Recurse -Force venv
    }
    
    python -m venv venv
    & "venv\Scripts\activate.ps1"
    
    # Install Python dependencies
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    } else {
        pip install flask flask-cors requests pymediainfo pysmb tqdm
    }
    
    Set-Location ..\web-app
    
    # Install Node.js dependencies
    Write-Status "Installing Node.js dependencies..."
    npm install
    
    Set-Location ..
    
    # Install NSSM for Windows services
    Write-Status "Installing NSSM for Windows services..."
    choco install -y nssm
    
    # Create Windows services
    Write-Status "Creating Windows services..."
    
    $pythonPath = (Get-Command python).Source
    $nodePath = (Get-Command node).Source
    $currentPath = (Get-Location).Path
    
    # Create Python service
    nssm install MediaProcessorPy "$currentPath\python_core\venv\Scripts\python.exe" "$currentPath\python_core\media_processor.py"
    nssm set MediaProcessorPy AppDirectory "$currentPath"
    nssm set MediaProcessorPy Start SERVICE_AUTO_START
    nssm set MediaProcessorPy Description "Media Processor Python Service"
    
    # Create Web UI service
    nssm install MediaProcessorUI "$nodePath" "$currentPath\web-app\server.js"
    nssm set MediaProcessorUI AppDirectory "$currentPath\web-app"
    nssm set MediaProcessorUI AppEnvironmentExtra "PORT=3005"
    nssm set MediaProcessorUI Start SERVICE_AUTO_START
    nssm set MediaProcessorUI Description "Media Processor Web UI Service"
    
    # Start services
    Write-Status "Starting services..."
    nssm start MediaProcessorPy
    nssm start MediaProcessorUI
    
    Write-Success "🎉 Native Windows setup complete!"
    Write-Host ""
    Write-Host "📋 Service Management:" -ForegroundColor Yellow
    Write-Host "• Start: nssm start MediaProcessorPy && nssm start MediaProcessorUI" -ForegroundColor White
    Write-Host "• Stop: nssm stop MediaProcessorPy && nssm stop MediaProcessorUI" -ForegroundColor White
    Write-Host "• Status: nssm status MediaProcessorPy && nssm status MediaProcessorUI" -ForegroundColor White
    Write-Host "• Remove: nssm remove MediaProcessorPy confirm && nssm remove MediaProcessorUI confirm" -ForegroundColor White
    
    # Wait for services to start
    Start-Sleep -Seconds 5
    
    # Test web interface
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3005" -TimeoutSec 5 2>$null
        Write-Success "Web interface is accessible at http://localhost:3005"
        Start-Process "http://localhost:3005"
    }
    catch {
        Write-Warning "Web interface may not be ready yet. Please try accessing http://localhost:3005 in a few moments."
    }
}

Write-Host ""
Write-Host "📖 For detailed documentation, see INSTALLATION.md" -ForegroundColor Cyan
Write-Host "🔧 Remember to configure lib/config.sh with your SMB settings!" -ForegroundColor Yellow
Write-Host ""