#!/bin/bash

##############################################################################
# Water Level Acquisition System (WLAS) Installation Script
# For Raspberry Pi Zero 2 / 3
##############################################################################

set -euo pipefail

##############################################################################
# CONFIGURATION
##############################################################################

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_USER="${SUDO_USER:-$(whoami)}"

##############################################################################
# COLORS & FORMATTING
##############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_section() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}${1}${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

##############################################################################
# UTILITY FUNCTIONS
##############################################################################

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run with sudo"
        exit 1
    fi
}

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check OS
    if ! grep -qi "raspberry\|debian\|ubuntu" /etc/os-release; then
        log_error "This script is designed for Raspberry Pi OS (Debian-based)"
        exit 1
    fi
    # log_success "Compatible OS detected"

    # Check disk space (at least 2GB)
    available_space=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then
        log_error "Insufficient disk space (need 2GB, have $(( available_space / 1048576 ))GB)"
        exit 1
    fi
    # log_success "Sufficient disk space available"

     # Check .env or .env.template file
    if [ ! -f "$PROJECT_DIR/.env" ] && [ ! -f "$PROJECT_DIR/.env.template" ]; then
        log_error "Neither .env nor .env.template found in $PROJECT_DIR"
        log_info "Please ensure at least .env.template exists"
        exit 1
    fi
#        log_success ".env file found"
}

load_env() {
    log_section "Loading Environment Variables"

    set -a
    source "$PROJECT_DIR/.env"
    set +a

    log_success "Environment variables loaded"
}

setup_logging() {
    mkdir -p "$LOG_DIR"
    exec 1> >(tee -a "$LOG_DIR/install.log")
    exec 2> >(tee -a "$LOG_DIR/install.log" >&2)
    log_info "Installation logs: $LOG_DIR/install.log"
}

##############################################################################
# INSTALLATION MODULES (PLACEHOLDER)
##############################################################################

install_dependencies() {
    log_section "Installing System Dependencies"

    # Update package lists
    log_info "Updating package lists..."
    apt-get update -qq

    # Install Bun
    if [ ! -f "/home/$INSTALL_USER/.bun/bin/bun" ]; then
        log_info "Installing Bun..."
        sudo -u "$INSTALL_USER" bash -c 'curl -fsSL https://bun.com/install | bash'
        log_success "Bun installed"
    else
        log_success "Bun already installed: $(sudo -u "$INSTALL_USER" ~/.bun/bin/bun --version)"
    fi

    # Fix Bun permissions
    chmod +x "/home/$INSTALL_USER/.bun/bin/bun" 2>/dev/null || true
    chown -R "$INSTALL_USER:$INSTALL_USER" "/home/$INSTALL_USER/.bun" 2>/dev/null || true

    # Install UV
    if [ ! -f "/home/$INSTALL_USER/.local/bin/uv" ]; then
        log_info "Installing UV..."
        sudo -u "$INSTALL_USER" bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'
        log_success "UV installed"
    else
        log_success "UV already installed: $(sudo -u "$INSTALL_USER" ~/.local/bin/uv --version)"
    fi

    # Fix UV permissions
    chmod +x "/home/$INSTALL_USER/.local/bin/uv" 2>/dev/null || true
    chown -R "$INSTALL_USER:$INSTALL_USER" "/home/$INSTALL_USER/.local" 2>/dev/null || true

    # Install SQLite3
    if ! command -v sqlite3 &> /dev/null; then
        log_info "Installing SQLite3..."
        apt-get install -y sqlite3
        log_success "SQLite3 installed: $(sqlite3 --version | head -1)"
    else
        log_success "SQLite3 already installed: $(sqlite3 --version | head -1)"
    fi

    # Install Python3
    if ! command -v python3 &> /dev/null; then
        log_info "Installing Python3..."
        apt-get install -y python3
        log_success "Python3 installed: $(python3 --version)"
    else
        log_success "Python3 already installed: $(python3 --version)"
    fi

    # Install pigpio
    if ! command -v pigpiod &> /dev/null; then
        log_info "Building and installing pigpio..."

        apt-get install -y python3-setuptools build-essential wget unzip

        cd /tmp
        rm -rf pigpio-master master.zip

        wget -q https://github.com/joan2937/pigpio/archive/master.zip
        unzip -q master.zip
        cd pigpio-master

        make
        sudo make install

        log_success "pigpio installed"
    else
        log_success "pigpio already installed"
    fi

    log_success "All system dependencies installed"
}

