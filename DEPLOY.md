# Deploying GYMIO v2 to Raspberry Pi 5

## Prerequisites

- Raspberry Pi 5 with NVMe SSD (Pi OS Lite 64-bit)
- Network access (same LAN as Sonos speakers)
- Polar H10 HR monitor (optional, for BLE heart rate)
- AWS credentials with Bedrock access for AI features

## 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y git python3 python3-venv nodejs npm bluetooth bluez \
  libbluetooth-dev libglib2.0-dev nginx

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.cargo/env

# Install Node.js 22 (if system version is old)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
```

## 2. Clone and Build

```bash
cd /home/pi
git clone https://github.com/laithalsaadoon/gymio.git
cd gymio
```

### Backend

```bash
cd backend
uv sync          # installs all Python deps from pyproject.toml + uv.lock
```

### Frontend

```bash
cd ../frontend
npm ci           # install from lockfile
npm run build    # outputs to frontend/build/
```

## 3. Environment Variables

Create `/home/pi/gymio/backend/.env`:

```bash
# AWS Bedrock (for AI Coach)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1

# Or use bearer token auth:
# AWS_BEARER_TOKEN_BEDROCK=your_token

# BLE HR Monitor (optional — auto-discovers if omitted)
# HR_ADDRESS=XX:XX:XX:XX:XX:XX
# HR_MAX=190
```

## 4. Database

SQLite creates itself on first run. To use the NVMe SSD:

```bash
# Ensure the data directory exists
sudo mkdir -p /data/gymio
sudo chown pi:pi /data/gymio
```

Edit `backend/database/database.py` and set:
```python
SQLALCHEMY_DATABASE_URL = "sqlite:////data/gymio/gymio.db"
```

Seed the exercise catalog on first run:
```bash
cd /home/pi/gymio/backend
uv run python -c "
from database.database import SessionLocal, engine
from database.models import Base
Base.metadata.create_all(bind=engine)
print('Database initialized')
"
# Then hit POST /exercises/seed once the server is running
```

## 5. Run the Backend

### Development

```bash
cd /home/pi/gymio/backend
uv run uvicorn server.api:app --host 0.0.0.0 --port 5000
```

### Production (systemd)

Create `/etc/systemd/system/gymio-backend.service`:

```ini
[Unit]
Description=GYMIO Backend
After=network.target bluetooth.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/gymio/backend
EnvironmentFile=/home/pi/gymio/backend/.env
ExecStart=/home/pi/.local/bin/uv run uvicorn server.api:app --host 0.0.0.0 --port 5000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable gymio-backend
sudo systemctl start gymio-backend
sudo systemctl status gymio-backend
```

## 6. Serve the Frontend (nginx)

Create `/etc/nginx/sites-available/gymio`:

```nginx
server {
    listen 80;
    server_name gymio.me gymio.lan _;

    root /home/pi/gymio/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/gymio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

## 7. Kiosk Mode (TV Display)

If using the Pi's HDMI output for a gym TV:

```bash
# Run the included setup script
bash /home/pi/gymio/scripts/setup-kiosk.sh
```

Or manually:

```bash
sudo apt install -y wayfire chromium-browser seatd
sudo usermod -aG video,render,input pi

# Auto-start config
mkdir -p ~/.config/wayfire
cat > ~/.config/wayfire.ini << 'CONF'
[autostart]
chrome = chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run http://localhost

[idle]
dpms_timeout = 0
CONF

# Auto-login + auto-start Wayfire
echo '[ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ] && exec wayfire' >> ~/.bash_profile

# Disable screen blanking
sudo sed -i 's/$/ consoleblank=0/' /boot/firmware/cmdline.txt
```

Reboot and the TV should show the GYMIO dashboard fullscreen.

## 8. BLE Permissions (for Heart Rate)

```bash
# Grant BLE access without root
sudo setcap cap_net_raw,cap_net_admin+eip $(readlink -f $(which python3))

# Or add pi to bluetooth group
sudo usermod -aG bluetooth pi
```

## 9. TLS (optional, for phone access)

If accessing from phone over the network:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gymio.me
```

Or use a self-signed cert for local network.

## 10. Verify

```bash
# Backend health
curl http://localhost:5000/button_duration

# Seed exercises
curl -X POST http://localhost:5000/exercises/seed

# Check WebSocket
# Open http://gymio.lan in a browser — timer tab should load

# Test AI Coach (requires AWS credentials)
curl -X POST http://localhost:5000/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{"user": "laith", "goal": "hypertrophy"}'

# Check HR service
curl http://localhost:5000/hr/status
```

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | `http://localhost:5000` |
| Frontend (dev) | 5173 | `http://localhost:5173` |
| Frontend (prod) | 80 | `http://gymio.lan` |
| WebSocket | 5000 | `ws://localhost:5000/ws` |

## Updating

```bash
cd /home/pi/gymio
git pull
cd backend && uv sync
cd ../frontend && npm ci && npm run build
sudo systemctl restart gymio-backend
sudo systemctl restart nginx
```
