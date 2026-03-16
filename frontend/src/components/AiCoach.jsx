import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Sparkles, TrendingUp, Loader2, Dumbbell, Clock, Flame, ChevronDown, RotateCw } from "lucide-react";
import { Button } from "./ui/button";
import { useStore } from "../store";
import { useMutation } from "@tanstack/react-query";
import { useAiSuggestLatest, useAiAnalyzeLatest } from "../hooks/useApi";

const MUSCLE_COLORS = {
  Chest: "#ef4444", Back: "#3b82f6", Shoulders: "#f97316", Quads: "#22c55e",
  Hamstrings: "#16a34a", Glutes: "#10b981", Biceps: "#a855f7", Triceps: "#8b5cf6",
  Abs: "#eab308", Calves: "#06b6d4", Traps: "#ec4899", Forearms: "#6366f1",
  Lats: "#2563eb", "Full Body": "#f59e0b", Obliques: "#14b8a6",
};

function ExerciseCard({ exercise, index }) {
  const color = MUSCLE_COLORS[exercise.muscle_group] || "#666";
  const [expanded, setExpanded] = useState(false);

  const rpeColor =
    exercise.rpe_target >= 9 ? "#ef4444" : exercise.rpe_target >= 8 ? "#eab308" : "#22c55e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl glass overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
      >
        {/* Number */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shrink-0"
          style={{ backgroundColor: color + "15", color }}
        >
          {index + 1}
        </div>

        {/* Exercise name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{exercise.exercise}</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {exercise.muscle_group}
            {exercise.equipment && <span className="text-muted-foreground/30"> · {exercise.equipment}</span>}
            {exercise.superset_with && (
              <span className="text-purple-400/70"> SS: {exercise.superset_with}</span>
            )}
          </p>
        </div>

        {/* Sets x Reps x Weight — compact pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="display-number text-right">
            <span className="text-sm font-bold">{exercise.sets}<span className="text-muted-foreground/40 mx-0.5">×</span>{exercise.reps}</span>
            <p className="text-[11px] text-muted-foreground/50">
              {exercise.weight_lbs > 0 ? `${exercise.weight_lbs} lbs` : "BW"}
            </p>
          </div>
          {exercise.rpe_target && (
            <div
              className="display-number px-2 py-0.5 rounded-md text-[11px] font-bold"
              style={{ backgroundColor: rpeColor + "15", color: rpeColor }}
            >
              {exercise.rpe_target}
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground/30 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
              {/* Detail chips */}
              <div className="flex flex-wrap gap-2 pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] text-muted-foreground/60">
                  <Clock className="h-3 w-3" /> {exercise.rest_seconds}s rest
                </span>
                {exercise.rpe_target && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md" style={{ backgroundColor: rpeColor + "08", color: rpeColor + "99" }}>
                    RPE {exercise.rpe_target}
                  </span>
                )}
                {exercise.weight_lbs > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] text-muted-foreground/60">
                    <Dumbbell className="h-3 w-3" /> {exercise.weight_lbs} lbs
                  </span>
                )}
              </div>
              {/* Notes — formatted as distinct coaching cues */}
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