setup_env_file() {
    log_section "Environment File Configuration"

    local env_template="$PROJECT_DIR/.env.template"
    local env_file="$PROJECT_DIR/.env"

    # Check if .env.template exists
    if [ ! -f "$env_template" ]; then
        log_error ".env.template not found at $env_template"
        exit 1
    fi
#    log_success ".env.template found"

    # If .env doesn't exist, copy from template
    if [ ! -f "$env_file" ]; then
        log_info "Creating .env from template..."
        cp "$env_template" "$env_file"
    fi

    echo ""
    log_info "Configuring environment variables..."
    echo ""

    # Variables from template (use as-is)
    local DEBUG
    local SAMPLE_INTERVAL
    local AUTO_CLEANUP_ENABLED
    local HOST
    DEBUG=$(grep "^DEBUG=" "$env_template" | cut -d '=' -f2)
    SAMPLE_INTERVAL=$(grep "^SAMPLE_INTERVAL=" "$env_template" | cut -d '=' -f2)
    AUTO_CLEANUP_ENABLED=$(grep "^AUTO_CLEANUP_ENABLED=" "$env_template" | cut -d '=' -f2)
    HOST=$(grep "^HOST=" "$env_template" | cut -d '=' -f2)

    # Variables with defaults (use current .env value as default)
    local current_db_path
    local current_log_dir
    local current_retention
    local current_db_file
    local current_table
    local current_log_file
    local current_max_clients
    current_db_path=$(grep "^DB_PATH=" "$env_file" | cut -d '=' -f2 || echo "/var/lib/wlas/")
    current_log_dir=$(grep "^LOG_DIR=" "$env_file" | cut -d '=' -f2 || echo "/var/log/wlas/")
    current_retention=$(grep "^DATA_RETENTION_DAYS=" "$env_file" | cut -d '=' -f2 || echo "30")
    current_db_file=$(grep "^DB_FILE=" "$env_file" | cut -d '=' -f2 || echo "samples.sqlite")
    current_table=$(grep "^SAMPLE_TABLE=" "$env_file" | cut -d '=' -f2 || echo "sensor_samples")
    current_log_file=$(grep "^LOG_FILE=" "$env_file" | cut -d '=' -f2 || echo "sampler.log")
    current_max_clients=$(grep "^MAX_SSE_CLIENTS=" "$env_file" | cut -d '=' -f2 || echo "60")

    # Ask user for customizable variables
    echo -e "${BLUE}Optional Configuration (press Enter to use defaults):${NC}"
    echo ""

    read -rp "Database path (default: $current_db_path): " db_path
    DB_PATH="${db_path:-$current_db_path}"

    read -rp "Log directory (default: $current_log_dir): " log_dir
    LOG_DIR="${log_dir:-$current_log_dir}"

    read -rp "Data retention days (default: $current_retention): " retention_days
    DATA_RETENTION_DAYS="${retention_days:-$current_retention}"

    read -rp "Database file (default: $current_db_file): " db_file
    DB_FILE="${db_file:-$current_db_file}"

    read -rp "Sample table name (default: $current_table): " sample_table
    SAMPLE_TABLE="${sample_table:-$current_table}"

    read -rp "Log file name (default: $current_log_file): " log_file
    LOG_FILE="${log_file:-$current_log_file}"

    read -rp "Maximum Concurrent clients (default: $current_max_clients): " log_file
    MAX_SSE_CLIENTS="${log_file:-$current_max_clients}"

    echo ""
    echo -e "${BLUE}Required Configuration:${NC}"
    echo ""

    # Ask for SERVER_PORT
    read -rp "Server port (default: 3000): " server_port
    SERVER_PORT="${server_port:-3000}"

    # Ask for IP and create VITE_API_URL
    read -rp "Server IP address (e.g., 10.3.141.1): " server_ip
    SERVER_IP="${server_ip:-10.3.141.1}"
    VITE_API_URL="http://${SERVER_IP}:${SERVER_PORT}"

    # ROOT_PATH is automatically set
    ROOT_PATH="$PROJECT_DIR"

    # Create/update .env file
    log_info "Writing configuration to .env..."
    cat > "$env_file" << EOF
# Sensor Data Acquisition System Configuration
#
# =============================================================================
# PATHS
# =============================================================================
# Project root directory
ROOT_PATH=$ROOT_PATH
# Database location
DB_PATH=$DB_PATH
# Log directory
LOG_DIR=$LOG_DIR

# =============================================================================
# SAMPLER CONFIGURATION (Python)
# =============================================================================
# Sample interval in seconds (minimum 0.5)
SAMPLE_INTERVAL=$SAMPLE_INTERVAL

# Enable debug output
DEBUG=$DEBUG

# =============================================================================
# DATA RETENTION
# =============================================================================
# Days to keep data before cleanup
DATA_RETENTION_DAYS=$DATA_RETENTION_DAYS

# Enable automatic cleanup
AUTO_CLEANUP_ENABLED=$AUTO_CLEANUP_ENABLED

# =============================================================================
# DATABASE
# =============================================================================
DB_FILE=$DB_FILE
SAMPLE_TABLE=$SAMPLE_TABLE

# =============================================================================
# LOG
# =============================================================================
LOG_FILE=$LOG_FILE

# =============================================================================
# WEB SERVER
# =============================================================================
# Server port
SERVER_PORT=$SERVER_PORT

# Server host (0.0.0.0 for external access, 127.0.0.1 for local only)
HOST=$HOST

# Connection Limits
MAX_SSE_CLIENTS=$MAX_SSE_CLIENTS

# =============================================================================
# FRONTEND
# =============================================================================
# Frontend url
VITE_API_URL=$VITE_API_URL
EOF

    log_success ".env file configured successfully"
    echo ""
    log_info "Configuration Summary:"
    log_info "  ROOT_PATH: $ROOT_PATH"
    log_info "  DB_PATH: $DB_PATH"
    log_info "  LOG_DIR: $LOG_DIR"
    log_info "  SERVER_PORT: $SERVER_PORT"
    log_info "  VITE_API_URL: $VITE_API_URL"
}

