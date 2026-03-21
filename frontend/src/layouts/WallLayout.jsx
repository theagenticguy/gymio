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
      className="h-screen w-screen grid grid-cols-[4fr_3.5fr_300px] bg-background overflow-hidden noise-overlay"
      style={{ cursor: "none", zoom: 2.5 }}
    >
      {/* Ambient glow layer */}
      <div className="ambient-glow" />

      {/* ── LEFT: Timer (large, centered) ─────────────────────── */}
      <div className="relative z-10 flex items-center justify-center h-full px-8">
        <Timer />
      </div>

      {/* ── CENTER: HeartRate + SessionStats stacked ──────────── */}
      <div className="relative z-10 flex flex-col justify-center h-full gap-6 px-6 overflow-auto">
        <HeartRate />
        <SessionStats />
      </div>

      {/* ── RIGHT: Now Playing sidebar ────────────────────────── */}
      <aside className={`relative z-10 border-l ${sideGlow} transition-all duration-700`}>
        <NowPlaying />
      </aside>
    </div>
  );
}
