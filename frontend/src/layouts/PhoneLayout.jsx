import { Timer } from "../components/Timer";
import { HeartRate } from "../components/HeartRate";
import { Controls } from "../components/Controls";
import { NowPlaying } from "../components/NowPlaying";
import { UserSwitcher } from "../components/UserSwitcher";
import { WorkoutSetup } from "../components/WorkoutSetup";
import { WorkoutJournal } from "../components/WorkoutJournal";
import { AiCoach } from "../components/AiCoach";
import { NineRound } from "../components/NineRound";
import { ProgramView } from "../components/ProgramView";
import { SessionRecap } from "../components/SessionRecap";
import { SessionStats } from "../components/SessionStats";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useStore } from "../store";
import { Timer as TimerIcon, Dumbbell, Brain, Music, Flame, CalendarDays, Trophy } from "lucide-react";

const TABS = [
  { id: "timer", icon: TimerIcon, label: "Timer" },
  { id: "journal", icon: Dumbbell, label: "Journal" },
  { id: "9round", icon: Flame, label: "9-Round" },
  { id: "coach", icon: Brain, label: "Coach" },
  { id: "program", icon: CalendarDays, label: "Program" },
  { id: "recap", icon: Trophy, label: "Recap" },
  { id: "music", icon: Music, label: "Music" },
];

export function PhoneLayout() {
  const [showSetup, setShowSetup] = useState(false);
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

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
        <AnimatePresence mode="wait">
          {activeTab === "timer" && (
            <motion.div
              key="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              {showSetup ? (
                <WorkoutSetup onClose={() => setShowSetup(false)} />
              ) : (
                <>
                  <Timer />
                  <div className="w-full">
                    <HeartRate />
                  </div>
                  <SessionStats />
                </>
              )}
            </motion.div>
          )}
          {activeTab === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <WorkoutJournal />
            </motion.div>
          )}
          {activeTab === "9round" && (
            <motion.div key="9round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <NineRound />
            </motion.div>
          )}
          {activeTab === "coach" && (
            <motion.div key="coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <AiCoach />
            </motion.div>
          )}
          {activeTab === "program" && (
            <motion.div key="program" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <ProgramView />
            </motion.div>
          )}
          {activeTab === "recap" && (
            <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SessionRecap />
            </motion.div>
          )}
          {activeTab === "music" && (
            <motion.div key="music" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-96">
              <NowPlaying />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Controls */}
      <div className="relative z-10 px-4 py-3 border-t border-white/[0.04] flex justify-center">
        <Controls onSetup={() => { setActiveTab("timer"); setShowSetup(!showSetup); }} />
      </div>

      {/* Bottom tab bar */}
      <nav className="relative z-10 flex border-t border-white/[0.04] bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground/40"
              }`}
            >
              <Icon className="h-5 w-5" />
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
      </nav>
    </div>
  );
}
