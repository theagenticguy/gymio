import platform

is_pi = platform.system() == "Linux" and (platform.machine().startswith("aarch64") or platform.machine().startswith("arm"))
if is_pi:
    from lights.lights import Lights

from collections import deque
from collections.abc import Callable
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from my_types import Workout, Timer


class Trainer:
    def __init__(self, scheduler: BackgroundScheduler, broadcast: Callable | None = None):
        self.scheduler = scheduler
        self.job = None
        self.broadcast = broadcast or (lambda msg: None)
        self.scheduler.start()
        self._setup_light_functions()
        self._current_phase = "idle"
        self._current_round = 0
        self._total_rounds = 0
        self._current_remaining = 0
        self._current_color = "off"

    def _setup_light_functions(self):
        if is_pi:
            try:
                self.lights = Lights()
                self.red = self.lights.red_on
                self.yellow = self.lights.yellow_on
                self.green = self.lights.green_on
                self.all_off = self.lights.all_off
                self.yellow_blink = self.lights.yellow_blink
                return
            except Exception as e:
                print(f"GPIO lights init failed (pins 5/6/13): {e}")
        self.lights = None
        self.red = lambda: print("red")
        self.yellow = lambda: print("yellow")
        self.green = lambda: print("green")
        self.all_off = lambda: print("all off")
        self.yellow_blink = lambda x: print("yellow blink")

    def _broadcast_state(self, phase: str, seconds: int, round_num: int, color: str, mode: str = "solid"):
        self._current_phase = phase
        self._current_round = round_num
        self._current_remaining = seconds
        self._current_color = color
        self.broadcast({
            "type": "timer",
            "remaining": seconds,
            "phase": phase,
            "round": round_num,
            "total_rounds": self._total_rounds,
        })
        self.broadcast({
            "type": "lights",
            "color": color,
            "mode": mode,
        })

    def post_schedule(self, HIIT: Workout):
        self.HIIT = HIIT
        self._total_rounds = HIIT.rounds

        my_list: list[Timer] = []
        for round in range(1, self.HIIT.rounds + 1):
            if round == 1:
                my_list.append(
                    Timer(
                        seconds=3,
                        is_blink=False,
                        color_on=self.yellow,
                        color_off=self.all_off,
                        current_round=round,
                        phase="warning",
                        color_name="yellow",
                    )
                )

            seconds_in_round = Timer(
                seconds=self.HIIT.train - 10,
                is_blink=False,
                color_on=self.green,
                color_off=self.all_off,
                current_round=round,
                phase="train",
                color_name="green",
            )
            my_list.append(seconds_in_round)

            ten_seconds_to_rest = Timer(
                seconds=10,
                is_blink=True,
                color_on=self.yellow_blink,
                color_off=self.all_off,
                current_round=round,
                phase="warning",
                color_name="yellow",
            )
            my_list.append(ten_seconds_to_rest)

            if round != self.HIIT.rounds:
                seconds_in_rest = Timer(
                    seconds=self.HIIT.rest - 10,
                    is_blink=False,
                    color_on=self.red,
                    color_off=self.all_off,
                    current_round=round,
                    phase="rest",
                    color_name="red",
                )
                my_list.append(seconds_in_rest)

                five_second_warning = Timer(
                    seconds=10,
                    is_blink=True,
                    color_on=self.yellow_blink,
                    color_off=self.all_off,
                    current_round=round,
                    phase="warning",
                    color_name="yellow",
                )
                my_list.append(five_second_warning)

        self.rounds = deque(my_list)
        self.start()

    def start(self):
        try:
            this_round = self.rounds.popleft()
            this_round.color_off()
            if this_round.is_blink:
                times_to_blink = this_round.seconds // 2
                this_round.color_on(times_to_blink)
            else:
                this_round.color_on()

            # Broadcast state to all connected WebSocket clients
            mode = "blink" if this_round.is_blink else "solid"
            self._broadcast_state(
                phase=this_round.phase,
                seconds=this_round.seconds,
                round_num=this_round.current_round,
                color=this_round.color_name,
                mode=mode,
            )

            if self.job is not None:
                self.job.remove()

            trigger = IntervalTrigger(seconds=this_round.seconds)
            self.job = self.scheduler.add_job(
                self.start, trigger=trigger, max_instances=1, coalesce=True
            )
        except IndexError:
            print("You're done!")
            self.all_off()
            self.scheduler.remove_all_jobs()
            self.job = None
            self.broadcast({
                "type": "timer",
                "remaining": 0,
                "phase": "idle",
                "round": self._total_rounds,
                "total_rounds": self._total_rounds,
            })
            self.broadcast({"type": "lights", "color": "off", "mode": "solid"})

    def stop(self):
        self.all_off()
        self.scheduler.remove_all_jobs()
        self.job = None
        self._current_phase = "idle"
        self.broadcast({
            "type": "timer",
            "remaining": 0,
            "phase": "idle",
            "round": 0,
            "total_rounds": 0,
        })
        self.broadcast({"type": "lights", "color": "off", "mode": "solid"})
        print("Goodbye!")

    def pause(self):
        if self.job is not None:
            self.job.pause()
            self.broadcast({
                "type": "timer",
                "remaining": -1,
                "phase": "paused",
                "round": self._current_round,
                "total_rounds": self._total_rounds,
            })
            print("Paused")

    def resume(self):
        if self.job is not None:
            self.job.resume()
            self.broadcast({
                "type": "timer",
                "remaining": -1,
                "phase": self._current_phase,
                "round": self._current_round,
                "total_rounds": self._total_rounds,
            })
            print("Resumed")
