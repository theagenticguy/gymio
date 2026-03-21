import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const useStore = create(
  persist(
    (set, get) => ({
      // User
      user: { label: "", value: "" },
      setUser: (user) => set({ user }),

      // Active tab (persists across refreshes)
      activeTab: "timer",
      setActiveTab: (activeTab) => set({ activeTab }),

      // Workout config
      workout: { rounds: 3, train: 180, rest: 60 },
      setWorkout: (workout) => set({ workout }),

      // Workout type
      workoutType: "cardio",
      setWorkoutType: (workoutType) => set({ workoutType }),

      // 9-Round workout (persists so it survives tab changes)
      nineRound: null,
      setNineRound: (nineRound) => set({ nineRound }),
      nineRoundConfig: { roundDuration: 180, restDuration: 30 },
      setNineRoundConfig: (config) => set({ nineRoundConfig: config }),
      nineRoundActiveCard: 0,
      setNineRoundActiveCard: (idx) => set({ nineRoundActiveCard: idx }),

      // Timer state (from WebSocket)
      timer: { remaining: 0, duration: 0, phase: "idle", round: 0, totalRounds: 0 },
      setTimer: (timer) => set({ timer }),

      // Lights state (from WebSocket)
      lights: { color: "off", mode: "solid" },
      setLights: (lights) => set({ lights }),

      // Now playing (from WebSocket)
      nowPlaying: { title: "", artist: "", album: "", albumArt: "", duration: "", position: "" },
      setNowPlaying: (nowPlaying) => set({ nowPlaying }),

      // Button rest (from WebSocket — physical GPIO button)
      buttonRest: { active: false, remaining: 0, duration: 0, press: 0 },
      setButtonRest: (buttonRest) => set({ buttonRest }),

      // HR (from WebSocket — expanded with zone + HRV)
      hr: { bpm: 0, zone: 0, zoneName: "", zoneColor: "#6b7280", zonePct: 0 },
      setHr: (hr) => set({ hr }),

      // HRV (from WebSocket)
      hrv: { rmssd: null, sdnn: null, recoveryScore: null },
      setHrv: (hrv) => set({ hrv }),

      // HR connection status
      hrStatus: { connected: false, address: null },
      setHrStatus: (status) => set({ hrStatus: status }),

      // HR history (last 5 minutes = 300 points at 1Hz)
      hrHistory: [],
      addHrPoint: (point) =>
        set((state) => ({
          hrHistory: [...state.hrHistory.slice(-299), point],
        })),

      // Recent PRs (live from WebSocket, ephemeral — for celebration animations)
      recentPrs: [],
      addPr: (pr) =>
        set((state) => ({
          recentPrs: [...state.recentPrs.slice(-9), pr],
        })),
      clearPrs: () => set({ recentPrs: [] }),

      // API URL
      apiUrl: API_URL,
    }),
    {
      name: "gymio-storage",
      partialize: (state) => ({
        user: state.user,
        activeTab: state.activeTab,
        workout: state.workout,
        workoutType: state.workoutType,
        nineRound: state.nineRound,
        nineRoundConfig: state.nineRoundConfig,
        nineRoundActiveCard: state.nineRoundActiveCard,
      }),
    }
  )
);
