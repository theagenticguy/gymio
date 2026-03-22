import { useStore } from "../store";
import { AreaChart, Area, YAxis, ResponsiveContainer } from "recharts";
import { Heart, Activity, Bluetooth, BluetoothOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useHrConnect } from "../hooks/useApi";

const ZONE_COLORS = ["#6b7280", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const ZONE_NAMES = ["Recovery", "Warm Up", "Fat Burn", "Cardio", "Hard", "Peak"];

function RecoveryGauge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label = score >= 70 ? "Good" : score >= 40 ? "Fair" : "Low";
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] @lg:text-xl uppercase tracking-widest text-foreground">Recovery</span>
        <span className="display-number text-xs @lg:text-3xl font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="h-1.5 @lg:h-3 rounded-full bg-white/5 overflow-hidden">
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

  const hrConnect = useHrConnect();

  if (compact) {
    if (!hrStatus.connected && !bpm) {
      return (
        <button
          onClick={() => hrConnect.mutate({ max_hr: 190 })}
          disabled={hrConnect.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Connect heart rate monitor"
        >
          <BluetoothOff className="h-3.5 w-3.5" />
          {hrConnect.isPending ? "Connecting..." : "HR"}
        </button>
      );
    }
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

  return (
    <div className="glass rounded-2xl p-5 @lg:p-8 space-y-4 @lg:space-y-6">
      {/* BPM + Zone */}
      <div className="flex items-end justify-between">
        <div className="flex items-end gap-3 @lg:gap-5">
          <div className="relative self-center">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: parseFloat(beatDuration) || 1, repeat: Infinity }}
            />
            <Heart
              className="h-6 w-6 @lg:h-12 @lg:w-12 relative heartbeat-dynamic"
              style={{ color, fill: color, "--beat-duration": beatDuration }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.span
              key={bpm}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="display-number text-5xl @lg:text-8xl font-black leading-none"
              style={{ color }}
            >
              {bpm || "--"}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm @lg:text-3xl text-foreground pb-1">bpm</span>
        </div>

        {zone > 0 && (
          <motion.div
            key={zone}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-end gap-1"
          >
            <span
              className="text-xs @lg:text-2xl px-3 @lg:px-6 py-1 @lg:py-2 font-bold rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              Zone {zone}
            </span>
            <span className="text-[10px] @lg:text-xl text-foreground">{name}</span>
          </motion.div>
        )}
      </div>

      {/* Zone bar */}
      <div className="relative">
        <div className="zone-gradient h-2 @lg:h-3 rounded-full opacity-40" />
        {bpm > 0 && (
          <motion.div
            className="absolute top-[-3px] @lg:top-[-4px] h-4 w-4 @lg:h-5 @lg:w-5 rounded-full border-2 border-background"
            style={{ backgroundColor: color, left: `${Math.min(95, Math.max(5, hr.zonePct))}%` }}
            animate={{ left: `${Math.min(95, Math.max(5, hr.zonePct))}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        )}
      </div>

      {/* Sparkline */}
      {chartData.length > 5 && (
        <div className="h-[80px] @lg:h-[120px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[50, 200]} hide />
              <Area type="monotone" dataKey="bpm" stroke={color} strokeWidth={2} fill="url(#hrFill)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HRV row */}
      {(hrv.rmssd != null || hrv.recoveryScore != null) && (
        <div className="grid grid-cols-2 gap-4 @lg:gap-8 pt-1">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] @lg:text-xl uppercase tracking-widest text-foreground flex items-center gap-2">
              <Activity className="h-3 w-3 @lg:h-6 @lg:w-6" /> HRV (RMSSD)
            </span>
            <span className="display-number text-xl @lg:text-5xl font-bold text-foreground">
              {hrv.rmssd != null ? `${hrv.rmssd}ms` : "--"}
            </span>
          </div>
          <RecoveryGauge score={hrv.recoveryScore} />
        </div>
      )}

      {/* Connection */}
      <div className="flex items-center gap-2 pt-1">
        {hrStatus.connected ? (
          <Bluetooth className="h-3 w-3 @lg:h-6 @lg:w-6 text-blue-400" />
        ) : (
          <BluetoothOff className="h-3 w-3 @lg:h-6 @lg:w-6 text-foreground" />
        )}
        <span className="text-[10px] @lg:text-xl text-foreground">
          {hrStatus.connected ? "Connected" : "No HR monitor"}
        </span>
      </div>
    </div>
  );
}

export const HeartRateChart = HeartRate;
