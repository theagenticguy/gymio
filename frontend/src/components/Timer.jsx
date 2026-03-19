import { useMemo, useRef } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store";

const PHASE = {
  train: { color: "#22c55e", label: "TRAIN", neon: "neon-green" },
  rest: { color: "#ef4444", label: "REST", neon: "neon-red" },
  warning: { color: "#eab308", label: "GET READY", neon: "neon-yellow" },
  idle: { color: "#3f3f46", label: "READY", neon: "" },
};

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Timer() {
  const timer = useStore((s) => s.timer);
  const { remaining, phase, round, totalRounds } = timer;
  const cfg = PHASE[phase] || PHASE.idle;
  const active = phase !== "idle";

  // Track the duration for each phase/round so the circle timer only resets on phase changes
  const phaseKey = `${phase}-${round}`;
  const durationRef = useRef({ key: phaseKey, duration: remaining || 1 });
  if (durationRef.current.key !== phaseKey) {
    durationRef.current = { key: phaseKey, duration: remaining || 1 };
  }

  // Drive ambient background color from timer phase
  useMemo(() => {
    const rgb = {
      train: [34, 197, 94],
      rest: [239, 68, 68],
      warning: [234, 179, 8],
      idle: [60, 60, 70],
    };
    const [r, g, b] = rgb[phase] || rgb.idle;
    const el = document.documentElement;
    el.style.setProperty("--ambient-r", r);
    el.style.setProperty("--ambient-g", g);
    el.style.setProperty("--ambient-b", b);
  }, [phase]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-4">
      {/* Timer ring with ambient glow */}
      <div className="relative flex items-center justify-center overflow-hidden">
        {/* Outer radial glow — breathes when active */}
        {active && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 380,
              height: 380,
              background: `radial-gradient(circle, ${cfg.color}12 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Expanding pulse ring */}
        {active && (
          <div
            className="absolute rounded-full animate-pulse-ring"
            style={{
              width: 316,
              height: 316,
              border: `2px solid ${cfg.color}30`,
            }}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <CountdownCircleTimer
              key={phaseKey}
              isPlaying={active}
              duration={durationRef.current.duration}
              initialRemainingTime={remaining}
              colors={cfg.color}
              trailColor="#18181b"
              strokeWidth={14}
              size={300}
              strokeLinecap="round"
            >
              {({ remainingTime }) => (
                <div className="flex flex-col items-center gap-1">
                  {/* Phase label */}
                  <motion.span
                    key={cfg.label}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </motion.span>

                  {/* Big time */}
                  <span
                    className={`display-number text-[4.5rem] leading-none font-black ${cfg.neon}`}
                    style={{ color: active ? "#fafafa" : "#52525b" }}
                  >
                    {formatTime(active ? remainingTime : remaining)}
                  </span>

                  {/* Round */}
                  {active && (
                    <span className="display-number text-sm text-text-secondary mt-1.5">
                      Round {round} / {totalRounds}
                    </span>
                  )}
                </div>
              )}
            </CountdownCircleTimer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Round progress dots */}
      {active && totalRounds > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          {Array.from({ length: totalRounds }, (_, i) => {
            const done = i + 1 < round;
            const current = i + 1 === round;
            return (
              <motion.div
                key={i}
                animate={current ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: current ? 28 : 10,
                    backgroundColor: done || current ? cfg.color : "#27272a",
                    boxShadow: current ? `0 0 12px ${cfg.color}60` : "none",
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
