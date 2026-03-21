import { Timer } from "../components/Timer";
import { HeartRate } from "../components/HeartRate";
import { Controls } from "../components/Controls";
import { NowPlaying } from "../components/NowPlaying";
import { UserSwitcher } from "../components/UserSwitcher";
import { WorkoutSetup } from "../components/WorkoutSetup";
import { SessionStats } from "../components/SessionStats";
import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store";
import { Drawer } from "vaul";
import {
  Timer as TimerIcon,
  Dumbbell,
  Brain,
  Music,
  Flame,
  CalendarDays,
  Trophy,
  LayoutGrid,
  Loader2,
} from "lucide-react";

const WorkoutJournal = lazy(() => import("../components/WorkoutJournal").then(m => ({ default: m.WorkoutJournal })));
const AiCoach = lazy(() => import("../components/AiCoach").then(m => ({ default: m.AiCoach })));
const NineRound = lazy(() => import("../components/NineRound").then(m => ({ default: m.NineRound })));
const ProgramView = lazy(() => import("../components/ProgramView").then(m => ({ default: m.ProgramView })));
const SessionRecap = lazy(() => import("../components/SessionRecap").then(m => ({ default: m.SessionRecap })));

function LazyFallback() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div>;
}

const PRIMARY_TABS = [
  { id: "timer", icon: TimerIcon, label: "Timer" },
  { id: "journal", icon: Dumbbell, label: "Journal" },
  { id: "coach", icon: Brain, label: "Coach" },
];

const MORE_TABS = [
  { id: "9round", icon: Flame, label: "9-Round", color: "text-red-400" },
  { id: "program", icon: CalendarDays, label: "Program", color: "text-purple-400" },
  { id: "recap", icon: Trophy, label: "Recap", color: "text-yellow-400" },
  { id: "music", icon: Music, label: "Music", color: "text-blue-400" },
];

const MORE_TAB_IDS = new Set(MORE_TABS.map(t => t.id));

export function PhoneLayout() {
  const [showSetup, setShowSetup] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const isMoreActive = MORE_TAB_IDS.has(activeTab);

  const handleMoreTab = (id) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  return (
    <div className="h-dvh bg-background flex flex-col noise-overlay overflow-hidden">
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.04]">
        <h1 className="text-lg font-black tracking-tight text-foreground/90">
          GYM<span className="text-gym-green">IO</span>
        </h1>
        <div className="flex items-center gap-3">
          <HeartRate compact />
          <UserSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-auto p-4">
        <Suspense fallback={<LazyFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={activeTab === "timer" ? "flex flex-col items-center gap-4" : activeTab === "music" ? "h-96" : "space-y-4"}
            >
              {activeTab === "timer" && (showSetup ? <WorkoutSetup onClose={() => setShowSetup(false)} /> : <Timer />)}
              {activeTab === "journal" && <WorkoutJournal />}
              {activeTab === "9round" && <NineRound />}
              {activeTab === "coach" && <AiCoach />}
              {activeTab === "program" && <ProgramView />}
              {activeTab === "recap" && <SessionRecap />}
              {activeTab === "music" && <NowPlaying />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {/* Controls */}
      <div className="relative z-10 px-4 py-3 border-t border-white/[0.04] flex justify-center">
        <Controls onSetup={() => { setActiveTab("timer"); setShowSetup(!showSetup); }} />
      </div>

      {/* Bottom tab bar: 3 primary + More drawer */}
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <nav className="relative z-10 flex border-t border-white/[0.04] bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          {PRIMARY_TABS.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
                {active && (
                  <motion.div
                    layoutId="phone-tab-dot"
                    className="w-1 h-1 rounded-full bg-gym-green"
                  />
                )}
              </button>
            );
          })}

          {/* More button */}
          <Drawer.Trigger asChild>
            <button
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isMoreActive ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              <LayoutGrid className="h-6 w-6" />
              More
              {isMoreActive && (
                <motion.div
                  layoutId="phone-tab-dot"
                  className="w-1 h-1 rounded-full bg-gym-green"
                />
              )}
            </button>
          </Drawer.Trigger>
        </nav>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background/95 backdrop-blur-xl border-t border-white/[0.08]">
            <div className="flex justify-center pt-3 pb-1">
              <Drawer.Handle className="bg-white/20" />
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {MORE_TABS.map(({ id, icon: Icon, label, color }) => {
                const active = activeTab === id;
                return (
                  <Drawer.Close asChild key={id}>
                    <button
                      onClick={() => handleMoreTab(id)}
                      className={`glass flex flex-col items-center gap-2.5 p-5 rounded-xl transition-all ${
                        active ? "ring-1 ring-white/20" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className={`h-8 w-8 ${active ? color : "text-muted-foreground/60"}`} />
                      <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground/60"}`}>
                        {label}
                      </span>
                    </button>
                  </Drawer.Close>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
