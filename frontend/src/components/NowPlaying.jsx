import { motion } from "motion/react";
import { Play, Pause, SkipForward, Volume2, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { useStore } from "../store";
import { useSonosControl } from "../hooks/useApi";
import { useState } from "react";

export function NowPlaying() {
  const nowPlaying = useStore((s) => s.nowPlaying);
  const { title, artist, album, albumArt } = nowPlaying;
  const sonos = useSonosControl();
  const [volume, setVolume] = useState(30);
  const [isPlaying, setIsPlaying] = useState(true);

  const hasTrack = title && title.length > 0;

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Blurred album art background */}
      {hasTrack && albumArt && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${albumArt})`,
            filter: "blur(60px) saturate(1.5)",
            opacity: 0.15,
            transform: "scale(1.3)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-5 gap-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
          Now Playing
        </span>

        {hasTrack ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-5 flex-1"
          >
            {/* Album art */}
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/5 shadow-2xl">
              {albumArt ? (
                <motion.img
                  src={albumArt}
                  alt={album}
                  className="w-full h-full object-cover"
                  layoutId="album-art"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-12 w-12 text-muted-foreground/20" />
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="text-center w-full space-y-0.5">
              <p className="font-bold text-sm truncate">{title}</p>
              <p className="text-xs text-muted-foreground/60 truncate">{artist}</p>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full hover:bg-white/10"
                onClick={() => {
                  if (isPlaying) sonos.pause.mutate();
                  else sonos.play.mutate();
                  setIsPlaying(!isPlaying);
                }}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-white/10"
                onClick={() => sonos.next.mutate()}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3 w-full mt-auto">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setVolume(v[0]);
                  sonos.volume.mutate(v[0]);
                }}
                className="flex-1"
              />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Music className="h-8 w-8 text-muted-foreground/15" />
            <p className="text-xs text-muted-foreground/70">No music playing</p>
          </div>
        )}
      </div>
    </div>
  );
}
