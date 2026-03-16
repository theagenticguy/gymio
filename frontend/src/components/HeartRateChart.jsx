import { useStore } from "../store";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Heart } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { motion, AnimatePresence } from "motion/react";

const ZONE_COLORS = ["#3f3f46", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const ZONE_NAMES = ["", "Recovery", "Fat Burn", "Cardio", "Hard", "Peak"];

export function HeartRateChart() {
  const hr = useStore((s) => s.hr);
  const hrHistory = useStore((s) => s.hrHistory);
  const { bpm, zone } = hr;
  const zoneColor = ZONE_COLORS[zone] || ZONE_COLORS[0];

  const chartData = hrHistory.map((p, i) => ({
    idx: i,
    bpm: p.bpm,
  }));

  return (
    <Card className="border-0 bg-transparent">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 mb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={bpm}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <Heart className="h-5 w-5" style={{ color: zoneColor }} fill={zoneColor} />
              <span className="display-number text-4xl font-bold" style={{ color: zoneColor }}>
                {bpm || "--"}
              </span>
              <span className="text-sm text-muted-foreground">bpm</span>
            </motion.div>
          </AnimatePresence>
          {zone > 0 && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: zoneColor + "20", color: zoneColor }}
            >
              Zone {zone} - {ZONE_NAMES[zone]}
            </span>
          )}
        </div>

        {chartData.length > 5 && (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={zoneColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={zoneColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[60, 200]} hide />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke={zoneColor}
                strokeWidth={2}
                fill="url(#hrGradient)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
