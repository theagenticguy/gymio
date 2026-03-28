import { Timer } from "../components/Timer";
import { HeartRate } from "../components/HeartRate";
import { SessionStats } from "../components/SessionStats";
import { NowPlaying } from "../components/NowPlaying";
import { TodayWorkout } from "../components/TodayWorkout";
import { useStore } from "../store";

export function WallLayout() {
  const lights = useStore((s) => s.lights);

  // Sidebar border glows with traffic light
  const sideGlow =
    lights.color === "green"
      ? "border-gym-green/20 shadow-[inset_2px_0_20px_rgba(34,197,94,0.06)]"
      : lights.color === "yellow"
        ? "border-gym-yellow/20 shadow-[inset_2px_0_20px_rgba(234,179,8,0.06)]"
        : lights.color === "red"
          ? "border-gym-red/20 shadow-[inset_2px_0_20px_rgba(239,68,68,0.06)]"
          : "border-white/[0.04]";

  return (
    <div
      className="h-screen w-screen flex bg-background overflow-hidden noise-overlay wall-view"
      style={{ cursor: "none" }}
    >
      {/* Ambient glow layer */}
      <div className="ambient-glow" />

      {/* ── LEFT: Timer ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <Timer />
      </div>

      {/* ── CENTER: HeartRate + SessionStats ─────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8">
        <div className="@container flex flex-col gap-8">
          <HeartRate />
          <SessionStats />
        </div>
      </div>

      {/* ── RIGHT: Today's Workout + Now Playing ──────────────── */}
      <aside className={`relative z-10 w-[380px] shrink-0 border-l ${sideGlow} transition-all duration-700 flex flex-col`}>
        <div className="flex-1 overflow-hidden">
          <TodayWorkout />
        </div>
        <div className="shrink-0 border-t border-white/[0.04]">
          <NowPlaying controls={false} />
        </div>
      </aside>
    </div>
  );
}
