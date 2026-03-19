import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  Dumbbell,
  Flame,
  ListChecks,
  Clock,
  Trophy,
  Brain,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useSessionRecap, usePersonalRecords } from "../hooks/useApi";
import { useStore } from "../store";

const MUSCLE_COLORS = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Shoulders: "#f97316",
  Quads: "#22c55e",
  Hamstrings: "#16a34a",
  Glutes: "#10b981",
  Biceps: "#a855f7",
  Triceps: "#8b5cf6",
  Abs: "#eab308",
  Calves: "#06b6d4",
  Traps: "#ec4899",
  Forearms: "#6366f1",
  Lats: "#2563eb",
  "Full Body": "#f59e0b",
};

const ZONE_COLORS = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const ZONE_NAMES = {
  1: "Recovery",
  2: "Fat Burn",
  3: "Cardio",
  4: "Hard",
  5: "Peak",
};

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function useAnimatedNumber(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null || target === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Stat card with animated number                                     */
/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, label, value, suffix, color, delay }) {
  const displayValue = useAnimatedNumber(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass rounded-xl p-4 flex flex-col gap-2"
    >
      <div
        className="p-2 rounded-lg w-fit"
        style={{ backgroundColor: color + "15" }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="display-number text-2xl font-black text-foreground/90">
          {value != null ? displayValue.toLocaleString() : "--"}
          {suffix && (
            <span className="text-xs text-text-secondary ml-1">
              {suffix}
            </span>
          )}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-0.5">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  PR Celebration card                                                */
/* ------------------------------------------------------------------ */

function PrCard({ pr, delay }) {
  const delta = pr.new_e1rm - pr.previous_e1rm;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 18 }}
      className="glass rounded-xl p-4 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <Trophy className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{pr.exercise}</p>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-500">
              NEW PR
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="display-number text-xl font-black text-yellow-400">
              {pr.new_e1rm}
            </span>
            <span className="text-[11px] text-text-secondary">e1RM</span>
            {delta > 0 && (
              <span className="text-[11px] font-bold text-green-400">
                +{delta} lbs
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary mt-1">
            {pr.weight} lbs x {pr.reps} reps
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exercise breakdown                                                 */
/* ------------------------------------------------------------------ */

function ExerciseBreakdown({ exercises, delay }) {
  const maxVolume = Math.max(...exercises.map((e) => e.volume), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass rounded-xl p-5 space-y-3"
    >
      <h3 className="text-sm font-bold text-foreground/80">
        Exercise Breakdown
      </h3>
      <div className="space-y-3">
        {exercises.map((ex, i) => {
          const pct = (ex.volume / maxVolume) * 100;
          // Try to find a matching muscle color from the exercise name (fallback to blue)
          const color = "#3b82f6";
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">
                    {ex.name}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    {ex.sets} sets &middot; {ex.best_set}
                  </p>
                </div>
                <span className="display-number text-sm font-bold text-text-secondary shrink-0">
                  {ex.volume.toLocaleString()} lbs
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    delay: delay + i * 0.05,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Muscle group donut chart                                           */
/* ------------------------------------------------------------------ */

function MuscleDonut({ muscleGroups, totalVolume, delay }) {
  const data = muscleGroups.map((mg) => ({
    name: mg.name,
    value: mg.volume,
    color: MUSCLE_COLORS[mg.name] || "#6b7280",
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass rounded-xl p-5 space-y-3"
    >
      <h3 className="text-sm font-bold text-foreground/80">Muscle Groups</h3>
      <div className="flex items-center gap-4">
        <div className="w-[140px] h-[140px] relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                dataKey="value"
                stroke="none"
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="display-number text-sm font-bold text-foreground/80">
              {totalVolume >= 1000
                ? `${(totalVolume / 1000).toFixed(1)}k`
                : totalVolume}
            </span>
            <span className="text-[9px] text-text-secondary">lbs</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[11px] text-text-secondary truncate">
                {entry.name}
              </span>
              <span className="display-number text-[11px] text-text-secondary ml-auto shrink-0">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  HR Zone distribution                                               */
/* ------------------------------------------------------------------ */

function HrZoneBar({ hrHistory, delay }) {
  // Each hrHistory point = 1 second; compute time per zone
  const zoneTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  hrHistory.forEach((p) => {
    const z = p.zone || 0;
    if (z >= 1 && z <= 5) zoneTotals[z]++;
  });

  const totalSeconds = Object.values(zoneTotals).reduce((a, b) => a + b, 0);
  if (totalSeconds === 0) return null;

  const zones = Object.entries(zoneTotals)
    .filter(([, secs]) => secs > 0)
    .map(([z, secs]) => ({
      zone: Number(z),
      seconds: secs,
      pct: (secs / totalSeconds) * 100,
      color: ZONE_COLORS[z],
      label: ZONE_NAMES[z],
    }));

  function formatSeconds(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m${sec > 0 ? ` ${sec}s` : ""}` : `${sec}s`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass rounded-xl p-5 space-y-3"
    >
      <h3 className="text-sm font-bold text-foreground/80">
        HR Zone Distribution
      </h3>
      {/* Stacked horizontal bar */}
      <div className="h-5 rounded-full overflow-hidden flex">
        {zones.map((z) => (
          <motion.div
            key={z.zone}
            className="h-full"
            style={{ backgroundColor: z.color }}
            initial={{ width: 0 }}
            animate={{ width: `${z.pct}%` }}
            transition={{ delay: delay + 0.1, duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </div>
      {/* Zone labels */}
      <div className="flex gap-3 flex-wrap">
        {zones.map((z) => (
          <div key={z.zone} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: z.color }}
            />
            <span className="text-[10px] text-text-secondary">
              Z{z.zone}
            </span>
            <span className="display-number text-[10px] text-text-secondary font-semibold">
              {formatSeconds(z.seconds)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Narrative                                                       */
/* ------------------------------------------------------------------ */

function CoachNotes({ narrative, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass rounded-xl p-5 border-l-2 border-purple-500/40"
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-bold text-foreground/80">
          Coach's Notes
        </h3>
      </div>
      <p className="text-[13px] leading-relaxed text-text-secondary">
        {narrative}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function SessionRecap() {
  const user = useStore((s) => s.user);
  const hrHistory = useStore((s) => s.hrHistory);
  const userName = user.value || "";

  const { data } = useSessionRecap(userName);
  usePersonalRecords(userName);

  const session = data?.session;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Dumbbell className="h-10 w-10 text-text-tertiary mb-4" />
        <p className="text-sm text-text-secondary">
          No workout logged today
        </p>
      </div>
    );
  }

  const hasPrs = session.prs && session.prs.length > 0;
  const hasHr = hrHistory && hrHistory.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Session Recap</h2>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {session.date} &middot; {session.duration_min} min
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat counters — 4 card grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Dumbbell}
          label="Total Sets"
          value={session.total_sets}
          color="#22c55e"
          delay={0.05}
        />
        <StatCard
          icon={Flame}
          label="Volume"
          value={session.total_volume}
          suffix="lbs"
          color="#f97316"
          delay={0.1}
        />
        <StatCard
          icon={ListChecks}
          label="Exercises"
          value={session.total_exercises}
          color="#3b82f6"
          delay={0.15}
        />
        <StatCard
          icon={Clock}
          label="Duration"
          value={session.duration_min}
          suffix="min"
          color="#a855f7"
          delay={0.2}
        />
      </div>

      {/* PR Celebrations */}
      {hasPrs && (
        <div className="space-y-3">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm font-bold text-yellow-500/80 flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" /> Personal Records
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {session.prs.map((pr, i) => (
              <PrCard key={i} pr={pr} delay={0.3 + i * 0.08} />
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout for breakdown + donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exercise Breakdown */}
        {session.exercises && session.exercises.length > 0 && (
          <ExerciseBreakdown
            exercises={session.exercises}
            delay={hasPrs ? 0.45 : 0.3}
          />
        )}

        {/* Muscle Group Donut */}
        {session.muscle_groups && session.muscle_groups.length > 0 && (
          <MuscleDonut
            muscleGroups={session.muscle_groups}
            totalVolume={session.total_volume}
            delay={hasPrs ? 0.5 : 0.35}
          />
        )}
      </div>

      {/* HR Zone Distribution */}
      {hasHr && (
        <HrZoneBar hrHistory={hrHistory} delay={hasPrs ? 0.55 : 0.4} />
      )}

      {/* AI Narrative */}
      {session.narrative && (
        <CoachNotes
          narrative={session.narrative}
          delay={hasPrs ? 0.6 : 0.45}
        />
      )}
    </div>
  );
}
