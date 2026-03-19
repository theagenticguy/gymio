import { Timer } from "../components/Timer";
import { HeartRate } from "../components/HeartRate";
import { SessionStats } from "../components/SessionStats";
import { Controls } from "../components/Controls";
import { NowPlaying } from "../components/NowPlaying";
import { UserSwitcher } from "../components/UserSwitcher";
import { WorkoutSetup } from "../components/WorkoutSetup";
import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store";
import { Dumbbell, Brain, Timer as TimerIcon, Flame, CalendarDays, Trophy, Loader2 } from "lucide-react";

const WorkoutJournal = lazy(() => import("../components/WorkoutJournal").then(m => ({ default: m.WorkoutJournal })));
const AiCoach = lazy(() => import("../components/AiCoach").then(m => ({ default: m.AiCoach })));
const NineRound = lazy(() => import("../components/NineRound").then(m => ({ default: m.NineRound })));
const ProgramView = lazy(() => import("../components/ProgramView").then(m => ({ default: m.ProgramView })));
const SessionRecap = lazy(() => import("../components/SessionRecap").then(m => ({ default: m.SessionRecap })));

function LazyFallback() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div>;
}

const TABS = [
  { id: "timer", label: "Timer", icon: TimerIcon },
  { id: "journal", label: "Journal", icon: Dumbbell },
  { id: "9round", label: "9-Round", icon: Flame },
  { id: "coach", label: "AI Coach", icon: Brain },
  { id: "program", label: "Program", icon: CalendarDays },
  { id: "recap", label: "Recap", icon: Trophy },
];

export function WallLayout() {
  const [showSetup, setShowSetup] = useState(false);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const lights = useStore((s) => s.lights);
  const timer = useStore((s) => s.timer);

  const isActive = timer.phase !== "idle";

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
    <div className="h-screen w-screen grid grid-cols-[1fr_300px] bg-background overflow-hidden noise-overlay">
      {/* Ambient glow layer */}
      <div className="ambient-glow" />

      {/* ── Main dashboard ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 pt-6 pb-3">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <h1 className="text-lg font-black tracking-tight text-foreground/90">
              GYM<span className="text-gym-green">IO</span>
            </h1>

            {/* Tab navigation */}
            <nav className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      active
                        ? "text-foreground"
                        : "text-text-secondary hover:text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {/* Active indicator */}
                    {active && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Compact HR in top bar when not on timer tab */}
            {activeTab !== "timer" && isActive && (
              <HeartRate compact />
            )}
            <UserSwitcher />
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-auto px-8">
          <Suspense fallback={<LazyFallback />}>
          <AnimatePresence mode="wait">
            {activeTab === "timer" && (
              <motion.div
                key="timer-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center h-full gap-4"
              >
                {showSetup ? (
                  <WorkoutSetup onClose={() => setShowSetup(false)} />
                ) : (
                  <>
                    <Timer />
                    <div className="w-full max-w-md">
                      <HeartRate />
                    </div>
                    <SessionStats />
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "journal" && (
              <motion.div
                key="journal-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto py-6 space-y-6"
              >
                <WorkoutJournal />
                <SessionStats />
              </motion.div>
            )}

            {activeTab === "9round" && (
              <motion.div
                key="9round-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto py-6 h-full"
              >
                <NineRound />
              </motion.div>
            )}

            {activeTab === "coach" && (
              <motion.div
                key="coach-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto py-6 space-y-6"
              >
                <AiCoach />
                <SessionStats />
              </motion.div>
            )}

            {activeTab === "program" && (
              <motion.div
                key="program-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto py-6 space-y-6"
              >
                <ProgramView />
              </motion.div>
            )}

            {activeTab === "recap" && (
              <motion.div
                key="recap-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto py-6 space-y-6"
              >
                <SessionRecap />
              </motion.div>
            )}
          </AnimatePresence>
          </Suspense>
        </main>

        {/* Bottom controls */}
        <footer className="flex justify-center py-4 px-8 border-t border-white/[0.04]">
          <Controls
            onSetup={() => {
              setActiveTab("timer");
              setShowSetup(!showSetup);
            }}
          />
        </footer>
      </div>

      {/* ── Sidebar: Now Playing ────────────────────────────────── */}
      <aside className={`relative z-10 border-l ${sideGlow} transition-all duration-700`}>
        <NowPlaying />
      </aside>
    </div>
  );
}
