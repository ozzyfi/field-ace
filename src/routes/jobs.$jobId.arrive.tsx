import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, QrCode } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useJob, setStatus } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/arrive")({
  head: () => ({ meta: [{ title: "Sahaya Varış · ToolA" }, { name: "robots", content: "noindex" }] }),
  component: Arrive,
});

function Arrive() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [initial, setInitial] = useState("");

  if (!job) return null;

  const canProceed = confirmed;

  return (
    <AppShell
      title="Sahaya varış"
      subtitle={job.code}
      back
      footer={
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => {
            setStatus(job.id, "sahadayim");
            navigate({ to: "/jobs/$jobId/evidence", params: { jobId: job.id } });
          }}
          className="btn-primary"
        >
          İlk kanıtı topla
        </button>
      }
    >
      <div className="space-y-5">
        <section>
          <SectionTitle>Ekipmanı doğrula</SectionTitle>
          <p className="text-xs text-muted-foreground">
            Sahaya vardığında doğru ekipmanda olduğunu onayla.
          </p>
          <div className="card-surface mt-2 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Beklenen
            </div>
            <div className="mt-0.5 font-semibold">{job.equipment}</div>
            <div className="text-sm text-muted-foreground">{job.location}</div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className={`btn-secondary ${confirmed ? "border-success bg-success/10 text-success" : ""}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirmed ? "Doğrulandı" : "Eşleşiyor"}
              </button>
              <button type="button" className="btn-secondary">
                <QrCode className="h-4 w-4" />
                QR ile oku
              </button>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>İlk gözlem (opsiyonel)</SectionTitle>
          <p className="text-xs text-muted-foreground">
            İlk durumu kısaca yaz. Örn: “Motor çalışıyor, metalik ses var.”
          </p>
          <textarea
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            rows={3}
            placeholder="İlk gözlem…"
            className="mt-2 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </section>

        {!canProceed ? (
          <p className="text-center text-xs text-muted-foreground">
            Devam etmek için ekipmanı doğrula.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h2>
  );
}
