import { Play, Square, Pause, RotateCcw, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "../store";
import { useStartWorkout, useStopWorkout, usePauseWorkout, useResumeWorkout, useButtonStop } from "../hooks/useApi";
import { motion } from "motion/react";

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
        /* Button mode active — show stop + set info */
        <>
          <span className="text-sm text-text-secondary font-medium px-2">
            Set {buttonMode.set} — {buttonMode.state === "resting" ? "Resting" : "Training"}
          </span>
          <Button
            variant="stop"
            size="lg"
            onClick={() => buttonStop.mutate()}
            className="glow-red"
          >
            <Square className="h-5 w-5 mr-2" />
            End Session
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
