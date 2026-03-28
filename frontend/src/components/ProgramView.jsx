import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarPlus,
  Sparkles,
  Brain,
  Loader2,
  Trash2,
  Check,
  Clock,
  Dumbbell,
  Minus,
  Plus,
  ChevronDown,
  TrendingUp,
  Upload,
  Zap,
  Target,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { useStore } from "../store";
import { useQueryClient } from "@tanstack/react-query";
import {
  useActiveProgram,
  useGenerateProgram,
  useProgramCompliance,
  useDeactivateProgram,
  useImportProgram,
  useSwapExercise,
} from "../hooks/useApi";

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
  "Upper back": "#60a5fa",
  "Upper chest": "#f87171",
  "Mid-back": "#3b82f6",
  "Posterior chain": "#16a34a",
  "Side delts": "#f97316",
  "Rear delts": "#fb923c",
  "Anti-rotation": "#eab308",
  "Brachialis": "#a855f7",
  "Triceps long head": "#8b5cf6",
};

function getMuscleColor(muscle) {
  if (!muscle) return "#666";
  // Handle compound muscle groups like "Chest/Triceps"
  const first = muscle.split("/")[0].trim();
  return MUSCLE_COLORS[first] || "#666";
}

const GOAL_OPTIONS = [
  { value: "hypertrophy", label: "Hypertrophy", color: "text-gym-yellow" },
  { value: "strength", label: "Strength", color: "text-gym-green" },
  { value: "conditioning", label: "Conditioning", color: "text-blue-400" },
];

const GOAL_BADGE_COLORS = {
  hypertrophy: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  strength: { bg: "bg-green-500/10", text: "text-green-400" },
  conditioning: { bg: "bg-blue-500/10", text: "text-blue-400" },
  "Power + Hypertrophy (Upper/Lower)": { bg: "bg-purple-500/10", text: "text-purple-400" },
  powerbuilding: { bg: "bg-purple-500/10", text: "text-purple-400" },
};

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getDayAbbr() {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
}

function computeWeight(baseWeight, progression, weekIndex) {
  if (!baseWeight || !progression || weekIndex === 0) return baseWeight;
  const match = progression.match(/([+-]?\d+(?:\.\d+)?)\s*lbs?\s*\/\s*week/i);
  if (!match) return baseWeight;
  const increment = parseFloat(match[1]);
  return baseWeight + increment * weekIndex;
}

function complianceColor(pct) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

function rpeColor(rpeStr) {
  if (!rpeStr) return "#22c55e";
  const rpe = typeof rpeStr === "string" ? parseFloat(rpeStr.split("\u2013")[1] || rpeStr.split("-")[1] || rpeStr) : rpeStr;
  if (rpe >= 9) return "#ef4444";
  if (rpe >= 8) return "#eab308";
  return "#22c55e";
}

function focusIcon(focus) {
  if (!focus) return Dumbbell;
  const f = focus.toLowerCase();
  if (f.includes("power")) return Zap;
  if (f.includes("hypertrophy") || f.includes("pump")) return Target;
  return Dumbbell;
}

function focusAccent(focus) {
  if (!focus) return "#a855f7";
  const f = focus.toLowerCase();
  if (f.includes("power")) return "#ef4444";
  if (f.includes("hypertrophy")) return "#22c55e";
  if (f.includes("pump") || f.includes("flex")) return "#06b6d4";
  return "#a855f7";
}

