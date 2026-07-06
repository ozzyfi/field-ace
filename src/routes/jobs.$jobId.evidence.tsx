import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  FileText,
  Gauge,
  Mic,
  Package,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addEvidence, removeEvidence, useJob } from "@/lib/store";
import { evidenceTypeLabel, type EvidenceType } from "@/lib/mock-data";

export const Route = createFileRoute("/jobs/$jobId/evidence")({
  head: () => ({
    meta: [{ title: "Kanıt · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: EvidenceScreen,
});

const QUICK: { type: EvidenceType; icon: React.ReactNode }[] = [
  { type: "foto", icon: <Camera className="h-5 w-5" /> },
  { type: "video", icon: <Video className="h-5 w-5" /> },
  { type: "ses", icon: <Mic className="h-5 w-5" /> },
  { type: "olcum", icon: <Gauge className="h-5 w-5" /> },
  { type: "hata_kodu", icon: <Zap className="h-5 w-5" /> },
  { type: "parca_foto", icon: <Package className="h-5 w-5" /> },
];

function EvidenceScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [measurement, setMeasurement] = useState("");

  if (!job) return null;
  const count = job.evidence.length;

  return (
    <AppShell
      title="Kanıt topla"
      subtitle={job.code}
      back
      footer={
        <button
          type="button"
          disabled={count === 0}
          onClick={() =>
            navigate({ to: "/jobs/$jobId/flow", params: { jobId: job.id } })
          }
          className="btn-primary"
        >
          Devam et ({count} kanıt)
        </button>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          En az bir kanıt topla. Fotoğraf, ölçüm ya da kısa bir not yeterli.
        </p>

        <section>
          <SectionTitle>Hızlı ekle</SectionTitle>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <button
                key={q.type}
                type="button"
                onClick={() =>
                  addEvidence(job.id, {
                    type: q.type,
                    label: evidenceTypeLabel[q.type],
                    note: `Örnek ${evidenceTypeLabel[q.type].toLowerCase()} yakalandı`,
                  })
                }
                className="card-surface flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium active:scale-[0.98]"
              >
                <span className="text-accent-foreground">{q.icon}</span>
                {evidenceTypeLabel[q.type]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Ölçüm</SectionTitle>
          <div className="mt-2 flex gap-2">
            <input
              value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              placeholder="Örn: Yatak sıcaklığı 72°C"
              className="flex-1 rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <button
              type="button"
              disabled={!measurement.trim()}
              onClick={() => {
                addEvidence(job.id, {
                  type: "olcum",
                  label: "Ölçüm",
                  value: measurement.trim(),
                });
                setMeasurement("");
              }}
              className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Ekle
            </button>
          </div>
        </section>

        <section>
          <SectionTitle>Yazılı gözlem</SectionTitle>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kısa gözlemini yaz…"
            className="mt-2 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => {
              addEvidence(job.id, {
                type: "not",
                label: "Gözlem",
                value: note.trim(),
              });
              setNote("");
            }}
            className="btn-secondary mt-2"
          >
            <FileText className="h-4 w-4" />
            Notu ekle
          </button>
        </section>

        {count > 0 ? (
          <section>
            <SectionTitle>Toplanan kanıtlar</SectionTitle>
            <ul className="mt-2 space-y-2">
              {job.evidence.map((ev) => (
                <li
                  key={ev.id}
                  className="card-surface flex items-start gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-secondary text-muted-foreground">
                        {ev.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {ev.value ? (
                      <p className="mt-1 text-foreground">{ev.value}</p>
                    ) : ev.note ? (
                      <p className="mt-1 text-muted-foreground">{ev.note}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvidence(job.id, ev.id)}
                    className="btn-ghost p-1"
                    aria-label="Kaldır"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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
