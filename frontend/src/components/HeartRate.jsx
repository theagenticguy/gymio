import { useStore } from "../store";
import { AreaChart, Area, YAxis, ResponsiveContainer } from "recharts";
import { Heart, Activity, Zap, Bluetooth, BluetoothOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ZONE_COLORS = ["#6b7280", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const ZONE_NAMES = ["Recovery", "Warm Up", "Fat Burn", "Cardio", "Hard", "Peak"];

function RecoveryGauge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label = score >= 70 ? "Good" : score >= 40 ? "Fair" : "Low";
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-secondary">Recovery</span>
        <span className="display-number text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function HeartRate({ compact = false }) {
  const hr = useStore((s) => s.hr);
  const hrv = useStore((s) => s.hrv);
  const hrStatus = useStore((s) => s.hrStatus);
  const hrHistory = useStore((s) => s.hrHistory);
  const { bpm, zone, zoneName, zoneColor } = hr;

  const color = zoneColor || ZONE_COLORS[zone] || ZONE_COLORS[0];
  const name = zoneName || ZONE_NAMES[zone] || "";
  const beatDuration = bpm > 0 ? `${60 / bpm}s` : "1s";

  const chartData = hrHistory.map((p, i) => ({ idx: i, bpm: p.bpm }));

  // Compact mode: just BPM + zone (for sidebar or inline use)
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Heart
          className="h-4 w-4 heartbeat-dynamic"
          style={{ color, fill: color, "--beat-duration": beatDuration }}
        />
        <span className="display-number text-2xl font-bold" style={{ color }}>
          {bpm || "--"}
        </span>
        {zone > 0 && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color + "20", color }}
          >
            Z{zone}
          </span>
        )}
      </div>
    );
  }

  // Full HR + HRV dashboard
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      {/* Header row: BPM + Zone */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Heartbeat icon */}
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: parseFloat(beatDuration) || 1, repeat: Infinity }}
            />
            <Heart
              className="h-6 w-6 relative heartbeat-dynamic"
              style={{ color, fill: color, "--beat-duration": beatDuration }}
            />
          </div>

          {/* BPM number */}
          <AnimatePresence mode="wait">
            <motion.span
              key={bpm}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="display-number text-5xl font-black"
              style={{ color }}
            >
              {bpm || "--"}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-text-secondary self-end pb-1">bpm</span>
        </div>

        {/* Zone badge */}
        {zone > 0 && (
          <motion.div
            key={zone}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-end gap-0.5"
          >
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              Zone {zone}
            </span>
            <span className="text-[10px] text-text-secondary">{name}</span>
          </motion.div>
        )}
      </div>

      {/* Zone bar — horizontal gradient with marker */}
      <div className="relative">
        <div className="zone-gradient h-2 rounded-full opacity-40" />
        {bpm > 0 && (
          <motion.div
            className="absolute top-[-3px] h-4 w-4 rounded-full border-2 border-background"
            style={{ backgroundColor: color, left: `${Math.min(95, Math.max(5, hr.zonePct))}%` }}
            animate={{ left: `${Math.min(95, Math.max(5, hr.zonePct))}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        )}
      </div>

      {/* Sparkline chart */}
      {chartData.length > 5 && (
        <div className="h-[80px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[50, 200]} hide />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke={color}
                strokeWidth={2}
                fill="url(#hrFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HRV metrics row */}
      {(hrv.rmssd != null || hrv.recoveryScore != null) && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          {/* RMSSD */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary flex items-center gap-1">
              <Activity className="h-3 w-3" /> HRV (RMSSD)
            </span>
            <span className="display-number text-xl font-bold text-foreground/90">
              {hrv.rmssd != null ? `${hrv.rmssd}ms` : "--"}
            </span>
          </div>

          {/* Recovery score */}
          <RecoveryGauge score={hrv.recoveryScore} />
        </div>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-2 pt-1">
        {hrStatus.connected ? (
          <Bluetooth className="h-3 w-3 text-blue-400" />
        ) : (
          <BluetoothOff className="h-3 w-3 text-text-secondary" />
        )}
        <span className="text-[10px] text-text-secondary">
          {hrStatus.connected ? "Connected" : "No HR monitor"}
        </span>
      </div>
    </div>
  );
}

// Keep the old name as an alias for backward compat in imports
export const HeartRateChart = HeartRate;