// ---------- Empty State: Generate / Import Form ----------
function GenerateForm({ userName }) {
  const queryClient = useQueryClient();
  const generate = useGenerateProgram();
  const importProgram = useImportProgram();
  const [mode, setMode] = useState("import"); // "generate" or "import"
  const [goal, setGoal] = useState("hypertrophy");
  const [days, setDays] = useState(4);
  const [weeks, setWeeks] = useState(4);
  const [notes, setNotes] = useState("");

  const handleGenerate = () => {
    generate.mutate(
      { user: userName, goal, days_per_week: days, weeks, notes: notes || undefined },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activeProgram"] }) }
    );
  };

  const handleImportPowerbuilding = () => {
    // Import with null payload — backend loads the default powerbuilding template
    importProgram.mutate(
      { user: userName },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activeProgram"] }) }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 space-y-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <CalendarPlus className="h-6 w-6 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold">No Active Program</h2>
        <p className="text-[13px] text-text-secondary text-center max-w-sm leading-relaxed">
          Import your powerbuilding program or generate one with AI
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "import" ? "outline" : "ghost"}
          size="sm"
          onClick={() => setMode("import")}
          className={mode === "import" ? "border-purple-500/30 flex-1" : "opacity-50 flex-1"}
        >
          <Upload className="h-4 w-4 mr-1.5 text-purple-400" />
          Import
        </Button>
        <Button
          variant={mode === "generate" ? "outline" : "ghost"}
          size="sm"
          onClick={() => setMode("generate")}
          className={mode === "generate" ? "border-white/20 flex-1" : "opacity-50 flex-1"}
        >
          <Brain className="h-4 w-4 mr-1.5 text-blue-400" />
          AI Generate
        </Button>
      </div>

      {mode === "import" ? (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">8-Week Powerbuilding Program</p>
                <p className="text-[11px] text-text-secondary">
                  5 days/week &middot; Upper/Lower Power + Hypertrophy &middot; Deload Week 4
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Fri: Upper Power", "Sat: Lower Power", "Sun: Upper Hyp", "Mon: Lower Hyp", "Tue: Pump"].map((d) => (
                <span key={d} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-text-secondary font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={handleImportPowerbuilding}
            disabled={importProgram.isPending}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11"
          >
            {importProgram.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Activate Powerbuilding Program</>
            )}
          </Button>

          {importProgram.isError && (
            <p className="text-sm text-gym-red text-center">Import failed: {importProgram.error?.message}</p>
          )}
        </div>
      ) : (
        <>
          {/* Goal Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={goal === opt.value ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => setGoal(opt.value)}
                  className={goal === opt.value ? "border-white/20" : "opacity-50"}
                >
                  <Sparkles className={`h-4 w-4 mr-1.5 ${opt.color}`} />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Days per week + Weeks */}
          <div className="flex gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Days / Week</label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={days <= 2} onClick={() => setDays((d) => Math.max(2, d - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-8 text-center">{days}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={days >= 6} onClick={() => setDays((d) => Math.min(6, d + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Weeks</label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={weeks <= 2} onClick={() => setWeeks((w) => Math.max(2, w - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-8 text-center">{weeks}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={weeks >= 8} onClick={() => setWeeks((w) => Math.min(8, w + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any injuries, constraints, preferences..."
              rows={3}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
            />
          </div>

          <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11">
            {generate.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Brain className="h-4 w-4 mr-2" /> Generate Program</>
            )}
          </Button>

          {generate.isError && <p className="text-sm text-gym-red text-center">Error: {generate.error?.message}</p>}
        </>
      )}
    </motion.div>
  );
}

// ---------- Compliance Bar ----------
function ComplianceBar({ programId }) {
  const { data: compliance } = useProgramCompliance(programId);
  if (!compliance) return null;

  const pct = compliance.overall_compliance_pct ?? 0;
  const color = complianceColor(pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-xl p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Compliance</span>
        <span className="text-sm font-bold" style={{ color }}>{pct}% compliant</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

// ---------- Week Timeline ----------
function WeekTimeline({ weeks, deloadWeek, selectedWeek, onSelectWeek, loadPcts, complianceData }) {
  const weekNumbers = Array.from({ length: weeks }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {weekNumbers.map((wk) => {
        const weekData = complianceData?.weeks?.find((w) => w.week === wk);
        const isCurrent = weekData?.is_current;
        const isSelected = selectedWeek === wk;
        const isDeload = wk === deloadWeek;
        const isCompleted = weekData && !weekData.is_current && weekData.compliance_pct > 0;
        const strengthPct = loadPcts?.strength?.[wk - 1];

        return (
          <button
            key={wk}
            aria-label={`Week ${wk}${isDeload ? " (deload)" : ""}${isCurrent ? " (current)" : ""}`}
            onClick={() => onSelectWeek(wk)}
            className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
              isSelected
                ? "bg-white/[0.08] border border-white/[0.12]"
                : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
            }`}
          >
            {isCurrent && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
            )}
            <span className={isSelected ? "text-foreground" : "text-text-secondary"}>
              {isCompleted && <Check className="h-3 w-3 inline mr-1 text-green-400" />}
              W{wk}
            </span>
            {isDeload ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400/80 font-bold uppercase tracking-wider">
                Deload
              </span>
            ) : strengthPct ? (
              <span className="text-[9px] text-text-tertiary font-mono">
                {Math.round(strengthPct * 100)}%
              </span>
            ) : null}
          </button>
        );
      })}
    </motion.div>
  );
}

// ---------- Day Tabs (for imported powerbuilding programs) ----------
function DayTabs({ template, selectedDay, onSelectDay }) {
  const todayAbbr = getDayAbbr();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
    >
      {template.map((day) => {
        const abbr = day.day_abbr || day.day_of_week.slice(0, 3);
        const isToday = abbr === todayAbbr;
        const isSelected = selectedDay === abbr;
        const accent = focusAccent(day.focus);
        const FocusIcon = focusIcon(day.focus);

        return (
          <button
            key={abbr}
            aria-label={`${day.day_of_week} — ${day.focus}${isToday ? " (today)" : ""}`}
            onClick={() => onSelectDay(abbr)}
            className={`relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all shrink-0 min-w-[72px] ${
              isSelected
                ? "glass-strong"
                : "bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <FocusIcon className="h-4 w-4" style={{ color: isSelected ? accent : undefined, opacity: isSelected ? 1 : 0.4 }} />
            <span className={`text-xs font-bold ${isSelected ? "text-foreground" : "text-text-secondary"}`}>
              {abbr}
            </span>
            {isToday && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full"
                style={{ backgroundColor: accent + "20", color: accent }}
              >
                Today
              </span>
            )}
            <span className={`text-[9px] leading-tight text-center ${isSelected ? "text-text-secondary" : "text-text-tertiary"}`}>
              {day.focus?.replace(" / Pump", "").replace("Delts + Arms + Back Pump (flex)", "Arms/Pump")}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

// ---------- Exercise Row (Enhanced) ----------
function ExerciseRow({ exercise, weekIndex, index, programId, dayAbbr, isImported }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const swapExercise = useSwapExercise();
  const color = getMuscleColor(exercise.muscle_group);
  const currentWeight = computeWeight(exercise.week_1_weight, exercise.progression, weekIndex);
  const rpeCol = rpeColor(exercise.rpe_target);
  const hasSwaps = exercise.swap_options?.length > 0;

  const handleSwap = (newExercise) => {
    swapExercise.mutate(
      { programId, dayAbbr, slot: exercise.slot, newExercise },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activeProgram"] }) }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl glass overflow-hidden"
    >
      <button
        aria-expanded={expanded}
        aria-label={`${exercise.exercise} — ${exercise.sets} sets of ${exercise.reps}`}
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        {/* Slot badge */}
        {exercise.slot ? (
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[10px] font-black tracking-wider shrink-0"
            style={{ backgroundColor: color + "15", color }}
          >
            {exercise.slot}
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0"
            style={{ backgroundColor: color + "15", color }}
          >
            {index + 1}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{exercise.exercise}</p>
          <p className="text-[11px] text-text-secondary mt-0.5 truncate">
            {exercise.pattern || exercise.muscle_group}
            {exercise.equipment && <span className="text-text-tertiary"> &middot; {exercise.equipment}</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="text-right">
            <span className="text-sm font-bold tabular-nums">
              {exercise.sets}<span className="text-text-secondary mx-0.5">&times;</span>{exercise.reps}
            </span>
            {currentWeight > 0 && (
              <p className="text-[11px] text-text-secondary">{currentWeight} lbs</p>
            )}
          </div>
          {exercise.rpe_target && (
            <div
              className="px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{ backgroundColor: rpeCol + "15", color: rpeCol }}
            >
              RPE {exercise.rpe_target}
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/[0.04]">
              <div className="flex flex-wrap gap-2 pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] text-text-secondary">
                  <Clock className="h-3 w-3" /> {exercise.rest_seconds}s rest
                </span>
                {exercise.progression && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-purple-500/[0.08] text-purple-400/80">
                    <TrendingUp className="h-3 w-3" /> {exercise.progression}
                  </span>
                )}
              </div>

              {exercise.notes && (
                <p className="text-[13px] leading-relaxed text-text-secondary pl-1 border-l-2 border-white/[0.06] ml-0.5">
                  {exercise.notes}
                </p>
              )}

              {/* Exercise Swap */}
              {hasSwaps && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Swap Exercise
                  </span>
                  <Select
                    value={exercise.exercise}
                    onValueChange={handleSwap}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white/[0.02] border-white/[0.06]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={exercise.planned_exercise || exercise.exercise}>
                        {exercise.planned_exercise || exercise.exercise} (default)
                      </SelectItem>
                      {exercise.swap_options.map((swap) => (
                        <SelectItem key={swap} value={swap}>{swap}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Day Detail View ----------
function DayDetail({ day, weekIndex, programId, isImported, isDeloadWeek }) {
  const dayAbbr = day.day_abbr || day.day_of_week.slice(0, 3);
  const accent = focusAccent(day.focus);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* Deload banner */}
      {isDeloadWeek && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/[0.06] border border-yellow-500/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400/80">Deload Week</span>
          <span className="text-[11px] text-yellow-400/60">Reduced intensity, focus on recovery</span>
        </div>
      )}

      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + "15" }}>
            {(() => { const Icon = focusIcon(day.focus); return <Icon className="h-4 w-4" style={{ color: accent }} />; })()}
          </div>
          <div>
            <h3 className="font-bold text-base">{day.focus}</h3>
            <p className="text-[11px] text-text-secondary">{day.day_of_week}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {day.volume_sets && (
            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
              <Dumbbell className="h-3 w-3" /> {day.volume_sets} sets
            </span>
          )}
          {day.estimated_duration_min && (
            <span className="flex items-center gap-1 text-[11px] text-text-secondary">
              <Clock className="h-3 w-3" /> ~{day.estimated_duration_min}m
            </span>
          )}
        </div>
      </div>

      {/* Muscle chips */}
      {day.target_muscles?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {day.target_muscles.map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                backgroundColor: getMuscleColor(m) + "12",
                color: getMuscleColor(m) + "cc",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Exercises — grouped by superset pair (A1/A2, B1/B2, etc.) */}
      <div className="space-y-1.5">
        {(() => {
          const exercises = day.exercises || [];
          const groups = [];
          let i = 0;
          while (i < exercises.length) {
            const ex = exercises[i];
            const slotLetter = ex.slot?.[0];
            // Collect all consecutive exercises with the same slot letter
            if (slotLetter) {
              const groupItems = [ex];
              while (i + groupItems.length < exercises.length && exercises[i + groupItems.length].slot?.[0] === slotLetter) {
                groupItems.push(exercises[i + groupItems.length]);
              }
              if (groupItems.length > 1) {
                groups.push({ type: "superset", items: groupItems, startIndex: i });
                i += groupItems.length;
              } else {
                groups.push({ type: "single", items: [ex], startIndex: i });
                i += 1;
              }
            } else {
              groups.push({ type: "single", items: [ex], startIndex: i });
              i += 1;
            }
          }
          return groups.map((group) => {
            if (group.type === "superset") {
              return (
                <div key={group.items[0].slot} className="rounded-xl border border-white/[0.04] overflow-hidden">
                  <div className="px-3 py-1.5 bg-white/[0.015] flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
                      {group.items.length > 2 ? "Circuit" : "Superset"} {group.items[0].slot[0]}
                    </span>
                  </div>
                  <div className="space-y-0">
                    {group.items.map((ex, j) => (
                      <ExerciseRow
                        key={ex.slot}
                        exercise={ex}
                        weekIndex={weekIndex}
                        index={group.startIndex + j}
                        programId={programId}
                        dayAbbr={dayAbbr}
                        isImported={isImported}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return group.items.map((ex, j) => (
              <ExerciseRow
                key={ex.slot || group.startIndex + j}
                exercise={ex}
                weekIndex={weekIndex}
                index={group.startIndex + j}
                programId={programId}
                dayAbbr={dayAbbr}
                isImported={isImported}
              />
            ));
          });
        })()}
      </div>
    </motion.div>
  );
}

// ---------- Rest Day Card ----------
function RestDayCard({ dayName, cardIndex }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + cardIndex * 0.06 }}
      className="glass rounded-2xl p-5 opacity-40"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text-secondary">{dayName}</span>
        <span className="text-[11px] text-text-secondary">Rest</span>
      </div>
    </motion.div>
  );
}

// ---------- Progression Rules ----------
function ProgressionRules({ rules }) {
  if (!rules?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-xl p-4 space-y-2.5"
    >
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Progression Rules</h4>
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div key={i} className="text-[13px] leading-relaxed">
            <span className="font-semibold text-foreground/80">{rule.category}: </span>
            <span className="text-text-secondary">{rule.rule}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------- Volume Targets ----------
function VolumeTargets({ targets }) {
  if (!targets || Object.keys(targets).length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass rounded-xl p-4 space-y-2.5"
    >
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">Weekly Volume Targets</h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(targets).map(([muscle, sets]) => {
          const color = getMuscleColor(muscle);
          return (
            <div key={muscle} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-text-secondary">{muscle}</span>
              <span className="font-bold text-text-secondary">{sets}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------- Active Program View (Unified for AI + Imported) ----------
function ActiveProgramView({ data }) {
  const queryClient = useQueryClient();
  const deactivate = useDeactivateProgram();
  const { data: compliance } = useProgramCompliance(data.id);

  const program = data.program;
  const totalWeeks = data.weeks || program.weeks || 4;
  const template = program.weekly_template || [];
  const isImported = program.source === "excel_import";
  const loadPcts = program.load_percentages;

  // For imported programs, use day tabs; for AI, show full week
  const hasDayTabs = isImported && template.length > 1 && template[0]?.day_abbr;

  // Default selected week from compliance, or week 1
  const currentWeek = compliance?.weeks?.find((w) => w.is_current)?.week || 1;
  const [selectedWeek, setSelectedWeek] = useState(null);
  const activeWeek = selectedWeek ?? currentWeek;
  const weekIndex = activeWeek - 1;

  // Default selected day to today if it's a training day, else first day
  const todayAbbr = getDayAbbr();
  const trainingDayAbbrs = template.map((d) => d.day_abbr || d.day_of_week.slice(0, 3));
  const defaultDay = trainingDayAbbrs.includes(todayAbbr) ? todayAbbr : trainingDayAbbrs[0];
  const [selectedDay, setSelectedDay] = useState(null);
  const activeDay = selectedDay ?? defaultDay;

  const selectedDayData = useMemo(() => {
    if (!hasDayTabs) return null;
    return template.find((d) => (d.day_abbr || d.day_of_week.slice(0, 3)) === activeDay);
  }, [hasDayTabs, template, activeDay]);

  const trainingDays = new Set(template.map((d) => d.day_of_week));
  const goalStyle = GOAL_BADGE_COLORS[data.goal] || GOAL_BADGE_COLORS.powerbuilding;

  const handleDeactivate = () => {
    if (!window.confirm("End this program? This cannot be undone.")) return;
    deactivate.mutate(data.id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activeProgram"] }),
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Program Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-lg font-bold leading-tight">{program.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {program.split_type && (
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] font-bold uppercase tracking-wider text-text-secondary">
                  {program.split_type}
                </span>
              )}
              <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${goalStyle.bg} ${goalStyle.text}`}>
                {isImported ? "Powerbuilding" : data.goal?.replace("_", " ")}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="End program"
            onClick={handleDeactivate}
            disabled={deactivate.isPending}
            className="text-text-secondary hover:text-red-400 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {/* Current week quick stats */}
        {isImported && loadPcts && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-text-secondary">
              Week {activeWeek}
              {activeWeek === program.deload_week ? " (Deload)" : ""}
            </span>
            <span className="text-[11px] font-mono font-bold text-foreground/70">
              {Math.round((loadPcts.strength?.[weekIndex] || 0) * 100)}% strength
            </span>
            <span className="text-[11px] font-mono font-bold text-foreground/70">
              {Math.round((loadPcts.hypertrophy?.[weekIndex] || 0) * 100)}% hypertrophy
            </span>
          </div>
        )}
      </motion.div>

      {/* Compliance */}
      <ComplianceBar programId={data.id} />

      {/* Week Timeline */}
      <WeekTimeline
        weeks={totalWeeks}
        deloadWeek={program.deload_week}
        selectedWeek={activeWeek}
        onSelectWeek={setSelectedWeek}
        loadPcts={loadPcts}
        complianceData={compliance}
      />

      {/* Day Tabs (imported programs) */}
      {hasDayTabs && (
        <DayTabs
          template={template}
          selectedDay={activeDay}
          onSelectDay={setSelectedDay}
        />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {hasDayTabs && selectedDayData ? (
          <DayDetail
            key={`${activeWeek}-${activeDay}`}
            day={selectedDayData}
            weekIndex={weekIndex}
            programId={data.id}
            isImported={isImported}
            isDeloadWeek={activeWeek === program.deload_week}
          />
        ) : (
          <motion.div
            key={activeWeek}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {ALL_DAYS.map((dayName, i) => {
              const dayData = template.find((d) => d.day_of_week === dayName);
              if (dayData) {
                return (
                  <DayDetail
                    key={dayName}
                    day={dayData}
                    weekIndex={weekIndex}
                    programId={data.id}
                    isImported={isImported}
                    isDeloadWeek={activeWeek === program.deload_week}
                  />
                );
              }
              if (trainingDays.size < 7) {
                return <RestDayCard key={dayName} dayName={dayName} cardIndex={i} />;
              }
              return null;
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progression Rules */}
      <ProgressionRules rules={program.progression_rules} />

      {/* Volume Targets */}
      <VolumeTargets targets={program.weekly_volume_targets} />

      {/* Deload strategy */}
      {program.deload_strategy && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-4 text-[13px] leading-relaxed"
        >
          <span className="text-yellow-400/80 font-semibold">Deload (Week {program.deload_week}): </span>
          <span className="text-text-secondary">{program.deload_strategy}</span>
        </motion.div>
      )}
    </div>
  );
}

// ---------- Main Export ----------
export function ProgramView() {
  const user = useStore((s) => s.user);
  const userName = user.value || "laith";
  const { data, isLoading } = useActiveProgram(userName);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <p className="text-sm text-text-secondary">Loading program...</p>
      </div>
    );
  }

  const hasProgram = data?.program;

  return (
    <AnimatePresence mode="wait">
      {hasProgram ? (
        <ActiveProgramView key="active" data={data} />
      ) : (
        <GenerateForm key="generate" userName={userName} />
      )}
    </AnimatePresence>
  );
}
