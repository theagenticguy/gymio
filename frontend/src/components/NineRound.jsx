import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, Play, RefreshCw, Loader2, ChevronLeft, ChevronRight, X, ThumbsUp, ThumbsDown, Sparkles, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "../store";
import { useNineRoundLatest } from "../hooks/useApi";

const STATION_COLORS = {
  "Cardio Warmup": "#3b82f6",
  "Heavy Bag - Boxing": "#ef4444",
  "Speed Bag / Rhythm": "#f97316",
  "Heavy Bag - Kickboxing": "#dc2626",
  "Upper Body Weights": "#22c55e",
  "Lower Body Weights": "#16a34a",
  "Core / Abs": "#a855f7",
  "Conditioning": "#eab308",
  "Burnout Finisher": "#ef4444",
};

const STATION_EMOJI = {
  "Cardio Warmup": "🏃",
  "Heavy Bag - Boxing": "🥊",
  "Speed Bag / Rhythm": "🥁",
  "Heavy Bag - Kickboxing": "🦵",
  "Upper Body Weights": "💪",
  "Lower Body Weights": "🦿",
  "Core / Abs": "🎯",
  "Conditioning": "🔥",
  "Burnout Finisher": "💀",
};

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Splits notes text into structured lines.
 * Detects combo notation (1-2-3), bullet-style items, and sentence breaks.
 */