build_project() {
    log_section "Building Project"

    log_info "Installing Bun dependencies..."
    cd "$PROJECT_DIR"
    sudo -u "$INSTALL_USER" /home/"$INSTALL_USER"/.bun/bin/bun install

    log_info "Building frontend and server..."
    sudo -u "$INSTALL_USER" /home/"$INSTALL_USER"/.bun/bin/bun run build

    log_success "Project built successfully"
}

setup_sampler() {
    log_section "Setting Up Sensor Sampler"

    # Load env variables
    set -a
    source "$PROJECT_DIR/.env"
    set +a

    # Create directories from env configuration
    log_info "Creating directories from configuration..."
    mkdir -p "$DB_PATH"
    mkdir -p "$LOG_DIR"
    touch "$DB_PATH$DB_FILE" "$LOG_DIR$LOG_FILE"
    chown -R "$INSTALL_USER:$INSTALL_USER" \
      "$DB_PATH" \
      "$DB_PATH$DB_FILE" \
      "$LOG_DIR" \
      "$LOG_DIR$LOG_FILE"
    chmod 755 "$DB_PATH" "$LOG_DIR"
    log_success "Directories created: $DB_PATH, $LOG_DIR"

    # Install sampler dependencies
    log_info "Installing sampler dependencies..."
    cd "$PROJECT_DIR/sampler"
    sudo -u "$INSTALL_USER" /home/"$INSTALL_USER"/.local/bin/uv sync

    log_info "Activating i2c interface..."
    sudo raspi-config nonint do_i2c 0

    log_success "Sensor sampler configured"
}

create_systemd_services() {
    log_section "Creating Systemd Services"

    # Load env variables for paths
    set -a
    source "$PROJECT_DIR/.env"
    set +a

    # Server service (Bun)
    log_info "Creating Bun server service..."
    cat > /etc/systemd/system/wlas-server.service << EOF
[Unit]
Description=Water Level Acquisition System - Server
After=network.target
Wants=wlas-sampler.service

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$PROJECT_DIR
Environment="PATH=/home/$INSTALL_USER/.bun/bin:\$PATH"
ExecStart=/home/$INSTALL_USER/.bun/bin/bun start
Restart=on-failure
RestartSec=10
StandardOutput=append:$LOG_DIR/server.log
StandardError=append:$LOG_DIR/server.log

[Install]
WantedBy=multi-user.target
EOF
    log_success "Bun Server service created"

    # Sampler service (UV/Python)
    log_info "Creating sampler service..."
    cat > /etc/systemd/system/wlas-sampler.service << EOF
[Unit]
Description=Water Level Acquisition System - Sensor Sampler
After=network.target pigpiod.service
Wants=pigpiod.service

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$PROJECT_DIR/sampler
Environment="PATH=/home/$INSTALL_USER/.local/bin:\$PATH"
ExecStart=/home/$INSTALL_USER/.local/bin/uv run -m src.sampler
Restart=on-failure
RestartSec=5
StandardOutput=append:$LOG_DIR/$LOG_FILE
StandardError=append:$LOG_DIR/$LOG_FILE

[Install]
WantedBy=multi-user.target
EOF
    log_success "Sampler service created"

    # Create pigpiod systemd service
    log_info "Creating pigpiod systemd service..."
    cat > /etc/systemd/system/pigpiod.service << 'EOF'
[Unit]
Description=pigpio daemon
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/pigpiod
Restart=on-failure
RestartSec=5
TimeoutStopSec=5
SendSIGKILL=yes

[Install]
WantedBy=multi-user.target
EOF
    # Enable services
    log_info "Enabling services..."
    systemctl daemon-reload
    systemctl enable pigpiod
    systemctl enable wlas-server.service
    systemctl enable wlas-sampler.service

    # Start services
    log_info "Starting services..."
    systemctl start pigpiod.service
    sleep 2
    systemctl start wlas-sampler.service
    sleep 2
    systemctl start wlas-server.service

    log_success "Services created and started"
}

