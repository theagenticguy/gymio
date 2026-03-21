from lights.lights import Lights
from gpiozero import Button as GPIOButton
from database.database import SessionLocal
from database.models import ButtonRestDuration
import threading


class Button:
    def __init__(self, lights: Lights):
        self.lights = lights
        self._active_timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self.physical_button = GPIOButton(21, bounce_time=0.3)
        self.physical_button.when_pressed = self.handle_button_press

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

            # Schedule green after duration
            def turn_green():
                self.lights.all_off()
                self.lights.green_on()
                with self._lock:
                    self._active_timer = None

            self._active_timer = threading.Timer(duration, turn_green)
            self._active_timer.start()

    def close(self):
        with self._lock:
            if self._active_timer is not None:
                self._active_timer.cancel()
                self._active_timer = None
        self.physical_button.close()
