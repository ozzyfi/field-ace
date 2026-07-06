import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  FileText,
  Gauge,
  HelpCircle,
  MapPin,
  Mic,
  Package,
  QrCode,
  Video,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { addEvidence, removeEvidence, setStatus, useJob } from "@/lib/store";
import { evidenceTypeLabel, taskTypeLabel, type EvidenceType } from "@/lib/mock-data";

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

type VerifyMode = "qr" | "manuel" | "belirsiz" | null;

function EvidenceScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [verify, setVerify] = useState<VerifyMode>(null);
  const [showEvidenceHint, setShowEvidenceHint] = useState(false);

  if (!job) return null;
  const count = job.evidence.length;
  const canContinue = count > 0;

  const onContinue = () => {
    if (!canContinue) {
      setShowEvidenceHint(true);
      return;
    }
    if (job.status === "atandi" || job.status === "yoldayim") {
      setStatus(job.id, "sahadayim");
    }
    navigate({ to: "/jobs/$jobId/flow", params: { jobId: job.id } });
  };

  return (
    <AppShell
      title="Kanıt topla"
      subtitle={job.code}
      back
      footer={
        <button
          type="button"
          onClick={onContinue}
          className="btn-primary"
          aria-disabled={!canContinue}
        >
          Devam et {count > 0 ? `(${count} kanıt)` : ""}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Job header */}
        <section className="card-surface px-3 py-3">
          <div className="flex items-center gap-1.5">
            <span className="chip bg-secondary text-muted-foreground">
              {taskTypeLabel[job.taskType]}
            </span>
            <span className="text-xs text-muted-foreground">{job.code}</span>
          </div>
          <h1 className="mt-1 text-base font-semibold leading-snug">{job.title}</h1>
          <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> {job.equipment}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {job.location}
            </div>
          </div>
        </section>

        {/* Equipment verification */}
        <section>
          <SectionTitle>Ekipman doğrulandı mı?</SectionTitle>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <VerifyBtn
              active={verify === "qr"}
              onClick={() => setVerify("qr")}
              icon={<QrCode className="h-4 w-4" />}
              label="QR / barkod"
            />
            <VerifyBtn
              active={verify === "manuel"}
              onClick={() => setVerify("manuel")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Manuel"
            />
            <VerifyBtn
              active={verify === "belirsiz"}
              onClick={() => setVerify("belirsiz")}
              icon={<HelpCircle className="h-4 w-4" />}
              label="Emin değilim"
            />
          </div>
          {verify === "belirsiz" ? (
            <p className="mt-2 text-xs text-warning-foreground">
              Fotoğraf veya ekipman etiketi ekle; merkez ekip doğrulaması yardımcı olabilir.
            </p>
          ) : null}
        </section>

        <p className="text-sm text-muted-foreground">
          En az bir kanıt toplaman gerekiyor: fotoğraf, ölçüm veya kısa not.
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

        {showEvidenceHint && !canContinue ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            Devam etmek için en az bir kanıt (fotoğraf, ölçüm veya yazılı gözlem) ekle.
          </div>
        ) : null}

        {job.bringItems.length > 0 ? (
          <section>
            <SectionTitle>Yanına aldığın</SectionTitle>
            <ul className="mt-2 card-surface divide-y divide-border">
              {job.bringItems.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  <Wrench className="h-3 w-3 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function VerifyBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-surface flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium ${
        active ? "border-accent bg-accent/15 text-accent-foreground" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h2>
  );
}
