import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Clock, MapPin, Zap } from "lucide-react";
import { useJobs } from "@/lib/store";
import {
  priorityLabel,
  sourceLabel,
  statusLabel,
  taskTypeLabel,
  type Job,
  type Priority,
  type TaskType,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "İşlerim · ToolA Teknisyen" },
      {
        name: "description",
        content: "Sana atanan saha işlerini gör, sıradakini aç, sahaya çık.",
      },
    ],
  }),
  component: JobsIndex,
});

function JobsIndex() {
  const jobs = useJobs();
  const open = jobs.filter((j) => j.status !== "tamamlandi");
  const done = jobs.filter((j) => j.status === "tamamlandi");
  const featured = open.find((j) => j.featured) ?? open[0];
  const rest = open.filter((j) => j.id !== featured?.id);

  return (
    <div className="app-shell flex flex-col">
      <header className="px-5 pb-2 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ToolA · Teknisyen
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">İşlerim</h1>
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">{open.length} açık</div>
            <div>{done.length} tamamlanan</div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-16 pt-4">
        {featured ? (
          <section>
            <SectionLabel>Sıradaki iş</SectionLabel>
            <FeaturedJobCard job={featured} />
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section>
            <SectionLabel>Diğer açık işler</SectionLabel>
            <ul className="space-y-2">
              {rest.map((job) => (
                <li key={job.id}>
                  <JobRow job={job} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {done.length > 0 ? (
          <section>
            <SectionLabel>Bugün tamamlanan</SectionLabel>
            <ul className="space-y-2">
              {done.map((job) => (
                <li key={job.id}>
                  <JobRow job={job} muted />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {open.length === 0 && done.length === 0 ? (
          <div className="card-surface p-6 text-center text-sm text-muted-foreground">
            Sana atanmış açık iş yok.
          </div>
        ) : null}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function FeaturedJobCard({ job }: { job: Job }) {
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="card-surface block overflow-hidden active:scale-[0.995]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TaskChip type={job.taskType} />
            <PriorityChip priority={job.priority} />
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {job.code} · {sourceLabel[job.source]}
          </p>
        </div>
        <StatusPill status={job.status} />
      </div>

      <div className="px-4 pb-4 pt-3">
        <h2 className="text-lg font-semibold leading-snug text-foreground">{job.title}</h2>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.equipment}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          {job.dueAt ? (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDue(job.dueAt)}</span>
            </div>
          ) : null}
        </div>

        {job.centralNote ? (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-warning/15 px-3 py-2 text-xs text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>{job.centralNote}</span>
          </div>
        ) : null}

        <div className="mt-4 btn-primary">
          İşi aç
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function JobRow({ job, muted }: { job: Job; muted?: boolean }) {
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className={`card-surface flex items-center gap-3 px-3 py-3 active:scale-[0.995] ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TaskChip type={job.taskType} size="sm" />
          <PriorityChip priority={job.priority} size="sm" />
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{job.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {job.equipment} · {job.location}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusPill status={job.status} size="sm" />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function TaskChip({ type, size = "md" }: { type: TaskType; size?: "sm" | "md" }) {
  const map: Record<TaskType, string> = {
    ariza: "bg-danger/10 text-danger",
    bakim: "bg-info/10 text-info",
    kurulum: "bg-accent/20 text-accent-foreground",
    test: "bg-success/10 text-success",
  };
  return (
    <span className={`chip ${map[type]} ${size === "sm" ? "text-[10px]" : ""}`}>
      {taskTypeLabel[type]}
    </span>
  );
}

function PriorityChip({ priority, size = "md" }: { priority: Priority; size?: "sm" | "md" }) {
  const map: Record<Priority, string> = {
    dusuk: "bg-muted text-muted-foreground",
    orta: "bg-info/10 text-info",
    yuksek: "bg-warning/25 text-warning-foreground",
    kritik: "bg-danger text-danger-foreground",
  };
  return (
    <span className={`chip ${map[priority]} ${size === "sm" ? "text-[10px]" : ""}`}>
      {priorityLabel[priority]}
    </span>
  );
}

function StatusPill({
  status,
  size = "md",
}: {
  status: Job["status"];
  size?: "sm" | "md";
}) {
  const map: Record<Job["status"], string> = {
    atandi: "bg-secondary text-muted-foreground",
    yoldayim: "bg-info/15 text-info",
    sahadayim: "bg-accent/25 text-accent-foreground",
    teshis: "bg-info/15 text-info",
    beklemede: "bg-warning/25 text-warning-foreground",
    tamamlandi: "bg-success/15 text-success",
  };
  return (
    <span className={`chip ${map[status]} ${size === "sm" ? "text-[10px]" : ""}`}>
      {statusLabel[status]}
    </span>
  );
}

function formatDue(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours <= 0) return `${Math.abs(hours)} saat gecikmiş`;
  if (hours < 24) return `${hours} saat içinde`;
  return `${Math.round(hours / 24)} gün içinde`;
}
