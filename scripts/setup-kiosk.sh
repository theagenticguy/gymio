#!/bin/bash
# GYMIO Kiosk Setup Script for Raspberry Pi 5
# Run this on the Pi after installing Pi OS Lite (64-bit) on NVMe

set -e

echo "=== GYMIO Kiosk Setup ==="

# Install display server + browser
echo "Installing Wayfire + Chromium..."
sudo apt update
sudo apt install -y wayfire chromium-browser seatd xdg-utils

# Enable seatd for Wayfire
sudo systemctl enable seatd
sudo systemctl start seatd
sudo usermod -aG video "$USER"

# Configure Wayfire
mkdir -p ~/.config
cat > ~/.config/wayfire.ini << 'WAYFIRE'
[core]
plugins = autostart

[autostart]
chromium = chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-translate --disable-features=TranslateUI --ozone-platform=wayland http://localhost

[idle]
dpms_timeout = 0

[input]
cursor_theme = default
cursor_size = 24
WAYFIRE

# Disable console blanking
if ! grep -q "consoleblank=0" /boot/firmware/cmdline.txt; then
    sudo sed -i 's/$/ consoleblank=0/' /boot/firmware/cmdline.txt
    echo "Added consoleblank=0 to kernel cmdline"
fi

# Auto-login via raspi-config
sudo raspi-config nonint do_boot_behaviour B2

# Auto-start Wayfire on login
if ! grep -q "wayfire" ~/.bash_profile 2>/dev/null; then
    cat >> ~/.bash_profile << 'PROFILE'

# Auto-start GYMIO kiosk
if [ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec wayfire
fi
PROFILE
    echo "Added Wayfire auto-start to .bash_profile"
fi

echo ""
echo "=== Setup complete ==="
echo "Reboot to start the kiosk: sudo reboot"
echo ""
echo "The TV will show http://localhost (serve the frontend with nginx on port 80)"
echo "To test: chromium-browser --kiosk http://localhost:5173"
