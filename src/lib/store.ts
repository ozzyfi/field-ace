// Simple localStorage-backed reactive store for jobs.
// Uses useSyncExternalStore so React components re-render on changes.

import { useSyncExternalStore } from "react";
import {
  initialJobs,
  type ClosureSummary,
  type Evidence,
  type HoldSummary,
  type Job,
  type JobStatus,
} from "./mock-data";

const STORAGE_KEY = "toola.jobs.v1";

let state: Job[] = load();
const listeners = new Set<() => void>();

function load(): Job[] {
  if (typeof window === "undefined") return initialJobs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialJobs;
    return JSON.parse(raw) as Job[];
  } catch {
    return initialJobs;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useJobs(): Job[] {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initialJobs,
  );
}

export function useJob(id: string | undefined): Job | undefined {
  const jobs = useJobs();
  return jobs.find((j) => j.id === id);
}

export function updateJob(id: string, patch: (job: Job) => Job) {
  state = state.map((j) => (j.id === id ? patch(j) : j));
  emit();
}

export function setStatus(id: string, status: JobStatus) {
  updateJob(id, (j) => ({ ...j, status }));
}

export function addEvidence(id: string, ev: Omit<Evidence, "id" | "createdAt">) {
  updateJob(id, (j) => ({
    ...j,
    evidence: [
      ...j.evidence,
      { ...ev, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() },
    ],
  }));
}

export function removeEvidence(jobId: string, evId: string) {
  updateJob(jobId, (j) => ({ ...j, evidence: j.evidence.filter((e) => e.id !== evId) }));
}

export function closeJob(id: string, summary: ClosureSummary) {
  updateJob(id, (j) => ({ ...j, status: "tamamlandi", closure: summary, hold: undefined }));
}

export function holdJob(id: string, hold: HoldSummary) {
  updateJob(id, (j) => ({ ...j, status: "beklemede", hold }));
}

export function resetJobs() {
  state = initialJobs;
  emit();
}
