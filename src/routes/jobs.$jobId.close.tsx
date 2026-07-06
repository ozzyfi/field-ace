import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { generateClosureDraft } from "@/lib/ai-mock";
import { closeJob, useJob } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/close")({
  head: () => ({
    meta: [{ title: "Hızlı Kapanış · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: QuickClose,
});

function QuickClose() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const draft = useMemo(() => (job ? generateClosureDraft(job, note) : null), [job, note]);
  const [edited, setEdited] = useState<typeof draft>(null);
  const current = edited ?? draft;

  if (!job || !draft || !current) return null;

  const canReview = note.trim().length >= 10;
  const hasEvidence = job.evidence.length > 0;

  if (!reviewing) {
    return (
      <AppShell
        title="Hızlı kapanış"
        subtitle={job.code}
        back
        footer={
          <button
            type="button"
            disabled={!canReview}
            onClick={() => {
              setEdited(draft);
              setReviewing(true);
            }}
            className="btn-primary"
          >
            <Sparkles className="h-4 w-4" />
            Kapanışı oluştur
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Ne yaptın, sonuç ne oldu?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sesli konuşur gibi yaz. ToolA bunu belirti, kök neden, müdahale ve sonuç
              olarak yapılandıracak.
            </p>
          </div>

          <textarea
            rows={6}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn: Kaplin hizası bozuktu. Hizalama yaptım. Testte ses kesildi. Parça değişmedi."
            className="w-full rounded-lg border border-input bg-surface px-3 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />

          <button type="button" className="btn-secondary">
            <Mic className="h-4 w-4" />
            Sesli not
          </button>

          {!hasEvidence ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              Kanıt olmadan iş kapatılamaz. En az bir kanıt eklemek için Kanıt ekranına dön.
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Kapanış özeti doğru mu?"
      subtitle={job.code}
      back
      footer={
        <button
          type="button"
          disabled={!hasEvidence}
          onClick={() => {
            closeJob(job.id, {
              symptom: current.symptom,
              rootCause: current.rootCause,
              action: current.action,
              partUsed: current.partUsed,
              result: current.result,
              testDone: true,
              memoryCandidate: current.memoryCandidate,
              closedAt: new Date().toISOString(),
            });
            navigate({ to: "/jobs/$jobId/summary", params: { jobId: job.id } });
          }}
          className="btn-primary"
        >
          Onayla ve gönder
        </button>
      }
    >
      <p className="text-sm text-muted-foreground">
        ToolA notunu yapılandırdı. Gerektiğinde alanları düzenle.
      </p>

      <div className="mt-4 space-y-3">
        <Field
          label="Belirti"
          value={current.symptom}
          onChange={(v) => setEdited({ ...current, symptom: v })}
        />
        <Field
          label="Kök neden"
          value={current.rootCause}
          onChange={(v) => setEdited({ ...current, rootCause: v })}
        />
        <Field
          label="Müdahale"
          value={current.action}
          onChange={(v) => setEdited({ ...current, action: v })}
          multiline
        />
        <Field
          label="Kullanılan parça"
          value={current.partUsed ?? ""}
          onChange={(v) => setEdited({ ...current, partUsed: v || undefined })}
          placeholder="Yoksa boş bırak"
        />
        <Field
          label="Sonuç"
          value={current.result}
          onChange={(v) => setEdited({ ...current, result: v })}
        />

        <div className="card-surface px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kanıtlar
          </div>
          {job.evidence.length === 0 ? (
            <p className="mt-1 text-sm text-danger">Kanıt yok — eklemeden kapatılamaz.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {job.evidence.map((ev) => (
                <li key={ev.id}>
                  · {ev.label}
                  {ev.value ? `: ${ev.value}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-info/30 bg-info/10 px-3 py-3 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-info">
            Hafızaya aday not
          </div>
          <p className="mt-1 text-foreground">{current.memoryCandidate}</p>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="card-surface px-3 py-2.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="mt-1 w-full resize-none bg-transparent text-sm outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full bg-transparent text-sm outline-none"
        />
      )}
    </div>
  );
}
