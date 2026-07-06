import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock,
  History,
  MapPin,
  Package,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useJob } from "@/lib/store";
import {
  historyKindLabel,
  priorityLabel,
  sourceLabel,
  statusLabel,
  taskTypeLabel,
} from "@/lib/mock-data";

export const Route = createFileRoute("/jobs/$jobId/")({
  head: () => ({
    meta: [
      { title: "İş Detayı · ToolA Teknisyen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();

  if (!job) return <NotFound />;

  const primaryLabel =
    job.status === "tamamlandi" || job.status === "beklemede"
      ? "Özeti gör"
      : "Devam et";

  const onPrimary = () => {
    if (job.status === "tamamlandi" || job.status === "beklemede") {
      navigate({ to: "/jobs/$jobId/summary", params: { jobId: job.id } });
    } else {
      navigate({ to: "/jobs/$jobId/evidence", params: { jobId: job.id } });
    }
  };

  return (
    <AppShell
      title={job.code}
      subtitle={taskTypeLabel[job.taskType]}
      back="/"
      footer={
        <button type="button" onClick={onPrimary} className="btn-primary">
          {primaryLabel}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="chip bg-danger/10 text-danger">
              {taskTypeLabel[job.taskType]}
            </span>
            <span className="chip bg-warning/20 text-warning-foreground">
              {priorityLabel[job.priority]}
            </span>
            <span className="chip bg-secondary text-muted-foreground">
              {statusLabel[job.status]}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-semibold leading-snug">{job.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>
        </div>

        <div className="card-surface divide-y divide-border">
          <InfoRow icon={<Zap className="h-4 w-4" />} label="Ekipman" value={job.equipment} />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Lokasyon" value={job.location} />
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Atayan"
            value={`${job.assignedBy} · ${sourceLabel[job.source]}`}
          />
          {job.dueAt ? (
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Son tarih"
              value={new Date(job.dueAt).toLocaleString("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          ) : null}
        </div>

        {job.centralNote ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warning-foreground/70">
                Merkez notu
              </p>
              <p className="mt-0.5 text-foreground">{job.centralNote}</p>
            </div>
          </div>
        ) : null}

        {job.bringItems.length > 0 ? (
          <section>
            <div className="mb-1 flex items-center gap-2 px-1">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yanına Al
              </span>
            </div>
            <p className="mb-2 px-1 text-xs text-muted-foreground">
              Sahaya gitmeden önce önerilen ekipman ve kontroller
            </p>
            <ul className="card-surface divide-y divide-border">
              {job.bringItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {job.history.length > 0 ? (
          <section>
            <div className="mb-1 flex items-center gap-2 px-1">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ekipman Geçmişi
              </span>
            </div>
            <p className="mb-2 px-1 text-xs text-muted-foreground">
              Bu ekipmanda kayıtlı son işlemler
            </p>
            <ul className="card-surface divide-y divide-border">
              {job.history.map((h) => (
                <li key={h.id} className="px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground">
                      {historyKindLabel[h.kind]}
                    </span>
                    <span className="text-xs text-muted-foreground">{h.date}</span>
                  </div>
                  <p className="mt-0.5 font-medium">{h.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    → {h.action}
                    {h.partChanged ? ` (${h.partChanged})` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-3 px-3 py-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <AppShell title="İş bulunamadı" back="/">
      <p className="text-sm text-muted-foreground">Bu iş kaydına erişilemedi.</p>
    </AppShell>
  );
}
