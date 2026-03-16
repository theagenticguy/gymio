from pydantic import BaseModel
from collections.abc import Callable


class Timer(BaseModel):
    seconds: int
    is_blink: bool
    color_on: Callable
    color_off: Callable
    current_round: int
    phase: str = "train"
    color_name: str = "green"