function WorkoutDisplay({ workout }) {
  if (!workout || typeof workout === "string") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold leading-tight">{workout.title}</h3>
            <p className="text-[13px] text-muted-foreground/60 mt-1.5 leading-relaxed">{workout.summary}</p>
          </div>
          {workout.split && (
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0">
              {workout.split}
            </span>
          )}
        </div>

        {/* Muscle tags + stats */}
        <div className="flex flex-wrap items-center gap-2">
          {workout.target_muscles?.map((m) => (
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
          <span className="text-muted-foreground/20 mx-1">|</span>
          {workout.estimated_duration_min && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
              <Clock className="h-3 w-3" /> {workout.estimated_duration_min}m
            </span>
          )}
          {workout.total_sets && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
              <Dumbbell className="h-3 w-3" /> {workout.total_sets} sets
            </span>
          )}
          {workout.total_volume_lbs && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
              <Flame className="h-3 w-3" /> {workout.total_volume_lbs.toLocaleString()} lbs
            </span>
          )}
        </div>
      </div>

      {/* Warmup */}
      {workout.warmup && (
        <div className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[13px] leading-relaxed">
          <span className="text-blue-400/80 font-semibold">Warmup </span>
          <span className="text-muted-foreground/60">{workout.warmup}</span>
        </div>
      )}

      {/* Progressive overload */}
      {workout.progressive_overload?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gym-green/80">Progressive Overload</p>
          {workout.progressive_overload.map((po, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] px-3 py-2.5 rounded-xl bg-gym-green/[0.03] border border-gym-green/10">
              <span className="font-semibold text-foreground/80">{po.exercise}</span>
              {po.last_performance && (
                <span className="text-muted-foreground/40">{po.last_performance}</span>
              )}
              {po.last_performance && <span className="text-muted-foreground/20">→</span>}
              <span className="text-gym-green font-bold">{po.today_target}</span>
              <span className="text-[11px] text-muted-foreground/30 ml-auto">{po.strategy}</span>
            </div>
          ))}
        </div>
      )}

      {/* Deload */}
      {workout.deload_note && (
        <div className="px-4 py-3 rounded-xl bg-gym-yellow/5 border border-gym-yellow/10 text-[13px] leading-relaxed">
          <span className="text-gym-yellow/80 font-semibold">Deload </span>
          <span className="text-muted-foreground/60">{workout.deload_note}</span>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-1.5">
        {workout.exercises?.map((ex, i) => (
          <ExerciseCard key={i} exercise={ex} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

export function AiCoach() {
  const user = useStore((s) => s.user);
  const apiUrl = useStore((s) => s.apiUrl);
  const [response, setResponse] = useState(null);
  const [analysisText, setAnalysisText] = useState("");
  const [mode, setMode] = useState("suggest");
  const [lastGoal, setLastGoal] = useState(null);
  const [wasCached, setWasCached] = useState(false);

  const userName = user.value || "laith";

  // Hydrate from DB cache on mount
  const { data: cachedSuggest } = useAiSuggestLatest(userName);
  const { data: cachedAnalyze } = useAiAnalyzeLatest(userName);

  useEffect(() => {
    if (cachedSuggest?.workout && !response) {
      setResponse(cachedSuggest.workout);
      setLastGoal(cachedSuggest.goal);
      setWasCached(true);
    }
  }, [cachedSuggest]);

  useEffect(() => {
    if (cachedAnalyze?.analysis && !analysisText) {
      setAnalysisText(cachedAnalyze.analysis);
    }
  }, [cachedAnalyze]);

  const suggest = useMutation({
    mutationFn: async ({ goal, force = false }) => {
      const res = await fetch(`${apiUrl}/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userName, goal, force }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.workout?.error) throw new Error(data.workout.error);
      if (typeof data.workout === "string") throw new Error(data.workout);
      if (!data.workout?.exercises) throw new Error("No workout generated — check Bedrock credentials");
      return data;
    },
    onSuccess: (data) => {
      setResponse(data.workout);
      setWasCached(!!data.cached);
      setMode("suggest");
    },
  });

  const analyze = useMutation({
    mutationFn: async ({ force = false } = {}) => {
      const res = await fetch(`${apiUrl}/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userName, force }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisText(data.analysis);
      setWasCached(!!data.cached);
      setMode("analyze");
    },
  });

  const isLoading = suggest.isPending || analyze.isPending;
  const error = suggest.error?.message || analyze.error?.message;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Brain className="h-5 w-5 text-purple-400" />
        <h2 className="text-lg font-bold">AI Coach</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400/70 font-bold uppercase tracking-wider">
          Sonnet 4.6
        </span>
      </div>
      <div className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => { setLastGoal("hypertrophy"); suggest.mutate({ goal: "hypertrophy" }); }}
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-gym-yellow" />
            Hypertrophy
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => { setLastGoal("strength"); suggest.mutate({ goal: "strength" }); }}
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-gym-green" />
            Strength
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => analyze.mutate({})}
          >
            <TrendingUp className="h-4 w-4 mr-1.5 text-blue-400" />
            Analyze Progress
          </Button>
          {wasCached && response && mode === "suggest" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={() => suggest.mutate({ goal: lastGoal || "hypertrophy", force: true })}
              title="Force regenerate (skip cache)"
            >
              <RotateCw className="h-4 w-4 mr-1.5 text-muted-foreground" />
              Regenerate
            </Button>
          )}
        </div>
        {wasCached && response && mode === "suggest" && (
          <p className="text-xs text-muted-foreground">Loaded from cache — click Regenerate for a fresh plan</p>
        )}

        {/* Loading */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Claude is thinking deeply...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Analyzing your training history with extended reasoning</p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-sm text-gym-red py-4">Error: {error}</p>
            </motion.div>
          )}

          {/* Structured workout display */}
          {!isLoading && !error && mode === "suggest" && response && (
            <WorkoutDisplay key="workout" workout={response} />
          )}

          {/* Text analysis display */}
          {!isLoading && !error && mode === "analyze" && analysisText && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground/70"
            >
              {analysisText}
            </motion.div>
          )}

          {/* Empty state */}
          {!isLoading && !error && !response && !analysisText && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground/40 text-center py-12">
              Ask the AI coach for a personalized workout or training analysis
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
