import { Play, Square, Pause, RotateCcw, Settings, Minus, Plus, Timer as TimerIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "../store";
import { useStartWorkout, useStopWorkout, usePauseWorkout, useResumeWorkout, useButtonStop, useButtonDuration, useSetButtonDuration } from "../hooks/useApi";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";

function RestDurationPicker() {
  const { data } = useButtonDuration();
  const setDuration = useSetButtonDuration();
  const queryClient = useQueryClient();
  const current = data?.duration || 60;

  const adjust = (delta) => {
    const next = Math.max(30, Math.min(300, current + delta));
    setDuration.mutate(next, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["buttonDuration"] }),
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <TimerIcon className="h-3.5 w-3.5 text-text-tertiary" />
      <button
        onClick={() => adjust(-15)}
        className="h-7 w-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-text-secondary"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-sm font-mono text-text-secondary w-8 text-center">{current}s</span>
      <button
        onClick={() => adjust(15)}
        className="h-7 w-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-text-secondary"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Controls({ onSetup }) {
  const workout = useStore((s) => s.workout);
  const timer = useStore((s) => s.timer);
  const buttonMode = useStore((s) => s.buttonMode);
  const startWorkout = useStartWorkout();
  const stopWorkout = useStopWorkout();
  const pauseWorkout = usePauseWorkout();
  const resumeWorkout = useResumeWorkout();
  const buttonStop = useButtonStop();

  const isActive = timer.phase !== "idle";
  const isButtonMode = !isActive && buttonMode.active;

  return (
    <motion.div
      layout
      className="flex items-center gap-3"
    >
      {isButtonMode ? (
        /* Button mode active — rest duration picker + stop */
        <>
          <RestDurationPicker />
          <Button
            variant="stop"
            size="lg"
            onClick={() => buttonStop.mutate()}
            className="glow-red"
          >
            <Square className="h-5 w-5 mr-2" />
            End
          </Button>
        </>
      ) : !isActive ? (
        <>
          <Button
            variant="ghost"
            size="lg"
            onClick={onSetup}
            className="text-text-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5 mr-2" />
            Setup
          </Button>
          <Button
            variant="gym"
            size="xl"
            onClick={() => startWorkout.mutate(workout)}
            className="glow-green"
          >
            <Play className="h-6 w-6 mr-2" />
            Start
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="lg"
            className="border-white/10 hover:bg-white/5"
            onClick={() => {
              if (timer.phase === "paused") resumeWorkout.mutate();
              else pauseWorkout.mutate();
            }}
          >
            {timer.phase === "paused" ? (
              <>
                <RotateCcw className="h-5 w-5 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="stop"
            size="xl"
            onClick={() => stopWorkout.mutate()}
            className="glow-red"
          >
            <Square className="h-6 w-6 mr-2" />
            Stop
          </Button>
        </>
      )}
    </motion.div>
  );
}
