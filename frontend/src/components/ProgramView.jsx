import { useState } from "react";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "../store";
import { useQueryClient } from "@tanstack/react-query";
import {
  useActiveProgram,
  useGenerateProgram,
  useProgramCompliance,
  useDeactivateProgram,
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
};

const GOAL_OPTIONS = [
  { value: "hypertrophy", label: "Hypertrophy", color: "text-gym-yellow" },
  { value: "strength", label: "Strength", color: "text-gym-green" },
  { value: "conditioning", label: "Conditioning", color: "text-blue-400" },
];

const GOAL_BADGE_COLORS = {
  hypertrophy: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  strength: { bg: "bg-green-500/10", text: "text-green-400" },
  conditioning: { bg: "bg-blue-500/10", text: "text-blue-400" },
};

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

// ---------- Empty State: Generate Form ----------
function GenerateForm({ userName }) {
  const queryClient = useQueryClient();
  const generate = useGenerateProgram();
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
        <p className="text-[13px] text-muted-foreground/60 text-center max-w-sm leading-relaxed">
          Generate an AI-powered training program tailored to your goals and training history
        </p>
      </div>

      {/* Goal Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">Goal</label>
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
          <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
            Days / Week
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fewer days"
              className="h-8 w-8"
              disabled={days <= 2}
              onClick={() => setDays((d) => Math.max(2, d - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold w-8 text-center">{days}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More days"
              className="h-8 w-8"
              disabled={days >= 6}
              onClick={() => setDays((d) => Math.min(6, d + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">Weeks</label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fewer weeks"
              className="h-8 w-8"
              disabled={weeks <= 2}
              onClick={() => setWeeks((w) => Math.max(2, w - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold w-8 text-center">{weeks}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More weeks"
              className="h-8 w-8"
              disabled={weeks >= 8}
              onClick={() => setWeeks((w) => Math.min(8, w + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any injuries, constraints, preferences..."
          rows={3}
          className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generate.isPending}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11"
      >
        {generate.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 mr-2" />
            Generate Program
          </>
        )}
      </Button>

      {generate.isError && (
        <p className="text-sm text-gym-red text-center">Error: {generate.error?.message}</p>
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
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
          Compliance
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {pct}% compliant
        </span>
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
function WeekTimeline({ weeks, deloadWeek, selectedWeek, onSelectWeek, complianceData }) {
  const weekNumbers = Array.from({ length: weeks }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {weekNumbers.map((wk) => {
        const weekData = complianceData?.weeks?.find((w) => w.week === wk);
        const isCurrent = weekData?.is_current;
        const isSelected = selectedWeek === wk;
        const isDeload = wk === deloadWeek;
        const isCompleted = weekData && !weekData.is_current && weekData.compliance_pct > 0;

        return (
          <button
            key={wk}
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
            <span className={isSelected ? "text-foreground" : "text-muted-foreground/60"}>
              {isCompleted && <Check className="h-3 w-3 inline mr-1 text-green-400" />}
              Week {wk}
            </span>
            {isDeload && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400/80 font-bold uppercase tracking-wider">
                Deload
              </span>
            )}
          </button>
        );
      })}
    </motion.div>
  );
}

// ---------- Exercise Row ----------
function ExerciseRow({ exercise, weekIndex, index }) {
  const [expanded, setExpanded] = useState(false);
  const color = MUSCLE_COLORS[exercise.muscle_group] || "#666";
  const currentWeight = computeWeight(exercise.week_1_weight, exercise.progression, weekIndex);
  const rpeColor =
    exercise.rpe_target >= 9 ? "#ef4444" : exercise.rpe_target >= 8 ? "#eab308" : "#22c55e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl glass overflow-hidden"
    >
      <button
        aria-label={`${exercise.exercise} — ${exercise.sets}x${exercise.reps}, click to ${expanded ? "collapse" : "expand"}`}
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0"
          style={{ backgroundColor: color + "15", color }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{exercise.exercise}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {exercise.muscle_group}
            {exercise.equipment && (
              <span className="text-muted-foreground/70"> · {exercise.equipment}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="text-right">
            <span className="text-sm font-bold">
              {exercise.sets}
              <span className="text-muted-foreground/60 mx-0.5">&times;</span>
              {exercise.reps}
            </span>
            <p className="text-[11px] text-muted-foreground/70">
              {currentWeight > 0 ? `${currentWeight} lbs` : "BW"}
            </p>
          </div>
          {exercise.rpe_target && (
            <div
              className="hidden sm:block px-2 py-0.5 rounded-md text-[11px] font-bold"
              style={{ backgroundColor: rpeColor + "15", color: rpeColor }}
            >
              RPE {exercise.rpe_target}
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
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
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] text-muted-foreground/70">
                  <Clock className="h-3 w-3" /> {exercise.rest_seconds}s rest
                </span>
                {exercise.progression && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-purple-500/[0.08] text-purple-400/80">
                    <TrendingUp className="h-3 w-3" /> {exercise.progression}
                  </span>
                )}
              </div>
              {exercise.notes && (
                <p className="text-[13px] leading-relaxed text-muted-foreground/70 pl-1 border-l-2 border-white/[0.06] ml-0.5">
                  {exercise.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Day Card ----------
function DayCard({ day, weekIndex, cardIndex }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + cardIndex * 0.06 }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      {/* Day header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base">{day.day_of_week}</h3>
          <p className="text-[13px] text-muted-foreground/60 mt-0.5 truncate">{day.focus}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {day.volume_sets && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Dumbbell className="h-3 w-3" /> {day.volume_sets} sets
            </span>
          )}
          {day.estimated_duration_min && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Clock className="h-3 w-3" /> {day.estimated_duration_min}m
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
                backgroundColor: (MUSCLE_COLORS[m] || "#666") + "12",
                color: (MUSCLE_COLORS[m] || "#666") + "cc",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-1.5">
        {day.exercises?.map((ex, i) => (
          <ExerciseRow key={i} exercise={ex} weekIndex={weekIndex} index={i} />
        ))}
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
        <span className="text-sm font-semibold text-muted-foreground/70">{dayName}</span>
        <span className="text-[11px] text-muted-foreground/70">Rest</span>
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
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
        Progression Rules
      </h4>
      <div className="space-y-2">
        {rules.map((rule, i) => (
          <div key={i} className="text-[13px] leading-relaxed">
            <span className="font-semibold text-foreground/80">{rule.category}: </span>
            <span className="text-muted-foreground/70">{rule.rule}</span>
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
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
        Weekly Volume Targets
      </h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(targets).map(([muscle, sets]) => {
          const color = MUSCLE_COLORS[muscle] || "#666";
          return (
            <div key={muscle} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground/70">{muscle}</span>
              <span className="font-bold text-muted-foreground/80">{sets}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------- Active Program View ----------
function ActiveProgramView({ data }) {
  const queryClient = useQueryClient();
  const deactivate = useDeactivateProgram();
  const { data: compliance } = useProgramCompliance(data.id);

  const program = data.program;
  const totalWeeks = data.weeks || 4;
  const template = program.weekly_template || [];
  const trainingDays = new Set(template.map((d) => d.day_of_week));

  // Default to current week from compliance, or week 1
  const currentWeek = compliance?.weeks?.find((w) => w.is_current)?.week || 1;
  const [selectedWeek, setSelectedWeek] = useState(null);
  const activeWeek = selectedWeek ?? currentWeek;
  const weekIndex = activeWeek - 1;

  const goalStyle = GOAL_BADGE_COLORS[data.goal] || GOAL_BADGE_COLORS.hypertrophy;

  const handleDeactivate = () => {
    if (!window.confirm("End this program? This cannot be undone.")) return;
    deactivate.mutate(data.id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activeProgram"] }),
    });
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Program Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xl font-bold leading-tight">{program.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {program.split_type && (
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {program.split_type}
                </span>
              )}
              <span
                className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${goalStyle.bg} ${goalStyle.text}`}
              >
                {data.goal?.replace("_", " ")}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="End program"
            onClick={handleDeactivate}
            disabled={deactivate.isPending}
            className="text-muted-foreground/60 hover:text-red-400 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {program.rationale && (
          <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
            {program.rationale}
          </p>
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
        complianceData={compliance}
      />

      {/* Weekly Schedule */}
      <AnimatePresence mode="wait">
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
                <DayCard key={dayName} day={dayData} weekIndex={weekIndex} cardIndex={i} />
              );
            }
            if (trainingDays.size < 7) {
              return <RestDayCard key={dayName} dayName={dayName} cardIndex={i} />;
            }
            return null;
          })}
        </motion.div>
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
          <span className="text-muted-foreground/70">{program.deload_strategy}</span>
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
        <p className="text-sm text-muted-foreground/70">Loading program...</p>
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
