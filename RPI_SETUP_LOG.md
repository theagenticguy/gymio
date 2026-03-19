# RPi 5 Setup Log

## What Worked

We used the **Pi Imager `firstrun.sh` method** — the same mechanism Raspberry Pi Imager uses for millions of devices. A shell script on the boot partition (FAT32) runs via `systemd.run=` kernel parameter on first boot, then self-cleans from `cmdline.txt` and reboots.

### Files touched on boot partition

| File | Action |
|------|--------|
| `firstrun.sh` | Created — sets hostname, user, password, SSH, WiFi |
| `cmdline.txt` | Appended `systemd.run=` params to trigger firstrun |
| `config.txt` | Already had PCIe Gen3 from prior attempt — no changes needed |

### What `firstrun.sh` does

1. Sets hostname to `gymio` via `imager_custom set_hostname`
2. Renames default UID 1000 user to `pi` via `imager_custom rename_user`
3. Sets password `gymio2026` via `chpasswd`
4. Enables SSH via `imager_custom enable_ssh` (Pi OS-specific, NOT `systemctl`)
5. Grants sudo NOPASSWD
6. Unblocks WiFi via `rfkill`, connects via `nmcli` with 5 retries
7. Removes itself from `cmdline.txt` so it only runs once

## Key Lessons

### 1. Cloud-init is wrong for Pi OS Trixie

- **`ssh_pwauth: true` does NOT enable SSH** — Pi OS uses `sshswitch.service` and `imager_custom enable_ssh`
- **`network-config` changes don't re-apply** — even with `instance_id` changes (confirmed by Pi Forums maintainer thagrol, Feb 2026)
- **Cloud-init's network module doesn't call `rfkill unblock`** — WiFi silently fails because it's soft-blocked by default
- Pi Imager has never used cloud-init for first-boot setup — it generates `firstrun.sh`

### 2. WiFi rfkill requires `/usr/sbin` in PATH

The `firstrun.sh` script runs at `kernel-command-line.target` (minimal boot). At this target, `/usr/sbin` is not in `$PATH`, so bare `rfkill` fails silently (`set +e`). **For future flashes**, use absolute paths: `/usr/sbin/rfkill unblock wifi`

### 3. Ethernet is the safety net

Always have ethernet connected during first-boot experiments. It let us SSH in and fix WiFi manually.

### 4. Firewalla quarantine blocks apt

WiFi connects but the Pi can't reach the internet until approved in Firewalla. Approve the device before running installs.

### 5. WD Blue SN580 is incompatible with Pi 5

The SN580 uses a SanDisk controller that requires a 32.768 kHz reference clock (SUSCLK) on M.2 pin 68 — which no Pi 5 NVMe HATs provide. PCIe link never comes up; Pi hangs at boot. The official "avoid" list includes all WD Green/Blue/Red/Black, SanDisk Ultra, Kingston OM8SEP, and Transcend 110Q.

**Working drive**: Kingston NV3 1TB (Phison controller, PCIe Gen2 x1, detected immediately).

### 6. PCIe Gen3 can cause boot hangs

Even with a compatible drive, `dtparam=pciex1_gen=3` caused hangs. Dialed back to `dtparam=pciex1_gen=2` — still plenty fast for our use case. Gen2 x1 = ~500 MB/s, more than enough for SQLite + app data.

### 7. gpiozero needs gpio group + build deps

`gpiozero` + `lgpio` Python packages require: `sudo apt install -y swig python3-dev liblgpio-dev` to build, and the `pi` user must be in the `gpio` group (`sudo usermod -aG gpio pi`) or the pin factory fails at import time.

### 8. nginx needs home dir traversal

nginx runs as `www-data` and can't read `/home/pi/gymio/frontend/build` unless `/home/pi` is `chmod 755`.

### 9. `frontend/src/lib/utils.js` is gitignored

The shadcn `cn()` utility file is in `.gitignore` — must be manually copied after clone or the Vite build fails.

## Completed Setup

| Component | Details |
|-----------|---------|
| Hostname | `gymio` |
| User | `pi` / `gymio2026` (SSH key auth) |
| WiFi | `192.168.248.149` (static, Firewalla allowlisted) |
| Kernel | `6.12.47+rpt-rpi-2712` aarch64, Pi OS Trixie Lite |
| NVMe | Kingston NV3 1TB at `/data` (ext4, fstab persistent, PCIe Gen2) |
| SQLite DB | `/data/gymio/sql_app.db` (484 exercises seeded) |
| Backend | FastAPI via systemd (`gymio-backend`), port 5000, auto-start |
| Frontend | React build served by nginx on port 80 |
| Kiosk | Wayfire + Chromium, auto-login tty1, screen blanking disabled |
| BLE | `pi` in bluetooth group, ready for Polar H10 pairing |
| GPIO | `pi` in gpio group, gpiozero + lgpio installed |
| cloud-init | Disabled |
| uv | 0.10.11 |
| Node.js | 22.22.1 |
| `.env` | `/home/pi/gymio/backend/.env` (Bedrock creds) |

## Remaining

- **Pair Polar H10** — `bluetoothctl scan on`, find MAC, update config
- **Test GPIO traffic lights** — wire to pins 5 (red), 6 (yellow), 13 (green)
- **Test Sonos discovery** — SoCo should auto-discover on same LAN
- **TLS for phone PWA** — self-signed cert or Let's Encrypt if DNS is set up
- **Fix gitignore** — commit `frontend/src/lib/utils.js` so clones don't break
- **Commit DB path change** — `database.py` now points to `/data/gymio/sql_app.db`