setup_database_cleanup() {
  log_section "Setting Up Database Cleanup"

  # Load env variables
  set -a
  source "$PROJECT_DIR/.env"
  set +a

  log_info "Creating daily cleanup cron job..."

  # Create cron job to run cleanup daily at 2 AM
  cat > /tmp/wlas_cron << EOF
0 2 * * * /home/$INSTALL_USER/.local/bin/uv run -m src.sampler --cleanup >> $LOG_DIR/cleanup.log 2>&1
EOF

    # Install cron job for the user
    sudo -u "$INSTALL_USER" crontab /tmp/wlas_cron
    rm /tmp/wlas_cron

    log_success "Database cleanup cron job configured (runs daily at 2:00 AM)"

}

setup_portal_redirect() {
    log_section "Setting Up Portal Redirect (Nodogsplash)"

    # Install dependencies
    log_info "Installing nodogsplash dependencies..."
    apt-get install -y git \
      build-essential \
      libmicrohttpd-dev \
      libssl-dev \
      iptables \
      netfilter-persistent \
      iptables-persistent \
      debhelper \
      devscripts \
      libjson-c-dev \
      zlib1g-dev

    # Build and install nodogsplash
    log_info "Building nodogsplash..."
    cd /tmp
    rm -rf nodogsplash
    git clone https://github.com/nodogsplash/nodogsplash.git
    cd nodogsplash
    make
    sudo make install

    # Configure nodogsplash
    log_info "Configuring nodogsplash..."
    cat > /etc/nodogsplash/nodogsplash.conf << EOF
GatewayInterface wlan0

FirewallRuleSet authenticated-users {
  FirewallRule allow all
}

FirewallRuleSet preauthenticated-users {
FirewallRule allow tcp port 53
FirewallRule allow udp port 53
}

FirewallRuleSet users-to-router {
    FirewallRule allow udp port 53
    FirewallRule allow tcp port 53
    FirewallRule allow udp port 67
    FirewallRule allow tcp port 22
    FirewallRule allow tcp port 80
    FirewallRule allow tcp port 443
    FirewallRule allow tcp port 3000
}

GatewayAddress $SERVER_IP
RedirectURL $VITE_API_URL
GatewayPort 2050
MaxClients $MAX_SSE_CLIENTS
EOF

    # Create nodogsplash systemd service
    log_info "Creating nodogsplash systemd service..."
    cat > /etc/systemd/system/nodogsplash.service << 'EOF'
[Unit]
Description=NodeDogSplash Captive Portal
After=network.target

[Service]
ExecStart=/usr/bin/nodogsplash -f /etc/nodogsplash/nodogsplash.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
Type=simple

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start nodogsplash
    log_info "Enabling nodogsplash..."
    systemctl daemon-reload
    systemctl enable nodogsplash
    systemctl start nodogsplash

    log_success "Nodogsplash captive portal configured"

    log_warn "System will reboot in 30 seconds..."
    log_warn ""
    log_warn "After reboot:"
    log_warn "  1. Connect to the WiFi hotspot"
    log_warn "  2. Open browser and go to http://$SERVER_IP/login"
    log_warn "  3. Login with default credentials"
    log_warn "  4. Configure your WiFi network credentials"
    log_warn "  5. Configure your Admin credentials"
    log_warn "  6. Go to /etc/lighttpd/lighttpd.conf to uncomment the lines:"
    log_warn "       else {"
    log_warn "          url.redirect = ( \".*\" => \"$VITE_API_URL\" )"
    log_warn "       }"
    log_warn "  6. Reboot again"
    log_warn ""

    # Countdown
    for i in {30..1}; do
        printf "\r%sRebooting in: %ds%s    " "$YELLOW" "$i" "$NC"
        sleep 1
    done
    printf "\n"

    reboot
}

