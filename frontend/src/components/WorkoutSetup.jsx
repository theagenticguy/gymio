import { useStore } from "../store";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./ui/select";
import { Button } from "./ui/button";

const ROUNDS = [3, 4, 5, 6, 7, 8, 9];
const TRAIN_DURATIONS = [60, 90, 120, 150, 180, 210, 240];
const REST_DURATIONS = [30, 60, 90, 120, 150, 180, 210, 240];

export function WorkoutSetup({ onClose }) {
  const workout = useStore((s) => s.workout);
  const setWorkout = useStore((s) => s.setWorkout);
  const workoutType = useStore((s) => s.workoutType);
  const setWorkoutType = useStore((s) => s.setWorkoutType);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Workout Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workout type */}
        <div className="flex gap-2">
          <Button
            variant={workoutType === "cardio" ? "default" : "outline"}
            size="sm"
            onClick={() => setWorkoutType("cardio")}
          >
            Cardio / Boxing
          </Button>
          <Button
            variant={workoutType === "weights" ? "default" : "outline"}
            size="sm"
            onClick={() => setWorkoutType("weights")}
          >
            Weights
          </Button>
        </div>

        {workoutType === "cardio" && (
          <div className="space-y-3">
            {/* Rounds */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Rounds</label>
              <Select
                value={String(workout.rounds)}
                onValueChange={(v) => setWorkout({ ...workout, rounds: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUNDS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} rounds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Train duration */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Round Duration</label>
              <Select
                value={String(workout.train)}
                onValueChange={(v) => setWorkout({ ...workout, train: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAIN_DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}s ({Math.floor(d / 60)}:{String(d % 60).padStart(2, "0")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rest duration */}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Rest Duration</label>
              <Select
                value={String(workout.rest)}
                onValueChange={(v) => setWorkout({ ...workout, rest: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REST_DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}s ({Math.floor(d / 60)}:{String(d % 60).padStart(2, "0")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
