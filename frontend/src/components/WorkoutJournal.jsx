import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, Trash2, Dumbbell, Brain } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { useStore } from "../store";
import { useLogSet, useWorkoutHistory, useWorkoutStats, useExerciseCatalog } from "../hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";

function SetRow({ set, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/50"
    >
      <span className="text-xs text-muted-foreground w-8">#{set.set_number}</span>
      <span className="display-number text-sm font-semibold">{set.weight}</span>
      <span className="text-xs text-muted-foreground">lbs</span>
      <span className="text-muted-foreground">x</span>
      <span className="display-number text-sm font-semibold">{set.reps}</span>
      <span className="text-xs text-muted-foreground">reps</span>
      {set.rpe && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gym-yellow/20 text-gym-yellow">
          RPE {set.rpe}
        </span>
      )}
      <div className="flex-1" />
      {onRemove && (
        <button aria-label="Remove set" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}

export function WorkoutJournal() {
  const user = useStore((s) => s.user);
  const queryClient = useQueryClient();
  const logSet = useLogSet();
  const { data: historyData } = useWorkoutHistory({ user: user.value || "laith", days: 1 });
  const { data: statsData } = useWorkoutStats();

  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [setNumber, setSetNumber] = useState(1);
  const [showExercises, setShowExercises] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const { data: catalogData } = useExerciseCatalog(filterText);
  const todaySets = historyData?.history || [];
  const catalogExercises = catalogData?.exercises || [];

  const handleLog = () => {
    if (!exercise || !weight || !reps) return;
    logSet.mutate(
      {
        exercise,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        set_number: setNumber,
        rpe: rpe ? parseFloat(rpe) : null,
        user: user.value || "laith",
      },
      {
        onSuccess: () => {
          setSetNumber(setNumber + 1);
          setReps("");
          setRpe("");
          queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
          queryClient.invalidateQueries({ queryKey: ["workoutStats"] });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Workout Journal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise selector */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Exercise name..."
              value={exercise}
              onChange={(e) => {
                setExercise(e.target.value);
                setFilterText(e.target.value);
                setShowExercises(true);
                setSetNumber(1);
                setHighlightIndex(-1);
              }}
              onFocus={() => setShowExercises(true)}
              onBlur={() => setTimeout(() => setShowExercises(false), 150)}
              onKeyDown={(e) => {
                if (!showExercises || catalogExercises.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.min(i + 1, catalogExercises.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && highlightIndex >= 0) {
                  e.preventDefault();
                  setExercise(catalogExercises[highlightIndex].name);
                  setShowExercises(false);
                  setFilterText("");
                  setHighlightIndex(-1);
                } else if (e.key === "Escape") {
                  setShowExercises(false);
                  setHighlightIndex(-1);
                }
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {showExercises && filterText && catalogExercises.length > 0 && (
              <div className="absolute z-50 top-11 left-0 right-0 max-h-48 overflow-auto rounded-md border bg-card shadow-lg">
                {catalogExercises.map((ex, i) => (
                  <button
                    key={ex.id}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                      i === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                    }`}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onClick={() => {
                      setExercise(ex.name);
                      setShowExercises(false);
                      setFilterText("");
                      setHighlightIndex(-1);
                    }}
                  >
                    <span>{ex.name}</span>
                    <span className="text-xs text-muted-foreground">{ex.muscle_group} · {ex.equipment}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weight / Reps / RPE inputs */}
        {exercise && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Weight (lbs)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="225"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm display-number focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Reps</label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="8"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm display-number focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-muted-foreground">RPE</label>
                <input
                  type="number"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  placeholder="8"
                  min="1"
                  max="10"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm display-number focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Set #{setNumber}</span>
              <div className="flex-1" />
              <Button variant="gym" size="sm" onClick={handleLog} disabled={logSet.isPending}>
                <Check className="h-4 w-4 mr-1" />
                Log Set
              </Button>
            </div>
          </motion.div>
        )}

        {/* Today's logged sets */}
        {todaySets.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">Today</p>
            <AnimatePresence>
              {todaySets.slice(0, 10).map((set) => (
                <SetRow key={set.id} set={set} />
              ))}
            </AnimatePresence>
            {todaySets.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                +{todaySets.length - 10} more sets
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
