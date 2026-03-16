import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store";

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const apiUrl = useStore((s) => s.apiUrl);
  const setTimer = useStore((s) => s.setTimer);
  const setLights = useStore((s) => s.setLights);
  const setNowPlaying = useStore((s) => s.setNowPlaying);
  const setHr = useStore((s) => s.setHr);
  const setHrv = useStore((s) => s.setHrv);
  const setHrStatus = useStore((s) => s.setHrStatus);
  const addHrPoint = useStore((s) => s.addHrPoint);
  const addPr = useStore((s) => s.addPr);

  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "timer":
          setTimer({
            remaining: msg.remaining,
            phase: msg.phase,
            round: msg.round,
            totalRounds: msg.total_rounds,
          });
          break;
        case "lights":
          setLights({ color: msg.color, mode: msg.mode });
          break;
        case "now_playing":
          setNowPlaying({
            title: msg.title,
            artist: msg.artist,
            album: msg.album,
            albumArt: msg.album_art,
            duration: msg.duration,
            position: msg.position,
          });
          break;
        case "hr":
          setHr({
            bpm: msg.bpm,
            zone: msg.zone,
            zoneName: msg.zone_name || "",
            zoneColor: msg.zone_color || "#6b7280",
            zonePct: msg.zone_pct || 0,
          });
          addHrPoint({ time: Date.now(), bpm: msg.bpm, zone: msg.zone });
          if (msg.hrv) {
            setHrv({
              rmssd: msg.hrv.rmssd,
              sdnn: msg.hrv.sdnn,
              recoveryScore: msg.hrv.recovery_score,
            });
          }
          break;
        case "hr_status":
          setHrStatus({
            connected: msg.connected,
            address: msg.address || null,
            error: msg.error || null,
          });
          break;
        case "pr":
          addPr({
            exercise: msg.exercise,
            new_e1rm: msg.new_e1rm,
            previous_e1rm: msg.previous_e1rm,
            time: Date.now(),
          });
          break;
      }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [wsUrl, setTimer, setLights, setNowPlaying, setHr, setHrv, setHrStatus, addHrPoint, addPr]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
