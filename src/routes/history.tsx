import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, PauseCircle } from "lucide-react";
import { BottomTabs } from "@/components/BottomTabs";
import { useJobs } from "@/lib/store";
import { holdReasonLabel, type Job } from "@/lib/mock-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Geçmiş · ToolA Teknisyen" },
      {
        name: "description",
        content: "Tamamlanan ve beklemedeki işler, eski kapanış kayıtları.",
      },
    ],
  }),
  component: HistoryScreen,
});

export default function HistoryScreen() {
  const jobs = useJobs();
  const done = jobs.filter((j) => j.status === "tamamlandi");
  const held = jobs.filter((j) => j.status === "beklemede");

  return (
    <div className="app-shell flex flex-col">
      <header className="px-5 pb-2 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          ToolA · Kayıt
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Geçmiş</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Kapanan, beklemede ve eski kapanış kayıtların
        </p>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-4 pt-4">
        {held.length > 0 ? (
          <Section title="Beklemedeki işler">
            <ul className="space-y-2">
              {held.map((j) => (
                <li key={j.id}>
                  <HeldRow job={j} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title={`Kapanan işler${done.length ? ` (${done.length})` : ""}`}>
          {done.length === 0 ? (
            <div className="card-surface px-4 py-6 text-center text-sm text-muted-foreground">
              Henüz tamamlanan iş yok.
            </div>
          ) : (
            <ul className="space-y-2">
              {done.map((j) => (
                <li key={j.id}>
                  <DoneRow job={j} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>

      <BottomTabs />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function DoneRow({ job }: { job: Job }) {
  return (
    <Link
      to="/jobs/$jobId/summary"
      params={{ jobId: job.id }}
      className="card-surface flex items-start gap-3 px-3 py-3 active:scale-[0.995]"
    >
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{job.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {job.equipment} · {job.location}
        </p>
        {job.closure ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Kök neden: <span className="text-foreground">{job.closure.rootCause}</span>
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function HeldRow({ job }: { job: Job }) {
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="card-surface flex items-start gap-3 px-3 py-3 active:scale-[0.995]"
    >
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-warning/25 text-warning-foreground">
        <PauseCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{job.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {job.equipment} · {job.location}
        </p>
        {job.hold ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {holdReasonLabel[job.hold.reason]} · Sorumlu:{" "}
            <span className="text-foreground">{job.hold.owner}</span>
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
