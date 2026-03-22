import soco
from soco.snapshot import Snapshot
import threading
import time

SONOS_SPEAKER_NAME = "Garage Gym"


class SonosController:
    def __init__(self):
        self.speaker = None
        self.snapshot = None
        self._last_track = {}

    def discover(self):
        """Find the Sonos speaker named SONOS_SPEAKER_NAME on the network.
        Falls back to any_soco() if the named speaker isn't found.
        Returns True if a speaker was found."""
        try:
            speakers = soco.discover(timeout=5)
            if speakers:
                for speaker in speakers:
                    if speaker.player_name.lower() == SONOS_SPEAKER_NAME.lower():
                        self.speaker = speaker
                        if not self.speaker.is_coordinator:
                            self.speaker = self.speaker.group.coordinator
                        print(f"Found Sonos: {self.speaker.player_name} at {self.speaker.ip_address}")
                        return True
                # Named speaker not found, list what we did find
                names = [s.player_name for s in speakers]
                print(f"Sonos speaker '{SONOS_SPEAKER_NAME}' not found. Available: {names}")

            # Fallback to any speaker
            self.speaker = soco.discovery.any_soco()
            if self.speaker and not self.speaker.is_coordinator:
                self.speaker = self.speaker.group.coordinator
            if self.speaker:
                print(f"Fallback Sonos: {self.speaker.player_name} at {self.speaker.ip_address}")
            return self.speaker is not None
        except Exception as e:
            print(f"Sonos discovery error: {e}")
            return False

    @property
    def available(self):
        return self.speaker is not None

    def get_now_playing(self) -> dict:
        """Returns current track info from the Sonos speaker."""
        if not self.available:
            return {}
        try:
            info = self.speaker.get_current_track_info()
            return {
                "title": info.get("title", ""),
                "artist": info.get("artist", ""),
                "album": info.get("album", ""),
                "album_art": info.get("album_art", ""),
                "duration": info.get("duration", ""),
                "position": info.get("position", ""),
            }
        except Exception:
            return {}

    def has_track_changed(self) -> tuple[bool, dict]:
        """Check if the track has changed since last poll."""
        current = self.get_now_playing()
        changed = (
            current.get("title") != self._last_track.get("title")
            or current.get("artist") != self._last_track.get("artist")
        )
        if changed:
            self._last_track = current
        return changed, current

    def play(self):
        if self.available:
            self.speaker.play()

    def pause(self):
        if self.available:
            self.speaker.pause()

    def next_track(self):
        if self.available:
            self.speaker.next()

    def get_volume(self) -> int:
        if self.available:
            return self.speaker.volume
        return 0

    def set_volume(self, volume: int):
        if self.available:
            self.speaker.volume = max(0, min(100, volume))

    def duck_and_announce(self, audio_url: str, duck_volume: int = 15):
        """Lower music, play TTS audio, then restore.
        Runs in a background thread to avoid blocking."""
        if not self.available:
            return

        def _announce():
            try:
                snap = Snapshot(self.speaker)
                snap.snapshot()
                self.speaker.volume = duck_volume
                self.speaker.play_uri(audio_url)
                # Wait for the announcement to finish
                time.sleep(0.5)
                while self.speaker.get_current_transport_info()["current_transport_state"] == "PLAYING":
                    time.sleep(0.5)
                snap.restore(fade=True)
            except Exception as e:
                print(f"Sonos announce error: {e}")

        threading.Thread(target=_announce, daemon=True).start()
