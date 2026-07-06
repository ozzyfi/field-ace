import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, PauseCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { holdReasonLabel } from "@/lib/mock-data";
import { useJob } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/summary")({
  head: () => ({
    meta: [{ title: "Özet · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: Summary,
});

function Summary() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  if (!job) return null;

  const closed = job.status === "tamamlandi" && job.closure;
  const held = job.status === "beklemede" && job.hold;

  return (
    <AppShell
      title={closed ? "İş kapatıldı" : held ? "Beklemeye alındı" : "Özet"}
      subtitle={job.code}
      back="/"
      footer={
        <Link to="/" className="btn-primary">
          İşlerime dön
        </Link>
      }
    >
      <div className="space-y-4">
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
            closed
              ? "bg-success/15 text-success"
              : held
                ? "bg-warning/20 text-warning-foreground"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          {closed ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <PauseCircle className="h-6 w-6" />
          )}
          <div>
            <div className="text-sm font-semibold">
              {closed ? "Kanıtlı kapanış tamamlandı" : held ? "İş beklemede" : ""}
            </div>
            <div className="text-xs opacity-80">
              {closed
                ? new Date(job.closure!.closedAt).toLocaleString("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : held
                  ? new Date(job.hold!.heldAt).toLocaleString("tr-TR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : ""}
            </div>
          </div>
        </div>

        <div className="card-surface px-4 py-3">
          <h2 className="text-base font-semibold">{job.title}</h2>
          <p className="text-sm text-muted-foreground">
            {job.equipment} · {job.location}
          </p>
        </div>

        {closed ? (
          <div className="card-surface divide-y divide-border">
            <Row label="Belirti" value={job.closure!.symptom} />
            <Row label="Kök neden" value={job.closure!.rootCause} />
            <Row label="Müdahale" value={job.closure!.action} />
            {job.closure!.partUsed ? (
              <Row label="Kullanılan parça" value={job.closure!.partUsed} />
            ) : null}
            <Row label="Sonuç" value={job.closure!.result} />
            <Row label="Son test" value={job.closure!.testDone ? "Yapıldı" : "Yapılmadı"} />
            {job.closure!.memoryCandidate ? (
              <Row label="Hafızaya aday not" value={job.closure!.memoryCandidate} />
            ) : null}
          </div>
        ) : null}

        {held ? (
          <div className="card-surface divide-y divide-border">
            <Row label="Neden" value={holdReasonLabel[job.hold!.reason]} />
            {job.hold!.checked ? <Row label="Kontrol edildi" value={job.hold!.checked} /> : null}
            <Row label="Kapanmama sebebi" value={job.hold!.whyNotClosing} />
            <Row label="Sonraki aksiyon" value={job.hold!.nextAction} />
            <Row label="Sorumlu" value={job.hold!.owner} />
          </div>
        ) : null}

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kanıtlar ({job.evidence.length})
          </div>
          {job.evidence.length === 0 ? (
            <div className="card-surface px-3 py-3 text-sm text-muted-foreground">
              Kanıt yok.
            </div>
          ) : (
            <ul className="card-surface divide-y divide-border">
              {job.evidence.map((ev) => (
                <li key={ev.id} className="px-3 py-2 text-sm">
                  <span className="chip mr-2 bg-secondary text-muted-foreground">
                    {ev.label}
                  </span>
                  {ev.value ?? ev.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
