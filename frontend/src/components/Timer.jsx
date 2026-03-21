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

// Responsive sizes: small on mobile, big on TV wall
function useTimerSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isWall = vw >= 1024;
  const circleSize = isWall ? 480 : Math.min(300, vw - 112);
  const maxGlow = Math.floor((vw - 16) / 1.06);
  const glowSize = Math.min(Math.round(circleSize * 1.27), maxGlow);
  const maxPulse = Math.floor((vw - 16) / 1.5);
  const pulseSize = Math.min(Math.round(circleSize * 1.05), maxPulse);
  const strokeWidth = isWall ? 22 : circleSize >= 280 ? 14 : 10;
  return { circleSize, glowSize, pulseSize, strokeWidth };
}

export function Timer() {
  const timer = useStore((s) => s.timer);
  const { remaining, duration, phase, round, totalRounds } = timer;
  const cfg = PHASE[phase] || PHASE.idle;
  const active = phase !== "idle";
  const { circleSize, glowSize, pulseSize, strokeWidth } = useTimerSize();

  // Capture duration + initialRemaining once per phase/round so CountdownCircleTimer
  // doesn't reset on every WS tick (remaining changes at 1Hz)
  const phaseKey = `${phase}-${round}`;
  const phaseDuration = duration || remaining || 1;
  const phaseRef = useRef({ key: phaseKey, duration: phaseDuration, initial: remaining });
  if (phaseRef.current.key !== phaseKey) {
    phaseRef.current = { key: phaseKey, duration: phaseDuration, initial: remaining };
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
      <div className="relative flex items-center justify-center">
        {/* Outer radial glow — breathes when active */}
        {active && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: glowSize,
              height: glowSize,
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
              width: pulseSize,
              height: pulseSize,
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
              duration={phaseRef.current.duration}
              initialRemainingTime={phaseRef.current.initial}
              colors={cfg.color}
              trailColor="#18181b"
              strokeWidth={strokeWidth}
              size={circleSize}
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
                    <span className="display-number text-sm text-foreground mt-1.5">
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
