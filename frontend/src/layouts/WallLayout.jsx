import { Timer } from "../components/Timer";
import { HeartRate } from "../components/HeartRate";
import { SessionStats } from "../components/SessionStats";
import { NowPlaying } from "../components/NowPlaying";
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
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-8 px-8">
        <HeartRate large />
        <SessionStats large />
      </div>

      {/* ── RIGHT: Now Playing ──────────────────────────────────── */}
      <aside className={`relative z-10 w-[340px] shrink-0 border-l ${sideGlow} transition-all duration-700`}>
        <NowPlaying controls={false} />
      </aside>
    </div>
  );
}
