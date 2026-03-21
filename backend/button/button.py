import time
import threading
from lights.lights import Lights
from gpiozero import Button as GPIOButton
from database.database import SessionLocal
from database.models import ButtonRestDuration


class Button:
    def __init__(self, lights: Lights, broadcast=None):
        self.lights = lights
        self.broadcast = broadcast or (lambda msg: None)
        self._active_timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self._rest_start_time = 0.0
        self._rest_duration = 0
        self._press_count = 0
        self.physical_button = GPIOButton(21, bounce_time=0.3)
        self.physical_button.when_pressed = self.handle_button_press

    @property
    def rest_active(self):
        with self._lock:
            return self._active_timer is not None

    def get_remaining(self) -> int:
        with self._lock:
            if self._active_timer is None or self._rest_duration == 0:
                return 0
            elapsed = time.monotonic() - self._rest_start_time
            return max(0, int(self._rest_duration - elapsed))

    def handle_button_press(self):
        with self._lock:
            # Cancel any previous rest timer
            if self._active_timer is not None:
                self._active_timer.cancel()
                self._active_timer = None

            # Fresh DB session per press (avoids stale reads)
            db = SessionLocal()
            try:
                row = db.query(ButtonRestDuration).filter(ButtonRestDuration.id == 1).first()
                duration = row.duration if row else 60
            finally:
                db.close()

            # Turn the light red
            self.lights.all_off()
            self.lights.red_on()

            self._rest_start_time = time.monotonic()
            self._rest_duration = duration
            self._press_count += 1

            self.broadcast({
                "type": "button_rest",
                "active": True,
                "remaining": duration,
                "duration": duration,
                "press": self._press_count,
            })
            self.broadcast({
                "type": "lights",
                "color": "red",
                "mode": "solid",
            })

            # Schedule green after duration
            def turn_green():
                self.lights.all_off()
                self.lights.green_on()
                with self._lock:
                    self._active_timer = None
                    self._rest_start_time = 0.0
                    self._rest_duration = 0
                self.broadcast({
                    "type": "button_rest",
                    "active": False,
                    "remaining": 0,
                    "duration": 0,
                    "press": self._press_count,
                })
                self.broadcast({
                    "type": "lights",
                    "color": "green",
                    "mode": "solid",
                })

            self._active_timer = threading.Timer(duration, turn_green)
            self._active_timer.start()

    def close(self):
        with self._lock:
            if self._active_timer is not None:
                self._active_timer.cancel()
                self._active_timer = None
        self.physical_button.close()
