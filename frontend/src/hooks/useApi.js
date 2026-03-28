import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "../store";

function getApiUrl() {
  return useStore.getState().apiUrl;
}

async function api(path, options = {}) {
  const url = getApiUrl() + path;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

// Workout control
export function useStartWorkout() {
  return useMutation({
    mutationFn: (workout) =>
      api("/start", { method: "POST", body: JSON.stringify(workout) }),
  });
}

export function useStopWorkout() {
  return useMutation({
    mutationFn: () => api("/stop"),
  });
}

export function usePauseWorkout() {
  return useMutation({
    mutationFn: () => api("/pause"),
  });
}

export function useResumeWorkout() {
  return useMutation({
    mutationFn: () => api("/resume"),
  });
}

// Button rest duration
export function useButtonDuration() {
  return useQuery({
    queryKey: ["buttonDuration"],
    queryFn: () => api("/button_duration"),
  });
}

export function useSetButtonDuration() {
  return useMutation({
    mutationFn: (duration) =>
      api("/button_duration", {
        method: "POST",
        body: JSON.stringify({ duration }),
      }),
  });
}

export function useButtonStop() {
  return useMutation({
    mutationFn: () => api("/button/stop", { method: "POST" }),
  });
}

// Sonos
export function useSonosNowPlaying() {
  return useQuery({
    queryKey: ["sonosNowPlaying"],
    queryFn: () => api("/sonos/now-playing"),
    refetchInterval: 5000,
  });
}

export function useSonosControl() {
  return {
    play: useMutation({ mutationFn: () => api("/sonos/play", { method: "POST" }) }),
    pause: useMutation({ mutationFn: () => api("/sonos/pause", { method: "POST" }) }),
    next: useMutation({ mutationFn: () => api("/sonos/next", { method: "POST" }) }),
    volume: useMutation({
      mutationFn: (volume) =>
        api("/sonos/volume", { method: "POST", body: JSON.stringify({ volume }) }),
    }),
  };
}

// Workout journal
export function useLogSet() {
  return useMutation({
    mutationFn: (setData) =>
      api("/workouts/log", { method: "POST", body: JSON.stringify(setData) }),
  });
}

export function useWorkoutHistory(params) {
  return useQuery({
    queryKey: ["workoutHistory", params],
    queryFn: () => {
      const qs = new URLSearchParams(params).toString();
      return api(`/workouts/history?${qs}`);
    },
    enabled: !!params?.user,
  });
}

export function useWorkoutStats() {
  return useQuery({
    queryKey: ["workoutStats"],
    queryFn: () => api("/workouts/stats"),
  });
}

// Exercise catalog
export function useExerciseCatalog(searchText) {
  return useQuery({
    queryKey: ["exerciseCatalog", searchText],
    queryFn: () => {
      const params = searchText ? `?q=${encodeURIComponent(searchText)}` : "";
      return api(`/exercises/catalog${params}`);
    },
    enabled: searchText?.length >= 1,
    staleTime: 60_000,
  });
}

export function useSeedExercises() {
  return useMutation({
    mutationFn: () => api("/exercises/seed", { method: "POST" }),
  });
}

// AI Coach
export function useAiSuggest() {
  return useMutation({
    mutationFn: (context) =>
      api("/ai/suggest", { method: "POST", body: JSON.stringify(context) }),
  });
}

export function useAiSuggestLatest(user, goal) {
  return useQuery({
    queryKey: ["aiSuggestLatest", user, goal],
    queryFn: () => {
      const params = new URLSearchParams({ user });
      if (goal) params.set("goal", goal);
      return api(`/ai/suggest/latest?${params}`);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useAiAnalyzeLatest(user) {
  return useQuery({
    queryKey: ["aiAnalyzeLatest", user],
    queryFn: () => api(`/ai/analyze/latest?user=${encodeURIComponent(user)}`),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

// 9-Round
export function useNineRoundLatest(user) {
  return useQuery({
    queryKey: ["nineRoundLatest", user],
    queryFn: () => api(`/nine-round/latest?user=${encodeURIComponent(user)}`),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

// Session Recap
export function useSessionRecap(user, sessionDate) {
  return useQuery({
    queryKey: ["sessionRecap", user, sessionDate],
    queryFn: () => {
      const params = new URLSearchParams({ user });
      if (sessionDate) params.set("session_date", sessionDate);
      return api(`/workouts/session-recap?${params}`);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function usePersonalRecords(user) {
  return useQuery({
    queryKey: ["personalRecords", user],
    queryFn: () => api(`/workouts/prs?user=${encodeURIComponent(user)}`),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

// Programs
export function useActiveProgram(user) {
  return useQuery({
    queryKey: ["activeProgram", user],
    queryFn: () => api(`/programs/active?user=${encodeURIComponent(user)}`),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useGenerateProgram() {
  return useMutation({
    mutationFn: (params) =>
      api("/programs/generate", { method: "POST", body: JSON.stringify(params) }),
  });
}

export function useProgramCompliance(programId) {
  return useQuery({
    queryKey: ["programCompliance", programId],
    queryFn: () => api(`/programs/${programId}/compliance`),
    enabled: !!programId,
    staleTime: 60_000,
  });
}

export function useDeactivateProgram() {
  return useMutation({
    mutationFn: (programId) =>
      api(`/programs/${programId}`, { method: "DELETE" }),
  });
}

// Heart Rate
export function useHrStatus() {
  return useQuery({
    queryKey: ["hrStatus"],
    queryFn: () => api("/hr/status"),
    refetchInterval: 10_000,
  });
}

export function useHrConnect() {
  return useMutation({
    mutationFn: (params = {}) =>
      api("/hr/connect", { method: "POST", body: JSON.stringify(params) }),
  });
}

export function useHrDisconnect() {
  return useMutation({
    mutationFn: () => api("/hr/disconnect", { method: "POST" }),
  });
}
