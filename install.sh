#!/bin/bash

##############################################################################
# Water Level Acquisition System (WLAS) Installation Script
# For Raspberry Pi
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
        log_error "This script must be run with sudo. i.e. sudo ./install.sh"
        exit 1
    fi
}

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check OS
    if ! grep -qi "raspberry\|debian\|ubuntu" /etc/os-release; then
        log_error "This script is designed for Raspberry Pi OS (Debian-based)."
        exit 1
    fi

    # Check disk space (at least 2GB)
    available_space=$(df "$PROJECT_DIR" | awk 'NR==8 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then
        log_error "Insufficient disk space (need 8GB, have $(( available_space / 1048576 ))GB)."
        exit 1
    fi
}

setup_env_file() {
    log_section "Environment File Configuration"

    # Variables from template (use as-is)
    DEBUG="true"
    SAMPLE_INTERVAL="1"
    AUTO_CLEANUP_ENABLED="true"
    HOST="0.0.0.0"
    SERVER_IP="10.3.141.1"

    # Ask user for customizable variables
    echo -e "${BLUE}press Enter to use defaults:${NC}"
    echo ""

    read -rp "Database path (default: /var/lib/wlas/): " db_path
    DB_PATH="${db_path:-"/var/lib/wlas/"}"

    read -rp "Log directory (default: /var/log/wlas/): " log_dir
    LOG_DIR="${log_dir:-"/var/log/wlas/"}"

    read -rp "Data retention days (default: 30): " retention_days
    DATA_RETENTION_DAYS="${retention_days:-30}"

    read -rp "Database file (default: samples.sqlite): " db_file
    DB_FILE="${db_file:-"samples.sqlite"}"

    read -rp "Sample table name (default: sensor_samples): " sample_table
    SAMPLE_TABLE="${sample_table:-"sensor_samples"}"

    read -rp "Log file name (default: sampler.log): " log_file
    LOG_FILE="${log_file:-"sampler.log"}"

    read -rp "Maximum Concurrent clients (default: 19): " log_file
    MAX_SSE_CLIENTS="${log_file:-19}"

    read -rp "Server port (default: 3000): " server_port
    SERVER_PORT="${server_port:-3000}"

    VITE_API_URL="http://${SERVER_IP}:${SERVER_PORT}"

    ROOT_PATH="$PROJECT_DIR"

    # Create/update .env file
    log_info "Writing configuration to .env..."

    cat > "$PROJECT_DIR/.env" << EOF
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
    systemctl enable pigpiod.service
    systemctl enable wlas-sampler.service
    systemctl enable wlas-server.service

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
0 2 * * * /home/$INSTALL_USER/.local/bin/uv run \
  --directory $PROJECT_DIR/sampler \
  -m src.sampler --cleanup >> /var/log/wlas/cleanup.log 2>&1
EOF

    # Install cron job for the user
    sudo -u "$INSTALL_USER" crontab /tmp/wlas_cron
    rm /tmp/wlas_cron

    log_success "Database cleanup cron job configured (runs daily at 2:00 AM)"

}

setup_hotspot() {
    log_section "Setting Up WiFi Hotspot (RaspAP)"
    log_warn "HOTSPOT SETUP - REQUIRES REBOOT."

    # Set localization (Mexico)
    log_info "Setting localization to Mexico..."
    raspi-config nonint do_wifi_country "MX"
    raspi-config nonint do_change_timezone America/Mexico_City

    # Disable NetworkManager
    log_info "Disabling NetworkManager..."
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
    log_info "Serving RaspAp dashboard page to port 8080..."
    sudo /etc/raspap/lighttpd/configport.sh 8080 "" /etc/lighttpd/lighttpd.conf

    log_info "Creating port $SERVER_PORT redirection to 80 systemd service..."
    cat > /etc/systemd/system/http-redirect.service << EOF
[Unit]
Description=Redirect HTTP 80 to Bun $SERVER_PORT
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port $SERVER_PORT
ExecStart=/usr/sbin/iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port $SERVER_PORT
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable http-redirect.service

    log_info "Setting Open Network and SSID... "
    cat > /etc/hostapd/hostapd.conf << EOF
driver=nl80211
ctrl_interface=/var/run/hostapd
ctrl_interface_group=0
auth_algs=1
wpa_key_mgmt=WPA-PSK
beacon_int=100
ssid=Tanques Interconectados
channel=1
hw_mode=g
ieee80211n=0
wpa_passphrase=tanques-interconectados
interface=wlan0
wpa=none
wpa_pairwise=CCMP
country_code=MX
ignore_broadcast_ssid=0
max_num_sta=$MAX_SSE_CLIENTS
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
    echo "  1) Full installation (essential components + Hotspot)"
    echo "  2) Core installation (essential components)"
    echo "  3) Custom (choose which steps)"
    echo "  4) Exit"
    echo ""
    read -rp "Enter choice (1-5): " menu_choice
    echo ""

    case $menu_choice in
        1)
            INSTALL_HOTSPOT=true
            return 0  # Core only
            ;;
        2)
            return 0
            ;;
        3)
            custom_installation
            return 0
            ;;
        4)
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

    read -p "Setup Hotspot (RaspAP)? (y/n): " -n 1 -r
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
    INSTALL_HOTSPOT=false

    # Print banner
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Water Level Acquisition System (WLAS) Installer      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Pre-flight checks
    check_root
    check_prerequisites

    show_installation_menu
    setup_env_file
    setup_logging

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

    # Success summary
    log_section "Installation Complete"

    echo -e "${GREEN}System Information:${NC}"
    echo "  Project: $PROJECT_DIR"
    echo "  Database: $DB_PATH$DB_FILE"
    echo "  Logs: $LOG_DIR"
    echo "  User: $INSTALL_USER"
    echo ""

    echo -e "${BLUE}Installation logs: $LOG_DIR/install.log${NC}"
    echo ""

    if [ "$INSTALL_HOTSPOT" = true ]; then
        echo -e "${YELLOW}Next Steps:${NC}"
        echo -e "${RED}1. Reboot the system${NC}"
        echo -e "${GREEN}2. Connect to the Open WiFi Hotspot: Tanques Interconectados${NC}"
        echo -e "${GREEN}3. Open the web Network Admin Panel to tweak settings if needed.${NC}"
        echo "  Network Administration panel: http://$SERVER_IP:8080"
        echo "    user: admin"
        echo "    password: secret"
        echo "    In this dashboard you'll be able to tweak settings such as Hotspot name & password, admin username & password, and restart the Hotspot."
        echo ""
        echo -e "${GREEN}4. Open the web water-level-acquitistion system dashboard.${NC}"
        echo "  URL: http://$SERVER_IP"
        echo "  Complete URL: http://$SERVER_IP:$SERVER_PORT"
        echo "  In case of any problems visit the README.md guide Troubleshooting section found in this project at https://github.com/AndresSM415/water-level-acquisition-system.git or contact me: https://github.com/AndresSM415."
    fi
}

# Run main function with all arguments
main "$@"