import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, PauseCircle, Sparkles, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getAiBrief } from "@/lib/ai-mock";
import { setStatus, useJob } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/ai")({
  head: () => ({
    meta: [{ title: "AI Teşhis · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: AiScreen,
});

function AiScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const brief = useMemo(() => (job ? getAiBrief(job) : null), [job]);
  const [confirmedChecks, setConfirmedChecks] = useState<Set<string>>(new Set());
  const [confirmedCause, setConfirmedCause] = useState<string | null>(null);

  if (!job || !brief) return null;

  if (job.status !== "teshis" && job.status !== "beklemede" && job.status !== "tamamlandi") {
    setStatus(job.id, "teshis");
  }

  return (
    <AppShell
      title="ToolA Saha Asistanı"
      subtitle={job.code}
      back
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/jobs/$jobId/hold", params: { jobId: job.id } })}
            className="btn-secondary"
          >
            <PauseCircle className="h-4 w-4" />
            Beklemeye al
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/jobs/$jobId/close", params: { jobId: job.id } })}
            className="btn-primary"
          >
            Kapanışa geç
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="card-surface px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-info">
            <Sparkles className="h-3.5 w-3.5" />
            AI özeti
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{brief.intro}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kaynak: İş emri #{job.code.split("-")[1]} · geçmiş kapanış notları · bakım kılavuzu
          </p>
        </section>

        <section>
          <SectionTitle>Olası kök nedenler</SectionTitle>
          <ul className="mt-2 space-y-2">
            {brief.suggestions.map((s) => {
              const isYes = confirmedCause === s.id;
              const isNo = confirmedCause === `no-${s.id}`;
              return (
                <li key={s.id} className="card-surface px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.title}</span>
                        <span className="chip bg-secondary text-muted-foreground">
                          %{Math.round(s.confidence * 100)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">↳ {s.source}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmedCause(isYes ? null : s.id)}
                      className={`btn-secondary ${isYes ? "border-success bg-success/10 text-success" : ""}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Sorun bu
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedCause(isNo ? null : `no-${s.id}`)}
                      className={`btn-secondary ${isNo ? "border-danger bg-danger/10 text-danger" : ""}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Bu değil
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <SectionTitle>Önerilen kontroller</SectionTitle>
          <ul className="mt-2 space-y-2">
            {brief.checks.map((c) => {
              const done = confirmedChecks.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(confirmedChecks);
                      if (done) next.delete(c.id);
                      else next.add(c.id);
                      setConfirmedChecks(next);
                    }}
                    className={`card-surface flex w-full items-center gap-3 px-3 py-3 text-left ${
                      done ? "border-success bg-success/5" : ""
                    }`}
                  >
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full border ${
                        done
                          ? "border-success bg-success text-success-foreground"
                          : "border-border"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.hint ? (
                        <div className="text-xs text-muted-foreground">{c.hint}</div>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <SectionTitle>Benzer vakalar</SectionTitle>
          <ul className="mt-2 card-surface divide-y divide-border">
            {job.history.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Kayıt yok.</li>
            ) : (
              job.history.map((h) => (
                <li key={h.id} className="px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.rootCause}</span>
                    <span className="text-xs text-muted-foreground">{h.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {h.summary} → {h.action}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h2>
  );
}
