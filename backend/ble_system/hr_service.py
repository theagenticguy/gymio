"""
Async BLE Heart Rate Service for Polar H10 and similar monitors.
Runs as a background task within FastAPI's event loop.
Broadcasts HR, RR intervals, and HRV metrics via WebSocket.
"""

import asyncio
import math
import platform
from collections import deque
from datetime import datetime, timezone


class HRVCalculator:
    """Real-time HRV from RR intervals (sliding window)."""

    def __init__(self, window_seconds: int = 60):
        self.rr_intervals: deque[tuple[float, float]] = deque(maxlen=500)
        self.window_seconds = window_seconds

    def add_rr(self, rr_ms: float, timestamp: float):
        self.rr_intervals.append((timestamp, rr_ms))
        cutoff = timestamp - self.window_seconds
        while self.rr_intervals and self.rr_intervals[0][0] < cutoff:
            self.rr_intervals.popleft()

    def rmssd(self) -> float | None:
        """Root Mean Square of Successive Differences — primary HRV metric."""
        if len(self.rr_intervals) < 3:
            return None
        rrs = [rr for _, rr in self.rr_intervals]
        diffs = [rrs[i + 1] - rrs[i] for i in range(len(rrs) - 1)]
        if not diffs:
            return None
        return math.sqrt(sum(d ** 2 for d in diffs) / len(diffs))

    def sdnn(self) -> float | None:
        """Standard Deviation of NN intervals."""
        if len(self.rr_intervals) < 3:
            return None
        rrs = [rr for _, rr in self.rr_intervals]
        mean_rr = sum(rrs) / len(rrs)
        return math.sqrt(sum((rr - mean_rr) ** 2 for rr in rrs) / len(rrs))

    def recovery_score(self) -> int | None:
        """Normalized 0-100 score. RMSSD <20ms=poor, 20-40=fair, 40-80=good, >80=excellent."""
        rmssd = self.rmssd()
        if rmssd is None:
            return None
        return min(100, max(0, int((rmssd / 80) * 100)))

    def reset(self):
        self.rr_intervals.clear()


def calculate_hr_zone(bpm: int, max_hr: int = 190) -> dict:
    pct = (bpm / max_hr) * 100 if max_hr > 0 else 0
    if pct >= 90:
        return {"zone": 5, "name": "Peak", "color": "#ef4444", "pct": round(pct, 1)}
    if pct >= 80:
        return {"zone": 4, "name": "Hard", "color": "#f97316", "pct": round(pct, 1)}
    if pct >= 70:
        return {"zone": 3, "name": "Cardio", "color": "#eab308", "pct": round(pct, 1)}
    if pct >= 60:
        return {"zone": 2, "name": "Fat Burn", "color": "#22c55e", "pct": round(pct, 1)}
    if pct >= 50:
        return {"zone": 1, "name": "Warm Up", "color": "#3b82f6", "pct": round(pct, 1)}
    return {"zone": 0, "name": "Recovery", "color": "#6b7280", "pct": round(pct, 1)}


def parse_hr_measurement(data: bytearray) -> dict:
    """Parse BLE Heart Rate Measurement characteristic (UUID 0x2A37)."""
    flags = data[0]
    hr_format = flags & 0x01
    contact_bits = (flags >> 1) & 0x03
    ee_present = (flags >> 3) & 0x01
    rr_present = (flags >> 4) & 0x01

    idx = 1
    if hr_format:
        hr = int.from_bytes(data[idx : idx + 2], "little")
        idx += 2
    else:
        hr = data[idx]
        idx += 1

    if contact_bits == 3:
        contact = "detected"
    elif contact_bits == 2:
        contact = "not_detected"
    else:
        contact = "unsupported"

    ee = None
    if ee_present:
        ee = int.from_bytes(data[idx : idx + 2], "little")
        idx += 2

    rr = []
    if rr_present:
        while idx + 1 < len(data):
            rr.append(int.from_bytes(data[idx : idx + 2], "little"))
            idx += 2

    return {"hr": hr, "sensor_contact": contact, "ee": ee, "rr": rr}


