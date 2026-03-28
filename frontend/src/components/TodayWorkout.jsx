import { Clock, Dumbbell, Zap, Target } from "lucide-react";
import { useStore } from "../store";
import { useActiveProgram } from "../hooks/useApi";

const MUSCLE_COLORS = {
  Chest: "#ef4444", Back: "#3b82f6", Shoulders: "#f97316",
  Quads: "#22c55e", Hamstrings: "#16a34a", Glutes: "#10b981",
  Biceps: "#a855f7", Triceps: "#8b5cf6", Abs: "#eab308",
  Calves: "#06b6d4", Traps: "#ec4899", Forearms: "#6366f1",
  Lats: "#2563eb", "Full Body": "#f59e0b", "Upper back": "#60a5fa",
  "Upper chest": "#f87171", "Mid-back": "#3b82f6",
  "Posterior chain": "#16a34a", "Side delts": "#f97316",
  "Rear delts": "#fb923c", "Brachialis": "#a855f7",
  "Triceps long head": "#8b5cf6", "Anti-rotation": "#eab308",
};

function getMuscleColor(muscle) {
  if (!muscle) return "#666";
  return MUSCLE_COLORS[muscle.split("/")[0].trim()] || "#666";
}

function rpeColor(rpeStr) {
  if (!rpeStr) return "#22c55e";
  const rpe = typeof rpeStr === "string"
    ? parseFloat(rpeStr.split("\u2013")[1] || rpeStr.split("-")[1] || rpeStr)
    : rpeStr;
  if (rpe >= 9) return "#ef4444";
  if (rpe >= 8) return "#eab308";
  return "#22c55e";
}

function focusAccent(focus) {
  if (!focus) return "#a855f7";
  const f = focus.toLowerCase();
  if (f.includes("power")) return "#ef4444";
  if (f.includes("hypertrophy")) return "#22c55e";
  if (f.includes("pump") || f.includes("flex")) return "#06b6d4";
  return "#a855f7";
}

function focusIcon(focus) {
  if (!focus) return Dumbbell;
  const f = focus.toLowerCase();
  if (f.includes("power")) return Zap;
  if (f.includes("hypertrophy") || f.includes("pump")) return Target;
  return Dumbbell;
}

function getDayAbbr() {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
}

export function TodayWorkout() {
  const user = useStore((s) => s.user);
  const userName = user.value || "laith";
  const { data, isLoading } = useActiveProgram(userName);

  if (isLoading || !data?.program) return null;

  const program = data.program;
  const template = program.weekly_template || [];
  const todayAbbr = getDayAbbr();
  const todayData = template.find(
    (d) => (d.day_abbr || d.day_of_week.slice(0, 3)) === todayAbbr
  );

  if (!todayData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl font-bold text-foreground">Rest Day</p>
        <p className="text-base text-foreground mt-1">Recovery & Mobility</p>
      </div>
    );
  }

  const accent = focusAccent(todayData.focus);
  const FocusIcon = focusIcon(todayData.focus);

  return (
    <div className="flex flex-col h-full p-5 overflow-auto">
      {/* Header — all text-foreground for TV readability */}
      <div className="space-y-1.5 mb-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accent + "20" }}
          >
            <FocusIcon className="h-4.5 w-4.5" style={{ color: accent }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground leading-tight">{todayData.focus}</h2>
            <p className="text-xs text-foreground">{todayData.day_of_week}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground">
          {todayData.volume_sets != null && (
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" /> {todayData.volume_sets} sets
            </span>
          )}
          {todayData.estimated_duration_min != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{todayData.estimated_duration_min}m
            </span>
          )}
        </div>
      </div>

      {/* Exercise list — TV-optimized: all text-foreground per wall-view design rule */}
      <div className="space-y-0.5 flex-1">
        {todayData.exercises?.map((ex, i) => {
          const color = getMuscleColor(ex.muscle_group);
          const rpeCol = rpeColor(ex.rpe_target);
          return (
            <div
              key={ex.slot || i}
              className="flex items-center gap-2.5 py-2 px-2 rounded-lg"
            >
              {/* Slot badge */}
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-black tracking-wide shrink-0"
                style={{ backgroundColor: color + "18", color }}
              >
                {ex.slot || i + 1}
              </div>

              {/* Exercise name */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                  {ex.exercise}
                </p>
              </div>

              {/* Sets x Reps + RPE */}
              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="text-[13px] font-bold text-foreground tabular-nums">
                  {ex.sets}<span className="text-foreground mx-px">&times;</span>{ex.reps}
                </span>
                {ex.rpe_target && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: rpeCol + "15", color: rpeCol }}
                  >
                    {ex.rpe_target}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