function formatNotes(text, stationColor) {
  if (!text) return null;
  // Split on periods followed by space/caps, or explicit newlines, or semicolons
  const lines = text
    .split(/(?:\.\s+(?=[A-Z])|\n|;\s*)/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);

  if (lines.length <= 1) {
    return <p className="text-sm text-text-secondary leading-relaxed">{text}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        // Detect combo notation: strings with number-dash-number patterns
        const isCombo = /\d[-–]\d/.test(line);
        return (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span
              className="mt-[7px] h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: isCombo ? stationColor : "rgba(255,255,255,0.15)" }}
            />
            <span className={isCombo ? "text-foreground/90 font-medium" : "text-text-secondary"}>
              {line}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RoundCard({ round, isActive, total, onReact, reaction }) {
  const color = STATION_COLORS[round.station] || "#666";
  const emoji = STATION_EMOJI[round.station] || "⚡";

  return (
    <div
      className={`relative w-full h-full rounded-2xl overflow-hidden transition-all duration-300 glass ${
        isActive ? "scale-100 opacity-100" : "scale-95 opacity-40"
      }`}
      style={{
        borderColor: isActive ? color + "40" : "transparent",
        borderWidth: 1,
        background: `linear-gradient(160deg, ${color}0a 0%, transparent 40%)`,
      }}
    >
      {/* Station number - big watermark */}
      <div
        className="absolute top-2 right-4 font-black leading-none select-none"
        style={{ fontSize: "10rem", color: color + "08" }}
      >
        {round.round}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-6 pb-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl text-xl"
              style={{ backgroundColor: color + "15" }}
            >
              {emoji}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                Round {round.round} of {total}
              </p>
              <p className="text-xs text-text-secondary">{round.station}</p>
            </div>
          </div>

          {/* Thumbs */}
          <div className="flex gap-1">
            <button
              aria-label="Like this round"
              onClick={(e) => { e.stopPropagation(); onReact?.(round, "liked"); }}
              className={`p-1.5 rounded-lg transition-all ${
                reaction === "liked"
                  ? "bg-gym-green/20 text-gym-green scale-110"
                  : "text-text-secondary hover:text-gym-green hover:bg-gym-green/10"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Dislike this round"
              onClick={(e) => { e.stopPropagation(); onReact?.(round, "disliked"); }}
              className={`p-1.5 rounded-lg transition-all ${
                reaction === "disliked"
                  ? "bg-gym-red/20 text-gym-red scale-110"
                  : "text-text-secondary hover:text-gym-red hover:bg-gym-red/10"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Exercise name */}
        <h2 className="text-2xl font-bold mt-3 mb-3 leading-snug">{round.exercise}</h2>

        {/* Formatted notes */}
        <div className="flex-1 overflow-auto pr-1 -mr-1" tabIndex={0} role="region" aria-label="Round instructions">
          {formatNotes(round.notes, color)}
        </div>

        {/* Footer: timing + active rest */}
        <div className="mt-auto pt-3 space-y-2.5 border-t border-white/[0.04]">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="display-number text-xl font-bold">{formatTime(round.duration)}</span>
              <span className="text-xs text-text-secondary">work</span>
            </div>
            {round.rest_duration > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500/60" />
                <span className="display-number text-xl font-bold">{formatTime(round.rest_duration)}</span>
                <span className="text-xs text-text-secondary">rest</span>
              </div>
            )}
          </div>

          {round.rest_exercise && (
            <div className="px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs">
                <span className="text-blue-400/80 font-medium">Active rest: </span>
                <span className="text-text-secondary">{round.rest_exercise}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardCarousel({ rounds, onReact, reactions }) {
  const activeCard = useStore((s) => s.nineRoundActiveCard);
  const setActiveCard = useStore((s) => s.setNineRoundActiveCard);
  const [direction, setDirection] = useState(0);

  const handleDragEnd = (_, info) => {
    const threshold = 80;
    if (info.offset.x < -threshold && activeCard < rounds.length - 1) {
      setDirection(1);
      setActiveCard(activeCard + 1);
    } else if (info.offset.x > threshold && activeCard > 0) {
      setDirection(-1);
      setActiveCard(activeCard - 1);
    }
  };

  const goTo = (idx) => {
    setDirection(idx > activeCard ? 1 : -1);
    setActiveCard(Math.max(0, Math.min(idx, rounds.length - 1)));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Card area — fixed height */}
      <div className="relative h-[420px] overflow-hidden rounded-2xl">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={activeCard}
            custom={direction}
            initial={{ x: direction >= 0 ? 400 : -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction >= 0 ? -400 : 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <RoundCard
              round={rounds[activeCard]}
              isActive={true}
              total={rounds.length}
              onReact={onReact}
              reaction={reactions?.[activeCard]}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous round"
          onClick={() => goTo(activeCard - 1)}
          disabled={activeCard === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Dots */}
        <div className="flex gap-1.5" role="tablist" aria-label="Round navigation">
          {rounds.map((r, i) => {
            const color = STATION_COLORS[r.station] || "#666";
            return (
              <button
                key={i}
                role="tab"
                aria-label={`Round ${i + 1}: ${r.station}`}
                aria-selected={i === activeCard}
                onClick={() => goTo(i)}
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeCard ? 24 : 10,
                  backgroundColor: i === activeCard ? color : "#3f3f46",
                }}
              />
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next round"
          onClick={() => goTo(activeCard + 1)}
          disabled={activeCard === rounds.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function NineRound() {
  const apiUrl = useStore((s) => s.apiUrl);
  const user = useStore((s) => s.user);
  const workout = useStore((s) => s.nineRound);
  const setWorkout = useStore((s) => s.setNineRound);
  const config = useStore((s) => s.nineRoundConfig);
  const setConfig = useStore((s) => s.setNineRoundConfig);
  const setActiveCard = useStore((s) => s.setNineRoundActiveCard);

  const [error, setError] = useState(null);
  const [mode, setMode] = useState("ai"); // "ai" or "quick"
  const [reactions, setReactions] = useState({}); // { roundIndex: "liked"|"disliked" }

  // Hydrate from DB if Zustand store is empty
  const userName = user.value || "laith";
  const { data: cachedNineRound } = useNineRoundLatest(userName);

  useEffect(() => {
    if (cachedNineRound?.workout?.rounds && !workout) {
      setWorkout(cachedNineRound.workout);
      setActiveCard(0);
    }
  }, [cachedNineRound]);

  const handleReact = (round, reaction) => {
    const idx = round.round - 1;
    const current = reactions[idx];
    const newReaction = current === reaction ? null : reaction; // toggle off if same
    setReactions({ ...reactions, [idx]: newReaction });

    // Send to backend for future AI context
    if (newReaction) {
      fetch(`${apiUrl}/nine-round/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_data: round,
          reaction: newReaction,
          user: user.value || "laith",
        }),
      }).catch(() => {}); // fire and forget
    }
  };

  const generate = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch(`${apiUrl}/nine-round/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_duration: config.roundDuration,
          rest_duration: config.restDuration,
          mode,
          user: user.value || "laith",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
        return;
      }
      setWorkout(data);
      setActiveCard(0);
      setReactions({});
    },
    onError: (err) => setError(err.message),
  });

  const startWorkout = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch(`${apiUrl}/nine-round/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_duration: config.roundDuration,
          rest_duration: config.restDuration,
          user: user.value || "laith",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onError: (err) => setError(err.message),
  });

  // No workout generated yet — show config screen
  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Flame className="h-10 w-10 text-gym-red" />
            <h2 className="text-3xl font-bold">9-Round</h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Kickboxing, weights, cardio, and core — randomized across 9 stations with active rest.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => setMode("ai")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            AI Powered
          </button>
          <button
            onClick={() => setMode("quick")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "quick"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-4 w-4 text-gym-yellow" />
            Quick Random
          </button>
        </div>

        {mode === "ai" && (
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Claude Sonnet generates specific boxing combos, personalized to your training history and preferences
          </p>
        )}

        <div className="flex gap-4 items-end">
          <div>
            <label htmlFor="round-duration" className="text-xs text-muted-foreground block mb-1">Round Duration</label>
            <select
              id="round-duration"
              value={config.roundDuration}
              onChange={(e) => setConfig({ ...config, roundDuration: Number(e.target.value) })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value={120}>2:00</option>
              <option value={150}>2:30</option>
              <option value={180}>3:00</option>
              <option value={210}>3:30</option>
              <option value={240}>4:00</option>
            </select>
          </div>
          <div>
            <label htmlFor="rest-duration" className="text-xs text-muted-foreground block mb-1">Active Rest</label>
            <select
              id="rest-duration"
              value={config.restDuration}
              onChange={(e) => setConfig({ ...config, restDuration: Number(e.target.value) })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value={15}>0:15</option>
              <option value={30}>0:30</option>
              <option value={45}>0:45</option>
              <option value={60}>1:00</option>
            </select>
          </div>
        </div>

        <Button
          variant="gym"
          size="xl"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : mode === "ai" ? (
            <Sparkles className="h-5 w-5 mr-2" />
          ) : (
            <Zap className="h-5 w-5 mr-2" />
          )}
          {generate.isPending
            ? mode === "ai" ? "Claude is thinking..." : "Generating..."
            : "Generate Workout"
          }
        </Button>

        {error && (
          <p className="text-sm text-gym-red text-center max-w-md">Error: {error}</p>
        )}
      </div>
    );
  }

  // Workout exists — show swipeable cards
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="h-5 w-5 text-gym-red" />
          <span className="text-sm font-medium">9-Round</span>
          <span className="text-xs text-muted-foreground">
            · {formatTime(workout.total_time_seconds)}
          </span>
          {workout.ai_generated && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
              AI
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setWorkout(null); setActiveCard(0); }}
          >
            <X className="h-4 w-4 mr-1" />
            New
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${generate.isPending ? "animate-spin" : ""}`} />
            Shuffle
          </Button>
          <Button
            variant="gym"
            size="sm"
            onClick={() => startWorkout.mutate()}
            disabled={startWorkout.isPending}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 min-h-0">
        <CardCarousel rounds={workout.rounds} onReact={handleReact} reactions={reactions} />
      </div>
    </div>
  );
}
