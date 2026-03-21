import { Dumbbell, Flame, Clock, Zap } from "lucide-react";
import { useWorkoutStats } from "../hooks/useApi";

function Stat({ icon: Icon, label, value, unit, color, large }) {
  return (
    <div className={`flex items-center ${large ? "gap-5" : "gap-3"}`}>
      <div
        className={`${large ? "p-4" : "p-2"} rounded-lg`}
        style={{ backgroundColor: color + "10" }}
      >
        <Icon className={large ? "h-10 w-10" : "h-4 w-4"} style={{ color }} />
      </div>
      <div>
        <p className={`${large ? "text-xl" : "text-[10px]"} uppercase tracking-widest text-foreground`}>{label}</p>
        <p className={`display-number ${large ? "text-5xl" : "text-lg"} font-bold text-foreground`}>
          {value}
          {unit && <span className={`${large ? "text-2xl" : "text-xs"} text-foreground ml-1`}>{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export function SessionStats({ large = false }) {
  const { data } = useWorkoutStats();

  const totalSets = data?.total_sets ?? "--";
  const totalVolume = data?.total_volume ? data.total_volume.toLocaleString() : "--";
  const exercises = data?.exercises?.length ?? "--";
  const topLift = data?.estimated_1rm
    ? Object.entries(data.estimated_1rm).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className={`glass rounded-xl ${large ? "p-8" : "p-4"} grid grid-cols-2 ${large ? "gap-10" : "gap-4"}`}>
      <Stat icon={Dumbbell} label="Sets (7d)" value={totalSets} color="#22c55e" large={large} />
      <Stat icon={Flame} label="Volume (7d)" value={totalVolume} unit="lbs" color="#f97316" large={large} />
      <Stat icon={Clock} label="Exercises" value={exercises} color="#3b82f6" large={large} />
      <Stat
        icon={Zap}
        label={topLift ? `${topLift[0]} e1RM` : "Est 1RM"}
        value={topLift ? topLift[1] : "--"}
        unit={topLift ? "lbs" : ""}
        color="#eab308"
        large={large}
      />
    </div>
  );
}
