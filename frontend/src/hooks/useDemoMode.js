import { useEffect, useRef } from "react";
import { useStore } from "../store";

/**
 * Simulates a live workout with cycling timer phases, heart rate + HRV data,
 * and a now-playing track. Activate with ?demo=true in the URL.
 */
export function useDemoMode() {
  const params = new URLSearchParams(window.location.search);
  const isDemo = params.get("demo") === "true";
  const intervalRef = useRef(null);
  const phaseRef = useRef(0);
  const remainingRef = useRef(0);

  const setTimer = useStore((s) => s.setTimer);
  const setLights = useStore((s) => s.setLights);
  const setNowPlaying = useStore((s) => s.setNowPlaying);
  const setHr = useStore((s) => s.setHr);
  const setHrv = useStore((s) => s.setHrv);
  const setHrStatus = useStore((s) => s.setHrStatus);
  const addHrPoint = useStore((s) => s.addHrPoint);

  useEffect(() => {
    if (!isDemo) return;

    // Mark HR as connected
    setHrStatus({ connected: true, address: "DEMO" });

    // Set now-playing immediately
    setNowPlaying({
      title: "Lose Yourself",
      artist: "Eminem",
      album: "8 Mile OST",
      albumArt: "https://i.scdn.co/image/ab67616d0000b273aa08fe0690aaf4453bb2cff4",
      duration: "5:26",
      position: "2:13",
    });

    // Workout phases
    const phases = [
      { phase: "warning", seconds: 3, color: "yellow", round: 1 },
      { phase: "train", seconds: 170, color: "green", round: 1 },
      { phase: "warning", seconds: 10, color: "yellow", round: 1 },
      { phase: "rest", seconds: 50, color: "red", round: 1 },
      { phase: "warning", seconds: 10, color: "yellow", round: 1 },
      { phase: "train", seconds: 170, color: "green", round: 2 },
      { phase: "warning", seconds: 10, color: "yellow", round: 2 },
      { phase: "rest", seconds: 50, color: "red", round: 2 },
      { phase: "warning", seconds: 10, color: "yellow", round: 2 },
      { phase: "train", seconds: 170, color: "green", round: 3 },
      { phase: "warning", seconds: 10, color: "yellow", round: 3 },
    ];
    const totalRounds = 3;

    phaseRef.current = 1;
    remainingRef.current = 134;

    const p = phases[phaseRef.current];
    setTimer({ remaining: remainingRef.current, phase: p.phase, round: p.round, totalRounds });
    setLights({ color: p.color, mode: "solid" });

    // Simulated HRV state
    let rmssdBase = 45;

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;

      if (remainingRef.current <= 0) {
        phaseRef.current = (phaseRef.current + 1) % phases.length;
        const next = phases[phaseRef.current];
        remainingRef.current = next.seconds;
        setLights({ color: next.color, mode: next.phase === "warning" ? "blink" : "solid" });
      }

      const current = phases[phaseRef.current];
      setTimer({ remaining: remainingRef.current, phase: current.phase, round: current.round, totalRounds });

      // Realistic HR simulation
      const baseHr = current.phase === "train" ? 158 : current.phase === "rest" ? 118 : 142;
      const noise = Math.floor(Math.random() * 12) - 6;
      const bpm = baseHr + noise;

      // Zone calculation (max_hr = 190)
      const pct = (bpm / 190) * 100;
      let zone, zoneName, zoneColor;
      if (pct >= 90) { zone = 5; zoneName = "Peak"; zoneColor = "#ef4444"; }
      else if (pct >= 80) { zone = 4; zoneName = "Hard"; zoneColor = "#f97316"; }
      else if (pct >= 70) { zone = 3; zoneName = "Cardio"; zoneColor = "#eab308"; }
      else if (pct >= 60) { zone = 2; zoneName = "Fat Burn"; zoneColor = "#22c55e"; }
      else if (pct >= 50) { zone = 1; zoneName = "Warm Up"; zoneColor = "#3b82f6"; }
      else { zone = 0; zoneName = "Recovery"; zoneColor = "#6b7280"; }

      setHr({ bpm, zone, zoneName, zoneColor, zonePct: Math.round(pct) });
      addHrPoint({ time: Date.now(), bpm, zone });

      // Simulated HRV — drifts based on phase
      rmssdBase += (current.phase === "rest" ? 0.3 : -0.15) + (Math.random() - 0.5) * 2;
      rmssdBase = Math.max(15, Math.min(80, rmssdBase));
      const recoveryScore = Math.min(100, Math.max(0, Math.round((rmssdBase / 80) * 100)));
      setHrv({ rmssd: Math.round(rmssdBase * 10) / 10, sdnn: Math.round(rmssdBase * 1.3), recoveryScore });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isDemo, setTimer, setLights, setNowPlaying, setHr, setHrv, setHrStatus, addHrPoint]);

  return isDemo;
}