setup_hotspot() {
    log_section "Setting Up WiFi Hotspot (RaspAP)"
    log_warn "HOTSPOT SETUP - REQUIRES MANUAL CONFIGURATION AND REBOOT"
    echo ""

    read -p "Continue with RaspAP installation? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "RaspAP installation skipped"
        return
    fi

    # Set localization (Mexico)
    log_info "Setting localization to Mexico..."
    raspi-config nonint do_wifi_country "MX"
    raspi-config nonint do_change_timezone America/Mexico_City

    # Disable NetworkManager
    log_info "Disabling NetworkManager..."
#    systemctl stop NetworkManager
    systemctl disable NetworkManager

    # Install RaspAP
    log_info "Installing RaspAP..."
    curl -sL https://install.raspap.com | bash -s -- --yes \
      --openvpn 0 \
    	--rest 0 \
    	--adblock 0 \
    	--wireguard 0 \
    	--provider 0

    # Configure lighttpd
    log_info "Configuring lighttpd..."
    cat >> /etc/lighttpd/lighttpd.conf << 'EOF'

# --- REROUTE EVERYTHING TO PORT 3000 EXCEPT RASPAP ADMIN ---

# Redirect all other requests to the Node server on port 3000
#else {
#    url.redirect = ( ".*" => "http://10.3.141.1" )
#}
EOF
    log_warn ""
    log_warn "RaspAP installation complete!"
}

##############################################################################
# INSTALLATION MENU & ORCHESTRATION
##############################################################################

show_installation_menu() {
    echo ""
    echo -e "${BLUE}Select installation profile:${NC}"
    echo ""
    echo "  1) Full installation (all features)"
    echo "  2) Core installation (essential components)"
    echo "  3) Core + Portal Redirect (captive portal)"
    echo "  4) Custom (choose which steps)"
    echo "  5) Exit"
    echo ""
    read -rp "Enter choice (1-5): " menu_choice
    echo ""

    case $menu_choice in
        1)
            INSTALL_REDIRECT=true
            INSTALL_HOTSPOT=true
            return 0  # Core only
            ;;
        2)
            return 0
            ;;
        3)
            INSTALL_REDIRECT=true
            return 0
            ;;
        4)
            custom_installation
            return 0
            ;;
        5)
            log_warn "Installation cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid choice"
            show_installation_menu
            ;;
    esac
}

custom_installation() {
    log_section "Custom Installation"

    read -p "Install dependencies? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
    fi

    read -p "Build project? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_project
    fi

    read -p "Setup sampler? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_sampler
    fi

    read -p "Create systemd services? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_systemd_services
    fi

    read -p "Setup database cleanup? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database_cleanup
    fi

    read -p "Setup portal redirect (nodogsplash)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        INSTALL_REDIRECT=true
    fi

    read -p "Setup hotspot (raspap)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        INSTALL_HOTSPOT=true
    fi
}

##############################################################################
# MAIN EXECUTION
##############################################################################

main() {
    # Initialize flags
    INSTALL_REDIRECT=false
    INSTALL_HOTSPOT=false

    # Print banner
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Water Level Acquisition System (WLAS) Installer      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Pre-flight checks
    check_root
    load_env
    setup_logging
    check_prerequisites

    # Show menu
    show_installation_menu

    # Setup environment file (interactive)
    setup_env_file


    # Run installation steps
    log_section "Installation Starting"
    install_dependencies
    build_project
    setup_sampler
    create_systemd_services
    setup_database_cleanup

    # Optional: Hotspot (requires reboot)
    if [ "$INSTALL_HOTSPOT" = true ]; then
        setup_hotspot
    fi

    # Optional: Portal redirect (requires hotspot to be working)
    if [ "$INSTALL_REDIRECT" = true ]; then
        setup_portal_redirect
    fi

    # Success summary
    log_section "Installation Complete"

    echo -e "${GREEN}System Information:${NC}"
    echo "  Project: $PROJECT_DIR"
    echo "  Database: $DB_PATH$DB_FILE"
    echo "  Logs: $LOG_DIR"
    echo "  User: $INSTALL_USER"
    echo ""

    echo -e "${GREEN}Access the application:${NC}"
    echo "  URL: https://$HOST:$SERVER_PORT"
    echo "  Hostname: $VITE_API_URL"
    echo ""

    if [ "$INSTALL_HOTSPOT" = true ]; then
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "  1. System will reboot shortly"
        echo "  2. Connect to the WiFi hotspot"
        echo "  3. Open browser and accept terms"
        echo ""
    fi

    echo -e "${BLUE}Installation logs: $LOG_DIR/install.log${NC}"
    echo ""
}

# Run main function with all arguments
main "$@"