class HeartRateService:
    """Manages BLE HR monitor connection and broadcasts data via WebSocket."""

    HR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

    # Default addresses (override via connect())
    DEFAULT_ADDR_MACOS = "B9EA5233-37EF-4DD6-87A8-2A875E821C46"
    DEFAULT_ADDR_LINUX = "A0:9E:1A:88:A5:81"

    def __init__(self, broadcast_fn, max_hr: int = 190):
        self.broadcast = broadcast_fn
        self.max_hr = max_hr
        self.hrv = HRVCalculator()
        self.connected = False
        self.address: str | None = None
        self.last_bpm = 0
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()

    async def connect(self, address: str | None = None) -> dict:
        if self.connected:
            return {"status": "already_connected", "address": self.address}

        if address is None:
            address = (
                self.DEFAULT_ADDR_MACOS
                if platform.system() == "Darwin"
                else self.DEFAULT_ADDR_LINUX
            )

        self.address = address
        self._stop_event.clear()
        self.hrv.reset()
        self._task = asyncio.create_task(self._run(address))
        return {"status": "connecting", "address": address}

    async def disconnect(self) -> dict:
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None
        self.connected = False
        await self.broadcast({"type": "hr_status", "connected": False})
        return {"status": "disconnected"}

    def get_status(self) -> dict:
        rmssd = self.hrv.rmssd()
        sdnn = self.hrv.sdnn()
        return {
            "connected": self.connected,
            "address": self.address,
            "last_bpm": self.last_bpm,
            "hrv": {
                "rmssd": round(rmssd, 1) if rmssd is not None else None,
                "sdnn": round(sdnn, 1) if sdnn is not None else None,
                "recovery_score": self.hrv.recovery_score(),
                "samples": len(self.hrv.rr_intervals),
            },
        }

    async def _run(self, address: str):
        try:
            from bleak import BleakClient
        except ImportError:
            print("bleak not installed — HR monitoring disabled")
            await self.broadcast(
                {"type": "hr_status", "connected": False, "error": "bleak not installed"}
            )
            return

        while not self._stop_event.is_set():
            try:
                async with BleakClient(address, timeout=15.0) as client:
                    self.connected = True
                    await self.broadcast(
                        {"type": "hr_status", "connected": True, "address": address}
                    )

                    loop = asyncio.get_event_loop()

                    def notification_handler(sender, data):
                        loop.call_soon_threadsafe(
                            asyncio.ensure_future, self._handle_hr_data(data)
                        )

                    await client.start_notify(self.HR_UUID, notification_handler)

                    # Stay connected until stop or disconnect
                    while client.is_connected and not self._stop_event.is_set():
                        await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"BLE error: {e}")
                self.connected = False
                await self.broadcast(
                    {"type": "hr_status", "connected": False, "error": str(e)}
                )
                if not self._stop_event.is_set():
                    await asyncio.sleep(5)

    async def _handle_hr_data(self, data: bytearray):
        now = datetime.now(timezone.utc).timestamp()
        parsed = parse_hr_measurement(data)

        bpm = parsed["hr"]
        self.last_bpm = bpm

        # Feed RR intervals to HRV calculator
        for rr_raw in parsed.get("rr", []):
            rr_ms = (rr_raw / 1024) * 1000
            self.hrv.add_rr(rr_ms, now)

        zone = calculate_hr_zone(bpm, self.max_hr)

        msg: dict = {
            "type": "hr",
            "bpm": bpm,
            "zone": zone["zone"],
            "zone_name": zone["name"],
            "zone_color": zone["color"],
            "zone_pct": zone["pct"],
            "sensor_contact": parsed.get("sensor_contact"),
        }

        rmssd = self.hrv.rmssd()
        if rmssd is not None:
            msg["hrv"] = {
                "rmssd": round(rmssd, 1),
                "sdnn": round(self.hrv.sdnn() or 0, 1),
                "recovery_score": self.hrv.recovery_score(),
            }

        await self.broadcast(msg)
