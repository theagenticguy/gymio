import time
import threading
from lights.lights import Lights
from gpiozero import Button as GPIOButton
from database.database import SessionLocal
from database.models import ButtonRestDuration


class Button:
    """Freeform training mode driven by a physical GPIO button.

    Press 1: Start session → green light, Set 1
    Press during training: Finished set → red light, rest countdown
    Press during rest: Skip rest → green light, next set
    Stop via API or close().
    """

    def __init__(self, lights: Lights, broadcast=None):
        self.lights = lights
        self.broadcast = broadcast or (lambda msg: None)
        self._active_timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self._rest_start_time = 0.0
        self._rest_duration = 0

        # Session state
        self._session_active = False
        self._current_set = 0
        self._state = "idle"  # idle | training | resting

        self.physical_button = GPIOButton(21, bounce_time=0.3)
        self.physical_button.when_pressed = self._handle_press

    @property
    def session_active(self):
        with self._lock:
            return self._session_active

    def _get_remaining(self) -> int:
        """Compute remaining rest seconds. Must be called with _lock held."""
        if self._active_timer is None or self._rest_duration == 0:
            return 0
        elapsed = time.monotonic() - self._rest_start_time
        return max(0, int(self._rest_duration - elapsed))

    def get_remaining(self) -> int:
        with self._lock:
            return self._get_remaining()

    def get_status(self) -> dict:
        with self._lock:
            remaining = self._get_remaining() if self._state == "resting" else 0
            return {
                "type": "button_mode",
                "active": self._session_active,
                "state": self._state,
                "set": self._current_set,
                "remaining": remaining,
                "duration": self._rest_duration if self._state == "resting" else 0,
            }

    def _handle_press(self):
        with self._lock:
            if not self._session_active:
                # First press: start session, green light
                self._session_active = True
                self._current_set = 1
                self._state = "training"
                self.lights.all_off()
                self.lights.green_on()
                self._broadcast_state()

            elif self._state == "training":
                # Done with set → start rest
                self._state = "resting"
                self.lights.all_off()
                self.lights.red_on()
                self._start_rest()

            elif self._state == "resting":
                # Skip rest → next set
                if self._active_timer is not None:
                    self._active_timer.cancel()
                    self._active_timer = None
                self._current_set += 1
                self._state = "training"
                self._rest_start_time = 0.0
                self._rest_duration = 0
                self.lights.all_off()
                self.lights.green_on()
                self._broadcast_state()

    def _start_rest(self):
        """Start rest countdown. Must be called with _lock held."""
        db = SessionLocal()
        try:
            row = db.query(ButtonRestDuration).filter(ButtonRestDuration.id == 1).first()
            duration = row.duration if row else 60
        finally:
            db.close()

        self._rest_start_time = time.monotonic()
        self._rest_duration = duration
        self._broadcast_state()

        def _rest_done():
            with self._lock:
                self._active_timer = None
                self._current_set += 1
                self._state = "training"
                self._rest_start_time = 0.0
                self._rest_duration = 0
                self.lights.all_off()
                self.lights.green_on()
                self._broadcast_state()

        self._active_timer = threading.Timer(duration, _rest_done)
        self._active_timer.start()

    def stop_session(self):
        """Stop the freeform training session."""
        with self._lock:
            if self._active_timer is not None:
                self._active_timer.cancel()
                self._active_timer = None
            self._session_active = False
            self._current_set = 0
            self._state = "idle"
            self._rest_start_time = 0.0
            self._rest_duration = 0
            self.lights.all_off()
            self._broadcast_state()

    def _broadcast_state(self):
        """Broadcast button mode state. Must be called with _lock held."""
        remaining = self._get_remaining() if self._state == "resting" else 0
        self.broadcast({
            "type": "button_mode",
            "active": self._session_active,
            "state": self._state,
            "set": self._current_set,
            "remaining": remaining,
            "duration": self._rest_duration if self._state == "resting" else 0,
        })
        color = "green" if self._state == "training" else "red" if self._state == "resting" else "off"
        self.broadcast({"type": "lights", "color": color, "mode": "solid"})

    def close(self):
        with self._lock:
            if self._active_timer is not None:
                self._active_timer.cancel()
                self._active_timer = None
        self.physical_button.close()
